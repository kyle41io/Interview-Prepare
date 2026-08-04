# ============================================================================
# DATABASE-PER-SERVICE VIOLATION — PRESERVED DELIBERATELY IN P1, REMOVED IN P5
#
# chat reads billing's table directly, for entitlement. P1 does not fix it:
# fixing data ownership *and* restructuring at once means that when `plan`
# shows a diff you cannot tell whether it is a restructure bug or an intended
# permission change. What P1 does is make the violation impossible to miss —
# it is now two cross-stack SSM reads and an explicit foreign_table_arns
# argument, instead of one entry in a for_each map.
#
# P5 replaces this with an event-sourced entitlement read model in chat's own
# table. Deleting these two data blocks and the two module arguments below is
# the provable moment this violation dies.
# ============================================================================
data "aws_ssm_parameter" "billing_table_arn" {
  name = "${var.ssm_prefix}/config/table/billing/arn"
}

data "aws_ssm_parameter" "billing_table_name" {
  name = "${var.ssm_prefix}/config/table/billing/name"
}

module "service" {
  source = "../../../infra/modules/lambda-service"

  name       = "chat"
  timeout    = 30 # LLM calls
  bundle_dir = "${path.module}/../dist-lambda/chat"

  create_table  = true
  table_name    = "ip_ms_chat"
  table_env_key = "DDB_CHAT_TABLE"

  # Quota rows written by quota.service.ts carry an epoch-seconds `ttl`.
  table_ttl = true

  # --- the violation, in argument form ---
  foreign_table_arns = [nonsensitive(data.aws_ssm_parameter.billing_table_arn.value)]
  # billing is the only table with a GSI; scope the index ARN to it alone so
  # this role gets no index-wildcard grant it has no use for.
  foreign_table_index_arns = ["${nonsensitive(data.aws_ssm_parameter.billing_table_arn.value)}/index/*"]
  extra_env = {
    DDB_BILLING_TABLE = nonsensitive(data.aws_ssm_parameter.billing_table_name.value)
  }
  # --- end violation ---

  route_paths = ["/v1/chat"]
}
