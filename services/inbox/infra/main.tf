# ============================================================================
# DATABASE-PER-SERVICE VIOLATION — PRESERVED DELIBERATELY IN P1, REMOVED IN P4
#
# inbox reads chat's table because inbox's classify path reuses chat's
# ProviderService and its usage/quota rows. This was never a domain
# dependency: ProviderService is the LLM client, i.e. infrastructure. P4
# extracts it to packages/ai as @ip/ai and gives inbox its own usage rows,
# after which these two data blocks and the module arguments referencing them
# are deleted.
# ============================================================================
data "aws_ssm_parameter" "chat_table_arn" {
  name = "${var.ssm_prefix}/config/table/chat/arn"
}

data "aws_ssm_parameter" "chat_table_name" {
  name = "${var.ssm_prefix}/config/table/chat/name"
}

# --- Entrypoint 1: the HTTP API. Owns the table. ---
#
# The governing rule: a service may have many entrypoints — HTTP, cron,
# event — but exactly one datastore.
module "http" {
  source = "../../../infra/modules/lambda-service"

  name       = "inbox"
  timeout    = 15
  bundle_dir = "${path.module}/../dist-lambda/inbox"

  create_table  = true
  table_name    = "ip_ms_inbox"
  table_env_key = "DDB_INBOX_TABLE"

  # Gmail "seen"-message dedupe rows written by scan.service.ts carry an
  # epoch-seconds `ttl`.
  table_ttl = true

  # gmail-account.service.ts listActiveAccounts Scans the inbox table, and the
  # HTTP function can reach it: POST /v1/gmail/scan (gmail.controller.ts:22,
  # behind CronGuard) calls ScanService.scanAll.
  allow_scan = true

  foreign_table_arns = [nonsensitive(data.aws_ssm_parameter.chat_table_arn.value)]
  extra_env = {
    DDB_CHAT_TABLE = nonsensitive(data.aws_ssm_parameter.chat_table_name.value)
  }

  route_paths = ["/v1/notifications", "/v1/gmail", "/v1/reminders"]
}

# --- Entrypoint 2: the cron worker. Same table, separate role. ---
#
# The two roles stay separate because their DynamoDB resource lists differ and
# will keep diverging: the HTTP role is granted the table this stack creates
# plus chat's, while the scan role reaches both as foreign tables and holds no
# create-time relationship to either. Separate roles also mean tightening one
# entrypoint later does not silently widen the other. Both do need
# dynamodb:Scan — see the note on module.http.
#
# create_table is false because the table above is the one and only datastore
# for this service.
module "scan" {
  source = "../../../infra/modules/lambda-service"

  name       = "gmail-scan"
  timeout    = 120 # scan loop over accounts
  bundle_dir = "${path.module}/../dist-lambda/gmail-scan"

  create_table = false
  allow_scan   = true

  foreign_table_arns = [
    module.http.table_arn,
    nonsensitive(data.aws_ssm_parameter.chat_table_arn.value),
  ]
  extra_env = {
    DDB_INBOX_TABLE = module.http.table_name
    DDB_CHAT_TABLE  = nonsensitive(data.aws_ssm_parameter.chat_table_name.value)
  }

  # Not API-facing: no route_paths and no extra_route_keys, so the module
  # creates no integration and no invoke permission.
}
