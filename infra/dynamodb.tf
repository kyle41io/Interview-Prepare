# Single-table-per-domain design carried over from Phase F (Supabase/Postgres
# -> DynamoDB migration). On-demand billing (PAY_PER_REQUEST) so cost is $0
# when idle and there is no capacity to plan for. Point-in-time recovery is
# left off — this is a CV/portfolio project with no durability requirement.
#
# All four tables share a generic pk/sk composite key, confirmed against
# api/src/db/keys.ts (userPk/topicSk/etc.) and every domain service that talks
# to DynamoDB (api/src/progress/progress.service.ts, api/src/billing/
# billing.service.ts, api/src/chat/quota.service.ts, api/src/inbox/
# inbox.service.ts + scan.service.ts) — all of them build `Key: { pk, sk }`.
#
# DISCREPANCY FROM TASK BRIEF: the brief assumed the billing "status-index"
# GSI is keyed on a `status` (hash) / `sk` (range) attribute pair. The actual
# code does not match that — api/src/billing/billing.service.ts writes
# `gsi1pk`/`gsi1sk` attributes (gsi1pk = "PAYSTATUS#<status>", gsi1sk =
# created_at) and queries `status-index` with
# `KeyConditionExpression: "gsi1pk = :s"`, returning full item attributes
# (code, amount, plan, status, created_at, note). The GSI below is built on
# the real gsi1pk/gsi1sk attribute names with ALL projection so the index
# actually matches what the application reads/writes; see task-7-report.md
# for the file:line evidence.
locals {
  ttl_tables = ["chat", "inbox"]
}

resource "aws_dynamodb_table" "tables" {
  for_each = var.table_names

  name         = each.value
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

  # billing: admin cross-user payment-status listing
  # (api/src/billing/billing.service.ts:53-63 listPayments()).
  dynamic "attribute" {
    for_each = each.key == "billing" ? [1] : []
    content {
      name = "gsi1pk"
      type = "S"
    }
  }
  dynamic "attribute" {
    for_each = each.key == "billing" ? [1] : []
    content {
      name = "gsi1sk"
      type = "S"
    }
  }
  dynamic "global_secondary_index" {
    for_each = each.key == "billing" ? [1] : []
    content {
      name            = "status-index"
      hash_key        = "gsi1pk"
      range_key       = "gsi1sk"
      projection_type = "ALL"
    }
  }

  # chat quota rows (api/src/chat/quota.service.ts:13-21) and inbox gmail
  # "seen"-message dedupe rows (api/src/inbox/scan.service.ts:27-28) both
  # write an epoch-seconds `ttl` attribute for automatic expiry.
  dynamic "ttl" {
    for_each = contains(local.ttl_tables, each.key) ? [1] : []
    content {
      attribute_name = "ttl"
      enabled        = true
    }
  }

  point_in_time_recovery {
    enabled = false
  }
}
