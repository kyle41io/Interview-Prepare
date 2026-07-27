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
      [for t in each.value : "${aws_dynamodb_table.tables[t].arn}/index/*"],
    )
  }

  statement {
    sid       = "SsmRead"
    effect    = "Allow"
    actions   = ["ssm:GetParameter", "ssm:GetParameters"]
    resources = ["${local.ssm_arn_prefix}/*"]
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
      test     = "StringLike"
      variable = "token.actions.githubusercontent.com:sub"
      values   = ["repo:${var.github_repo}:*"]
    }
  }
}

resource "aws_iam_role" "github_oidc" {
  name               = "${var.project}-github-deploy"
  assume_role_policy = data.aws_iam_policy_document.github_assume.json
}

# The deploy role manages the whole stack. Scoped to this project's resources
# where AWS allows resource-level permissions; broad service actions are
# accepted here as a solo-maintainer deploy role (documented tradeoff).
resource "aws_iam_role_policy_attachment" "github_admin" {
  role       = aws_iam_role.github_oidc.name
  policy_arn = "arn:aws:iam::aws:policy/PowerUserAccess"
}

resource "aws_iam_role_policy" "github_iam" {
  name = "${var.project}-github-iam"
  role = aws_iam_role.github_oidc.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["iam:*"]
      Resource = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/${var.project}-*"
    }]
  })
}
