data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

# All secret params are SecureString, encrypted under the account's default
# AWS-managed SSM key. Grant kms:Decrypt on that key explicitly rather than
# relying on the key's own default policy.
data "aws_kms_alias" "ssm" {
  name = "alias/aws/ssm"
}

# Shared config published by the platform stack. Read through SSM rather than
# terraform_remote_state: looser coupling, and no cross-stack state read
# permission is needed.
data "aws_ssm_parameter" "api_id" {
  name = "${var.ssm_prefix}/config/api-id"
}

data "aws_ssm_parameter" "api_execution_arn" {
  name = "${var.ssm_prefix}/config/api-execution-arn"
}

data "aws_ssm_parameter" "supabase_url" {
  name = "${var.ssm_prefix}/config/supabase-url"
}

data "aws_ssm_parameter" "admin_uids" {
  name = "${var.ssm_prefix}/config/admin-uids"
}

data "aws_ssm_parameter" "demo_emails" {
  name = "${var.ssm_prefix}/config/demo-emails"
}

locals {
  fn_name        = "${var.name_prefix}-${var.name}"
  ssm_arn_prefix = "arn:aws:ssm:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:parameter${var.ssm_prefix}"

  own_table_arns = var.create_table ? [aws_dynamodb_table.this[0].arn] : []
  own_index_arns = var.create_table && var.table_gsi1 ? ["${aws_dynamodb_table.this[0].arn}/index/*"] : []
  all_table_arns = concat(local.own_table_arns, local.own_index_arns, var.foreign_table_arns, var.foreign_table_index_arns)

  http_methods = ["GET", "POST", "PUT", "DELETE"]

  # Exact path + a {proxy+} child for every path except /health, reproducing
  # infra/apigateway.tf:63-73 exactly.
  #
  # OPTIONS is deliberately absent. API Gateway answers CORS preflight itself,
  # and an OPTIONS or ANY route shadows that: the preflight then returns a
  # non-2xx, which the Fetch spec makes an opaque network error, breaking every
  # authenticated call. This is load-bearing. Do not "simplify" it.
  expanded_paths = concat(
    var.route_paths,
    [for p in var.route_paths : "${p}/{proxy+}" if p != "/health"],
  )
  generated_route_keys = [
    for pair in setproduct(local.http_methods, local.expanded_paths) :
    "${pair[0]} ${pair[1]}"
  ]
  route_keys = toset(concat(local.generated_route_keys, var.extra_route_keys))
  api_facing = length(local.route_keys) > 0

  # Non-secret config shared by every function. Region is intentionally absent:
  # DynamoService reads AWS_REGION, which the Lambda runtime provides
  # automatically (and which cannot be set as a user env var). Secrets are NOT
  # set here — they are hydrated at runtime from SSM under SSM_PREFIX.
  #
  # nonsensitive() is required because aws_ssm_parameter.value is always marked
  # sensitive; without it the whole environment block becomes sensitive and
  # every plan hides what it is about to change. These three are String
  # parameters, never SecureString.
  common_env = {
    NODE_OPTIONS      = "--enable-source-maps"
    SSM_PREFIX        = var.ssm_prefix
    AI_PROVIDER       = "openai"
    GMAIL_MODE        = "live"
    SUPABASE_JWKS_URL = "${nonsensitive(data.aws_ssm_parameter.supabase_url.value)}/auth/v1/.well-known/jwks.json"
    ADMIN_UIDS        = nonsensitive(data.aws_ssm_parameter.admin_uids.value)
    DEMO_EMAILS       = nonsensitive(data.aws_ssm_parameter.demo_emails.value)
  }

  own_table_env = var.create_table ? { (var.table_env_key) = aws_dynamodb_table.this[0].name } : {}
}

# --- Data store (at most one per service; that is the rule) ---

resource "aws_dynamodb_table" "this" {
  count = var.create_table ? 1 : 0

  name         = var.table_name
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "pk"
  range_key    = "sk"

  attribute {
    name = "pk"
    type = "S"
  }
  attribute {
    name = "sk"
    type = "S"
  }

  # The status-index GSI is keyed on gsi1pk/gsi1sk, NOT on a `status`
  # attribute: billing.service.ts writes gsi1pk = "PAYSTATUS#<status>" and
  # gsi1sk = created_at, and queries with KeyConditionExpression "gsi1pk = :s".
  dynamic "attribute" {
    for_each = var.table_gsi1 ? ["gsi1pk", "gsi1sk"] : []
    content {
      name = attribute.value
      type = "S"
    }
  }

  dynamic "global_secondary_index" {
    for_each = var.table_gsi1 ? [1] : []
    content {
      name            = "status-index"
      hash_key        = "gsi1pk"
      range_key       = "gsi1sk"
      projection_type = "ALL"
    }
  }

  dynamic "ttl" {
    for_each = var.table_ttl ? [1] : []
    content {
      attribute_name = "ttl"
      enabled        = true
    }
  }

  # This is a CV/portfolio project with no durability requirement.
  point_in_time_recovery {
    enabled = false
  }
}

# Publish the table so consumers can find it without reading our state. Any
# other stack reading these is, by construction, a visible violation.
resource "aws_ssm_parameter" "table_name" {
  count = var.create_table ? 1 : 0
  name  = "${var.ssm_prefix}/config/table/${var.name}/name"
  type  = "String"
  value = aws_dynamodb_table.this[0].name
}

resource "aws_ssm_parameter" "table_arn" {
  count = var.create_table ? 1 : 0
  name  = "${var.ssm_prefix}/config/table/${var.name}/arn"
  type  = "String"
  value = aws_dynamodb_table.this[0].arn
}

# --- Execution role ---

data "aws_iam_policy_document" "assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "this" {
  name               = "${local.fn_name}-role"
  assume_role_policy = data.aws_iam_policy_document.assume.json
}

resource "aws_iam_role_policy_attachment" "logs" {
  role       = aws_iam_role.this.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

data "aws_iam_policy_document" "scoped" {
  # content keeps its data in S3 and gets no table grant at all. An empty
  # resources list is an invalid statement, so skip the whole block for it.
  dynamic "statement" {
    for_each = length(local.all_table_arns) > 0 ? [1] : []
    content {
      sid    = "Ddb"
      effect = "Allow"
      actions = concat(
        [
          "dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:UpdateItem",
          "dynamodb:DeleteItem", "dynamodb:Query", "dynamodb:BatchGetItem",
          "dynamodb:BatchWriteItem",
        ],
        var.allow_scan ? ["dynamodb:Scan"] : [],
      )
      resources = local.all_table_arns
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

resource "aws_iam_role_policy" "scoped" {
  name   = "${local.fn_name}-scoped"
  role   = aws_iam_role.this.id
  policy = data.aws_iam_policy_document.scoped.json
}

# --- Function ---

data "archive_file" "fn" {
  type        = "zip"
  source_dir  = var.bundle_dir
  output_path = "${path.root}/.build/${var.name}.zip"
}

# Pre-create the log group (14-day retention) so Lambda does not implicitly
# create an unmanaged, never-expiring one on first invocation.
resource "aws_cloudwatch_log_group" "fn" {
  name              = "/aws/lambda/${local.fn_name}"
  retention_in_days = 14
}

resource "aws_lambda_function" "this" {
  function_name    = local.fn_name
  role             = aws_iam_role.this.arn
  runtime          = "nodejs20.x"
  handler          = "index.handler"
  filename         = data.archive_file.fn.output_path
  source_code_hash = data.archive_file.fn.output_base64sha256
  memory_size      = var.memory_size
  timeout          = var.timeout

  environment {
    variables = merge(local.common_env, local.own_table_env, var.extra_env)
  }

  depends_on = [aws_cloudwatch_log_group.fn]
}

# --- API wiring (owned by the service, not the platform) ---

resource "aws_apigatewayv2_integration" "fn" {
  count = local.api_facing ? 1 : 0

  api_id                 = nonsensitive(data.aws_ssm_parameter.api_id.value)
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.this.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "r" {
  for_each = local.route_keys

  api_id    = nonsensitive(data.aws_ssm_parameter.api_id.value)
  route_key = each.value
  target    = "integrations/${aws_apigatewayv2_integration.fn[0].id}"
}

resource "aws_lambda_permission" "apigw" {
  count = local.api_facing ? 1 : 0

  statement_id  = "AllowAPIGW-${var.name}"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.this.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${nonsensitive(data.aws_ssm_parameter.api_execution_arn.value)}/*/*"
}
