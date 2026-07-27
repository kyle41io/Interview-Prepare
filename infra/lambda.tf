# Five Lambda functions (4 HTTP domains + the gmail-scan cron worker) built
# from the esbuild bundles in api/dist-lambda/<name>/index.js. Each function
# gets its own least-privilege role (iam.tf), log group, and env config.
locals {
  functions = {
    progress     = { timeout = 15 }
    billing      = { timeout = 15 }
    chat         = { timeout = 30 } # LLM calls
    inbox        = { timeout = 15 }
    "gmail-scan" = { timeout = 120 } # scan loop over accounts
  }

  bundle_dir = "${path.module}/../api/dist-lambda"

  # Physical table name(s) each function must expose. DynamoService
  # (api/src/db/dynamo.service.ts) reads a DISTINCT env key per table:
  # DDB_TABLE (progress), DDB_BILLING_TABLE, DDB_CHAT_TABLE, DDB_INBOX_TABLE.
  # inbox + gmail-scan touch the inbox table and, via ChatModule's
  # ProviderService/quota (chat classify), the chat table too. Names are
  # derived from the table resources — never hardcoded.
  fn_table_env = {
    progress = { DDB_TABLE = aws_dynamodb_table.tables["progress"].name }
    billing  = { DDB_BILLING_TABLE = aws_dynamodb_table.tables["billing"].name }
    chat     = { DDB_CHAT_TABLE = aws_dynamodb_table.tables["chat"].name }
    inbox = {
      DDB_INBOX_TABLE = aws_dynamodb_table.tables["inbox"].name
      DDB_CHAT_TABLE  = aws_dynamodb_table.tables["chat"].name
    }
    "gmail-scan" = {
      DDB_INBOX_TABLE = aws_dynamodb_table.tables["inbox"].name
      DDB_CHAT_TABLE  = aws_dynamodb_table.tables["chat"].name
    }
  }

  # Non-secret config shared by every function. Region is intentionally absent:
  # DynamoService reads AWS_REGION, which the Lambda runtime provides
  # automatically (and which cannot be set as a user env var). Secrets are NOT
  # set here — they are hydrated at runtime from SSM (api/src/lambda/secrets.ts)
  # under SSM_PREFIX.
  common_env = {
    NODE_OPTIONS = "--enable-source-maps"
    SSM_PREFIX   = local.ssm_prefix
    AI_PROVIDER  = "anthropic"
    GMAIL_MODE   = "live"
  }
}

# Zip each function's bundle directory at plan time. Requires the bundles to
# exist (run `cd api && npm run bundle` first).
data "archive_file" "fn" {
  for_each    = local.functions
  type        = "zip"
  source_dir  = "${local.bundle_dir}/${each.key}"
  output_path = "${path.module}/.build/${each.key}.zip"
}

# Pre-create the log group (14-day retention) so Lambda does not implicitly
# create an unmanaged, never-expiring one on first invocation.
resource "aws_cloudwatch_log_group" "fn" {
  for_each          = local.functions
  name              = "/aws/lambda/${var.project}-${each.key}"
  retention_in_days = 14
}

resource "aws_lambda_function" "fn" {
  for_each = local.functions

  function_name    = "${var.project}-${each.key}"
  role             = aws_iam_role.lambda[each.key].arn
  runtime          = "nodejs20.x"
  handler          = "index.handler"
  filename         = data.archive_file.fn[each.key].output_path
  source_code_hash = data.archive_file.fn[each.key].output_base64sha256
  memory_size      = 256
  timeout          = each.value.timeout

  environment {
    variables = merge(local.common_env, local.fn_table_env[each.key])
  }

  depends_on = [aws_cloudwatch_log_group.fn]
}
