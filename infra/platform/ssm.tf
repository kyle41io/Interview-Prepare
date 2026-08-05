locals {
  secret_params = [
    "openai-api-key",
    "anthropic-api-key",
    "supabase-jwt-secret",
    "gmail-oauth-client-id",
    "gmail-oauth-client-secret",
    "cron-secret",
  ]
}

# Structure only. Values are set out of band (copied from the live environment
# with the CLI, so no value ever reaches git, a log, or Terraform state) and
# ignore_changes keeps Terraform from blanking a hand-set secret on the next
# apply.
resource "aws_ssm_parameter" "secrets" {
  for_each = toset(local.secret_params)

  name  = "${var.ssm_prefix}/${each.value}"
  type  = "SecureString"
  value = "PLACEHOLDER_set_via_cli"

  lifecycle {
    ignore_changes = [value]
  }
}
