# The GitHub OIDC deploy role, owned by this stack.
#
# It used to live in the legacy root stack (infra/iam.tf), which made that
# stack impossible to destroy: `terraform destroy` there would have deleted the
# very role every workflow assumes, and nothing could have recreated it from CI
# afterwards. Rather than importing the old role into this state, this stack
# creates a NEW role under the interview-prep-ms-* prefix. The old role then
# dies as an ordinary part of the legacy teardown — no state surgery, no
# resource orphaned outside Terraform, and no window where two states both
# claim the same role.
#
# Cutover order matters: this role must exist, and vars.AWS_DEPLOY_ROLE_ARN
# must point at it, BEFORE the legacy stack is destroyed.
#
# One consequence worth stating plainly: because this stack is applied by CI
# using this very role, the role can now edit its own permissions. That was
# structurally impossible while it lived in a stack no workflow applied. The
# control that remains is the `production` environment gate — widening the
# policy takes a merge to main plus a gate approval.

data "aws_caller_identity" "current" {}

locals {
  github_oidc_provider_arn = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:oidc-provider/token.actions.githubusercontent.com"

  # Deliberately the UNPREFIXED project name, not var.name_prefix. IAM scoping
  # here has to span both environments: "interview-prep-*" matches this stack's
  # own interview-prep-ms-* resources AND the legacy interview-prep-* ones the
  # teardown has to delete. Narrowing this to interview-prep-ms-* would leave
  # the deploy role unable to destroy the environment it is replacing.
  #
  # Once the legacy teardown is done, this can be tightened to name_prefix and
  # the SSM scope to var.ssm_prefix.
  project = "interview-prep"
}

# The provider ARN is derived rather than looked up with the
# aws_iam_openid_connect_provider data source on purpose: that data source
# resolves by URL via iam:ListOpenIDConnectProviders, an account-level list call
# on "oidc-provider/*" that the deploy role would then need just to read back
# its own trust policy. The ARN form is deterministic (account ID + host), so
# constructing it keeps the role from needing any IAM read permission at all.
data "aws_iam_policy_document" "github_assume" {
  statement {
    actions = ["sts:AssumeRoleWithWebIdentity"]
    principals {
      type        = "Federated"
      identifiers = [local.github_oidc_provider_arn]
    }
    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }
    # Every deploy job declares `environment: production`, and when a job
    # references an environment GitHub swaps the OIDC sub claim from
    # "…:ref:refs/heads/main" to "…:environment:production". Matching the
    # environment form (not the ref form) is also what keeps the approval gate
    # meaningful: a new workflow that omitted `environment:` would otherwise be
    # able to assume this role on main and skip the gate entirely.
    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:sub"
      values   = ["repo:${var.github_repo}:environment:production"]
    }
  }
}

resource "aws_iam_role" "github_oidc" {
  name               = "${var.name_prefix}-github-deploy"
  assume_role_policy = data.aws_iam_policy_document.github_assume.json
}

# Every statement is scoped to this project's resources (name-prefixed with
# local.project / "ip_" table names) wherever AWS supports resource-level
# permissions. A small number of actions have no resource-level ARN support at
# all (CloudFront) or specifically require "*" for create-time calls before the
# resource exists (API Gateway) — those are documented per statement and are the
# only "*" resources here; DynamoDB and KMS are never unqualified.
data "aws_iam_policy_document" "github_deploy" {
  statement {
    sid    = "Lambda"
    effect = "Allow"
    actions = [
      "lambda:CreateFunction",
      "lambda:UpdateFunctionCode", "lambda:UpdateFunctionConfiguration",
      "lambda:DeleteFunction", "lambda:TagResource", "lambda:UntagResource",
      "lambda:PublishVersion",
      "lambda:AddPermission", "lambda:RemovePermission", "lambda:InvokeFunction",
    ]
    resources = ["arn:aws:lambda:*:${data.aws_caller_identity.current.account_id}:function:${local.project}-*"]
  }

  # Read/describe surface, per service, scoped to this project's resources.
  # These are deliberately broadened per service rather than curated action by
  # action: the provider's Read path calls more APIs than a hand-written list
  # covers (it needed lambda:GetFunctionCodeSigningConfig, which no obvious list
  # would have included), and each omission costs a failed deploy to discover.
  # Mutating actions stay explicitly enumerated; only reads are broadened, and
  # never beyond this project's own resources.
  statement {
    sid    = "ProjectScopedReads"
    effect = "Allow"
    actions = [
      "lambda:Get*", "lambda:List*",
      "dynamodb:Describe*", "dynamodb:List*",
      "iam:Get*", "iam:List*",
    ]
    resources = [
      "arn:aws:lambda:*:${data.aws_caller_identity.current.account_id}:function:${local.project}-*",
      "arn:aws:dynamodb:*:${data.aws_caller_identity.current.account_id}:table/ip_*",
      "arn:aws:dynamodb:*:${data.aws_caller_identity.current.account_id}:table/ip_*/index/*",
      "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/${local.project}-*",
      "arn:aws:iam::${data.aws_caller_identity.current.account_id}:policy/${local.project}-*",
      # The legacy aws_iam_user.content_seeder. Without this the provider's Read
      # path fails on iam:GetUser and the teardown plan dies at refresh, before
      # it can reach a single deletion.
      "arn:aws:iam::${data.aws_caller_identity.current.account_id}:user/${local.project}-*",
    ]
  }

  statement {
    sid    = "ApiGateway"
    effect = "Allow"
    # API Gateway v2 (HTTP API) IAM is mostly HTTP-verb based rather than
    # granular named actions: these five verbs cover create/read/update/delete
    # for apis, stages, routes, integrations and deployments.
    #
    # Tagging is the exception. With default_tags set, the aws provider passes
    # tags to CreateStage, and AWS authorizes that call against the NAMED action
    # apigateway:TagResource. This stack's first apply failed on exactly that —
    # every other resource created, then:
    #
    #   creating API Gateway v2 Stage ($default): AccessDeniedException:
    #   not authorized to perform: apigateway:TagResource
    #
    # It was granted out of band as a separate inline policy on the old role
    # (interview-prep-github-deploy-apigw-tagging); folding it in here is what
    # retires that stopgap. UntagResource sits alongside it so a later tag
    # removal cannot fail the same way.
    actions = [
      "apigateway:GET", "apigateway:POST", "apigateway:PUT", "apigateway:PATCH", "apigateway:DELETE",
      "apigateway:TagResource", "apigateway:UntagResource",
    ]
    # HTTP API IDs are opaque and only known post-create, and the apigateway ARN
    # form does not cleanly resource-scope create-time calls — "*" is unavoidable
    # here, but the action list above is a curated verb set.
    resources = ["*"]
  }

  statement {
    sid    = "DynamoDb"
    effect = "Allow"
    actions = [
      "dynamodb:CreateTable", "dynamodb:DescribeTable", "dynamodb:UpdateTable",
      "dynamodb:DeleteTable", "dynamodb:TagResource", "dynamodb:UntagResource",
      "dynamodb:ListTagsOfResource", "dynamodb:DescribeTimeToLive",
      "dynamodb:UpdateTimeToLive", "dynamodb:DescribeContinuousBackups",
    ]
    resources = [
      "arn:aws:dynamodb:*:${data.aws_caller_identity.current.account_id}:table/ip_*",
      "arn:aws:dynamodb:*:${data.aws_caller_identity.current.account_id}:table/ip_*/index/*",
    ]
  }

  statement {
    sid       = "S3ProjectBuckets"
    effect    = "Allow"
    actions   = ["s3:*"]
    resources = ["arn:aws:s3:::${local.project}-*", "arn:aws:s3:::${local.project}-*/*"]
  }

  statement {
    sid       = "S3AccountLevel"
    effect    = "Allow"
    actions   = ["s3:ListAllMyBuckets", "s3:GetBucketLocation"]
    resources = ["*"]
  }

  statement {
    sid    = "CloudFront"
    effect = "Allow"
    # CloudFront (distributions, origin access control, invalidations) does not
    # support resource-level IAM permissions, so resources must stay "*" — but
    # the action list is curated to what aws_cloudfront_distribution,
    # aws_cloudfront_origin_access_control and invalidation handling need.
    actions = [
      "cloudfront:Get*", "cloudfront:List*",
      "cloudfront:CreateDistribution", "cloudfront:UpdateDistribution", "cloudfront:DeleteDistribution",
      "cloudfront:TagResource", "cloudfront:UntagResource",
      "cloudfront:CreateOriginAccessControl", "cloudfront:UpdateOriginAccessControl",
      "cloudfront:DeleteOriginAccessControl",
      "cloudfront:CreateInvalidation",
    ]
    resources = ["*"]
  }

  statement {
    sid     = "Ssm"
    effect  = "Allow"
    actions = ["ssm:*"]
    # "/interview-prep/*" spans both /interview-prep/ms/* (this stack) and the
    # legacy /interview-prep/<secret> parameters the teardown deletes.
    resources = ["arn:aws:ssm:*:${data.aws_caller_identity.current.account_id}:parameter/${local.project}/*"]
  }

  statement {
    sid    = "AccountLevelListActions"
    effect = "Allow"
    # ssm:DescribeParameters and logs:DescribeLogGroups are account-level list
    # actions: AWS authorizes them against "*" no matter how narrowly the policy
    # scopes them, so they cannot be resource-restricted. The provider calls both
    # on every refresh (aws_ssm_parameter metadata and aws_cloudwatch_log_group).
    # Both return metadata only — never parameter values, never log contents.
    actions   = ["ssm:DescribeParameters", "logs:DescribeLogGroups"]
    resources = ["*"]
  }

  statement {
    sid       = "Scheduler"
    effect    = "Allow"
    actions   = ["scheduler:*"]
    resources = ["arn:aws:scheduler:*:${data.aws_caller_identity.current.account_id}:schedule/*/${local.project}-*"]
  }

  statement {
    sid     = "Logs"
    effect  = "Allow"
    actions = ["logs:*"]
    # Both ARN forms are required. The ":*" suffix form matches the log STREAMS
    # inside a group, not the group itself, so on its own it silently denies
    # every group-level call the provider makes for aws_cloudwatch_log_group
    # (CreateLogGroup, PutRetentionPolicy, TagResource, ListTagsForResource...).
    resources = [
      "arn:aws:logs:*:${data.aws_caller_identity.current.account_id}:log-group:/aws/lambda/${local.project}-*",
      "arn:aws:logs:*:${data.aws_caller_identity.current.account_id}:log-group:/aws/lambda/${local.project}-*:*",
    ]
  }

  statement {
    sid    = "IamRolePolicyAndUserLifecycle"
    effect = "Allow"
    actions = [
      "iam:CreateRole", "iam:GetRole", "iam:UpdateRole", "iam:DeleteRole", "iam:TagRole", "iam:UntagRole",
      "iam:CreatePolicy", "iam:GetPolicy", "iam:GetPolicyVersion", "iam:ListPolicyVersions",
      "iam:CreatePolicyVersion", "iam:DeletePolicyVersion", "iam:DeletePolicy", "iam:TagPolicy", "iam:UntagPolicy",
      "iam:AttachRolePolicy", "iam:DetachRolePolicy", "iam:ListAttachedRolePolicies",
      "iam:PutRolePolicy", "iam:GetRolePolicy", "iam:DeleteRolePolicy", "iam:ListRolePolicies",
      # The legacy aws_iam_user.content_seeder and its inline policy.
      "iam:CreateUser", "iam:DeleteUser", "iam:TagUser", "iam:UntagUser",
      "iam:PutUserPolicy", "iam:DeleteUserPolicy",
      # DeleteUser fails with DeleteConflict while the user still has an access
      # key, and the seeder's key was minted by hand — so deleting the key is a
      # precondition for the teardown, not an optional tidy-up. CreateAccessKey
      # is deliberately still absent: these two actions remove credentials, they
      # cannot mint them, which preserves the original rule that CI must never
      # be able to issue itself a long-lived key.
      #
      # The new environment contains no IAM users at all. Once the legacy
      # teardown is complete, this pair and the four user actions above become
      # vestigial and should be dropped.
      "iam:ListAccessKeys", "iam:DeleteAccessKey",
    ]
    resources = [
      "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/${local.project}-*",
      "arn:aws:iam::${data.aws_caller_identity.current.account_id}:policy/${local.project}-*",
      "arn:aws:iam::${data.aws_caller_identity.current.account_id}:user/${local.project}-*",
    ]
  }

  statement {
    sid       = "IamPassRoleToServices"
    effect    = "Allow"
    actions   = ["iam:PassRole"]
    resources = ["arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/${local.project}-*"]
    # Lambda needs its execution role passed at function create/update time;
    # EventBridge Scheduler needs a target role passed at schedule create time
    # (aws_scheduler_schedule). Scoped to project-prefixed roles only.
    condition {
      test     = "StringEquals"
      variable = "iam:PassedToService"
      values   = ["lambda.amazonaws.com", "scheduler.amazonaws.com"]
    }
  }

  statement {
    sid = "AccountLevelReadOnly"
    # No resource-level ARN support for these read-only lookups (identity, KMS
    # key discovery for the SSM alias data source).
    effect    = "Allow"
    actions   = ["sts:GetCallerIdentity", "kms:DescribeKey", "kms:ListAliases"]
    resources = ["*"]
  }
}

resource "aws_iam_role_policy" "github_deploy" {
  name   = "${var.name_prefix}-github-deploy"
  role   = aws_iam_role.github_oidc.id
  policy = data.aws_iam_policy_document.github_deploy.json
}
