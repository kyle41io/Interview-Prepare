data "aws_caller_identity" "current" {}

# --- Which table(s) each function may touch (least privilege) ---
locals {
  fn_tables = {
    progress   = ["progress"]
    billing    = ["billing"]
    chat       = ["chat", "billing"]
    inbox      = ["inbox", "chat"] # inbox classify reuses chat provider/usage
    content    = []                # content keeps its data in S3, not DynamoDB
    gmail-scan = ["inbox", "chat"]
  }
  # Only these functions Scan the inbox table (gmail-account.service.ts
  # listActiveAccounts); the rest stay Scan-free per least privilege.
  scan_fns       = ["inbox", "gmail-scan"]
  ssm_arn_prefix = "arn:aws:ssm:${var.region}:${data.aws_caller_identity.current.account_id}:parameter${local.ssm_prefix}"
}

# All secret params are SecureString (see ssm.tf), encrypted under the
# account's default AWS-managed SSM key. Grant kms:Decrypt on that key
# explicitly rather than relying on the key's own default policy.
data "aws_kms_alias" "ssm" {
  name = "alias/aws/ssm"
}

data "aws_iam_policy_document" "lambda_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "lambda" {
  for_each           = local.fn_tables
  name               = "${var.project}-${each.key}-role"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume.json
}

# Basic execution (CloudWatch Logs) for every function.
resource "aws_iam_role_policy_attachment" "lambda_logs" {
  for_each   = local.fn_tables
  role       = aws_iam_role.lambda[each.key].name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# Scoped DynamoDB + SSM read per function.
data "aws_iam_policy_document" "lambda_scoped" {
  for_each = local.fn_tables

  # content keeps its data in S3 and gets no table grant at all. An empty
  # resources list is an invalid statement, so skip the whole block for it.
  dynamic "statement" {
    for_each = length(each.value) > 0 ? [1] : []
    content {
      sid    = "Ddb"
      effect = "Allow"
      actions = concat(
        [
          "dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:UpdateItem",
          "dynamodb:DeleteItem", "dynamodb:Query", "dynamodb:BatchGetItem",
          "dynamodb:BatchWriteItem",
        ],
        contains(local.scan_fns, each.key) ? ["dynamodb:Scan"] : [],
      )
      resources = concat(
        [for t in each.value : aws_dynamodb_table.tables[t].arn],
        # Only the "billing" table has a GSI (status-index); scope the
        # /index/* resource ARN to it alone so other roles don't get an
        # index-wildcard grant they have no use for.
        [for t in each.value : "${aws_dynamodb_table.tables[t].arn}/index/*" if t == "billing"],
      )
    }
  }

  statement {
    sid       = "SsmRead"
    effect    = "Allow"
    actions   = ["ssm:GetParameter", "ssm:GetParameters"]
    resources = ["${local.ssm_arn_prefix}/*"]
  }

  statement {
    sid       = "SsmKmsDecrypt"
    effect    = "Allow"
    actions   = ["kms:Decrypt"]
    resources = [data.aws_kms_alias.ssm.target_key_arn]
  }
}

resource "aws_iam_role_policy" "lambda_scoped" {
  for_each = local.fn_tables
  name     = "${var.project}-${each.key}-scoped"
  role     = aws_iam_role.lambda[each.key].id
  policy   = data.aws_iam_policy_document.lambda_scoped[each.key].json
}

# Read-only: this is a public-facing path that physically cannot mutate
# content. Writes only ever exist on the seeder user below.
#
# ListBucket is deliberately included alongside GetObject even though the
# content function only ever reads objects, not the bucket listing. Without
# it, S3 returns 403 AccessDenied instead of 404 NotFound for a missing key,
# so the service's empty-bundle branch never fires and the dashboard would
# 500 during the window between deploying this infra and seeding the
# bucket. PutObject/DeleteObject stay off this role.
data "aws_iam_policy_document" "content_read" {
  statement {
    sid       = "ContentGetObject"
    effect    = "Allow"
    actions   = ["s3:GetObject"]
    resources = ["${aws_s3_bucket.content.arn}/*"]
  }

  statement {
    sid       = "ContentListBucket"
    effect    = "Allow"
    actions   = ["s3:ListBucket"]
    resources = [aws_s3_bucket.content.arn]
  }
}

resource "aws_iam_role_policy" "content_read" {
  name   = "${var.project}-content-read"
  role   = aws_iam_role.lambda["content"].id
  policy = data.aws_iam_policy_document.content_read.json
}

# Content pushes run locally; there's no CI job to federate, so no OIDC path
# is available and a long-lived key is unavoidable here. Blast radius is one
# bucket. ListBucket/ListBucketVersions is what `aws s3 sync` needs to diff
# local vs. remote before uploading; the authoring sources it syncs from are
# git-ignored (see content/.gitignore from Task 1).
resource "aws_iam_user" "content_seeder" {
  name = "${var.project}-content-seeder"
}

data "aws_iam_policy_document" "content_seeder" {
  statement {
    sid       = "ContentWrite"
    effect    = "Allow"
    actions   = ["s3:PutObject", "s3:GetObject", "s3:GetObjectVersion"]
    resources = ["${aws_s3_bucket.content.arn}/*"]
  }

  statement {
    sid       = "ContentList"
    effect    = "Allow"
    actions   = ["s3:ListBucket", "s3:ListBucketVersions"]
    resources = [aws_s3_bucket.content.arn]
  }
}

resource "aws_iam_user_policy" "content_seeder" {
  name   = "${var.project}-content-seeder"
  user   = aws_iam_user.content_seeder.name
  policy = data.aws_iam_policy_document.content_seeder.json
}

# --- GitHub OIDC deploy role ---
# The provider ARN is derived rather than looked up with the
# aws_iam_openid_connect_provider data source on purpose: that data source
# resolves by URL via iam:ListOpenIDConnectProviders, an account-level list
# call on "oidc-provider/*" that the deploy role would then need just to read
# back its own trust policy. The ARN form is deterministic (account ID + host),
# so constructing it keeps the role from needing any IAM read permission at all.
locals {
  github_oidc_provider_arn = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:oidc-provider/token.actions.githubusercontent.com"
}

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
    # The deploy job declares `environment: production`, and when a job
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
  name               = "${var.project}-github-deploy"
  assume_role_policy = data.aws_iam_policy_document.github_assume.json
}

# The deploy role manages the whole stack. Every statement below is scoped
# to this project's resources (name-prefixed with var.project / "ip_"
# table names) wherever AWS supports resource-level permissions. A small
# number of actions have no resource-level ARN support at all (CloudFront)
# or specifically require "*" for create-time calls before the resource
# exists (e.g. apigatewayv2:CreateApi) - those are documented per statement
# and are the only "*" resources here; DynamoDB and KMS are never
# unqualified.
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
    resources = ["arn:aws:lambda:*:${data.aws_caller_identity.current.account_id}:function:${var.project}-*"]
  }

  # Read/describe surface, per service, scoped to this project's resources.
  # These are deliberately broadened per service rather than curated action by
  # action: the provider's Read path calls more APIs than a hand-written list
  # covers (it needed lambda:GetFunctionCodeSigningConfig, which no obvious
  # list would have included), and each omission costs a failed deploy to
  # discover. Mutating actions stay explicitly enumerated in the statements
  # above and below; only reads are broadened, and never beyond this project's
  # own resources.
  statement {
    sid    = "ProjectScopedReads"
    effect = "Allow"
    actions = [
      "lambda:Get*", "lambda:List*",
      "dynamodb:Describe*", "dynamodb:List*",
      "iam:Get*", "iam:List*",
    ]
    resources = [
      "arn:aws:lambda:*:${data.aws_caller_identity.current.account_id}:function:${var.project}-*",
      "arn:aws:dynamodb:*:${data.aws_caller_identity.current.account_id}:table/ip_*",
      "arn:aws:dynamodb:*:${data.aws_caller_identity.current.account_id}:table/ip_*/index/*",
      "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/${var.project}-*",
      "arn:aws:iam::${data.aws_caller_identity.current.account_id}:policy/${var.project}-*",
    ]
  }

  statement {
    sid    = "ApiGatewayCreateTime"
    effect = "Allow"
    # API Gateway v2 (HTTP API) IAM does not use granular named actions -
    # access is controlled by HTTP verb on the apigateway service instead.
    # These five verbs cover create/read/update/delete/tag for apis, stages,
    # routes, integrations, and deployments (tagging goes through POST/DELETE
    # on the /tags resource, so no separate tag action is needed).
    actions = ["apigateway:GET", "apigateway:POST", "apigateway:PUT", "apigateway:PATCH", "apigateway:DELETE"]
    # HTTP API IDs are opaque and only known post-create, and the apigateway
    # ARN form doesn't cleanly resource-scope create-time calls - "*" is
    # unavoidable here, but the action list above is now a curated verb set.
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
    resources = ["arn:aws:s3:::${var.project}-*", "arn:aws:s3:::${var.project}-*/*"]
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
    # CloudFront (distributions, origin access control, invalidations)
    # does not support resource-level IAM permissions, so resources must stay
    # "*" - but the action list below is now curated to what Terraform's
    # aws_cloudfront_distribution + aws_cloudfront_origin_access_control +
    # invalidation handling actually need.
    actions = [
      # Reads broadened for the same reason as ProjectScopedReads above;
      # CloudFront has no resource-level IAM, so this statement was already "*".
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
    sid       = "Ssm"
    effect    = "Allow"
    actions   = ["ssm:*"]
    resources = ["arn:aws:ssm:*:${data.aws_caller_identity.current.account_id}:parameter${local.ssm_prefix}/*"]
  }

  statement {
    sid    = "AccountLevelListActions"
    effect = "Allow"
    # ssm:DescribeParameters and logs:DescribeLogGroups are account-level list
    # actions: AWS authorizes them against "*" no matter how narrowly the
    # policy scopes them, so they cannot be resource-restricted. The provider
    # calls both on every refresh (aws_ssm_parameter metadata and
    # aws_cloudwatch_log_group). Both return metadata only - never parameter
    # values, never log contents.
    actions   = ["ssm:DescribeParameters", "logs:DescribeLogGroups"]
    resources = ["*"]
  }

  statement {
    sid       = "Scheduler"
    effect    = "Allow"
    actions   = ["scheduler:*"]
    resources = ["arn:aws:scheduler:*:${data.aws_caller_identity.current.account_id}:schedule/*/${var.project}-*"]
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
      "arn:aws:logs:*:${data.aws_caller_identity.current.account_id}:log-group:/aws/lambda/${var.project}-*",
      "arn:aws:logs:*:${data.aws_caller_identity.current.account_id}:log-group:/aws/lambda/${var.project}-*:*",
    ]
  }

  statement {
    sid    = "IamRoleAndPolicyLifecycle"
    effect = "Allow"
    actions = [
      "iam:CreateRole", "iam:GetRole", "iam:UpdateRole", "iam:DeleteRole", "iam:TagRole", "iam:UntagRole",
      "iam:CreatePolicy", "iam:GetPolicy", "iam:GetPolicyVersion", "iam:ListPolicyVersions",
      "iam:CreatePolicyVersion", "iam:DeletePolicyVersion", "iam:DeletePolicy", "iam:TagPolicy", "iam:UntagPolicy",
      "iam:AttachRolePolicy", "iam:DetachRolePolicy", "iam:ListAttachedRolePolicies",
      "iam:PutRolePolicy", "iam:GetRolePolicy", "iam:DeleteRolePolicy", "iam:ListRolePolicies",
    ]
    resources = [
      "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/${var.project}-*",
      "arn:aws:iam::${data.aws_caller_identity.current.account_id}:policy/${var.project}-*",
    ]
  }

  statement {
    sid       = "IamPassRoleToServices"
    effect    = "Allow"
    actions   = ["iam:PassRole"]
    resources = ["arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/${var.project}-*"]
    # Lambda needs its execution role passed at function create/update time;
    # EventBridge Scheduler needs a target role passed at schedule create
    # time (aws_scheduler_schedule). Scoped to project-prefixed roles only.
    condition {
      test     = "StringEquals"
      variable = "iam:PassedToService"
      values   = ["lambda.amazonaws.com", "scheduler.amazonaws.com"]
    }
  }

  statement {
    sid = "AccountLevelReadOnly"
    # No resource-level ARN support for these read-only lookups (identity,
    # KMS key discovery for the aws_kms_alias.ssm data source above).
    effect    = "Allow"
    actions   = ["sts:GetCallerIdentity", "kms:DescribeKey", "kms:ListAliases"]
    resources = ["*"]
  }
}

resource "aws_iam_role_policy" "github_deploy" {
  name   = "${var.project}-github-deploy"
  role   = aws_iam_role.github_oidc.id
  policy = data.aws_iam_policy_document.github_deploy.json
}
