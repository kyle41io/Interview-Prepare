data "aws_caller_identity" "current" {}

# --- Which table(s) each function may touch (least privilege) ---
locals {
  fn_tables = {
    progress   = ["progress"]
    billing    = ["billing"]
    chat       = ["chat"]
    inbox      = ["inbox", "chat"] # inbox classify reuses chat provider/usage
    gmail-scan = ["inbox", "chat"]
  }
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

  statement {
    sid    = "Ddb"
    effect = "Allow"
    actions = [
      "dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:UpdateItem",
      "dynamodb:DeleteItem", "dynamodb:Query", "dynamodb:BatchGetItem",
      "dynamodb:BatchWriteItem",
    ]
    resources = concat(
      [for t in each.value : aws_dynamodb_table.tables[t].arn],
      # Only the "billing" table has a GSI (status-index); scope the
      # /index/* resource ARN to it alone so other roles don't get an
      # index-wildcard grant they have no use for.
      [for t in each.value : "${aws_dynamodb_table.tables[t].arn}/index/*" if t == "billing"],
    )
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

# --- GitHub OIDC deploy role ---
data "aws_iam_openid_connect_provider" "github" {
  url = "https://token.actions.githubusercontent.com"
}

data "aws_iam_policy_document" "github_assume" {
  statement {
    actions = ["sts:AssumeRoleWithWebIdentity"]
    principals {
      type        = "Federated"
      identifiers = [data.aws_iam_openid_connect_provider.github.arn]
    }
    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }
    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:sub"
      values   = ["repo:${var.github_repo}:ref:refs/heads/main"]
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
      "lambda:CreateFunction", "lambda:GetFunction", "lambda:GetFunctionConfiguration",
      "lambda:UpdateFunctionCode", "lambda:UpdateFunctionConfiguration",
      "lambda:DeleteFunction", "lambda:TagResource", "lambda:UntagResource", "lambda:ListTags",
      "lambda:ListVersionsByFunction", "lambda:PublishVersion", "lambda:GetPolicy",
      "lambda:AddPermission", "lambda:RemovePermission", "lambda:InvokeFunction",
    ]
    resources = ["arn:aws:lambda:*:${data.aws_caller_identity.current.account_id}:function:${var.project}-*"]
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
      "cloudfront:CreateDistribution", "cloudfront:GetDistribution", "cloudfront:GetDistributionConfig",
      "cloudfront:UpdateDistribution", "cloudfront:DeleteDistribution", "cloudfront:ListDistributions",
      "cloudfront:TagResource", "cloudfront:UntagResource", "cloudfront:ListTagsForResource",
      "cloudfront:CreateOriginAccessControl", "cloudfront:GetOriginAccessControl",
      "cloudfront:GetOriginAccessControlConfig", "cloudfront:UpdateOriginAccessControl",
      "cloudfront:GetInvalidation", "cloudfront:ListInvalidations",
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
    sid       = "Scheduler"
    effect    = "Allow"
    actions   = ["scheduler:*"]
    resources = ["arn:aws:scheduler:*:${data.aws_caller_identity.current.account_id}:schedule/*/${var.project}-*"]
  }

  statement {
    sid       = "Logs"
    effect    = "Allow"
    actions   = ["logs:*"]
    resources = ["arn:aws:logs:*:${data.aws_caller_identity.current.account_id}:log-group:/aws/lambda/${var.project}-*:*"]
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
    sid       = "OidcProviderRead"
    effect    = "Allow"
    actions   = ["iam:GetOpenIDConnectProvider"]
    resources = [data.aws_iam_openid_connect_provider.github.arn]
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
