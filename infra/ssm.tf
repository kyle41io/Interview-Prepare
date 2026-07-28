# Parameter names only. VALUES are set out-of-band via AWS CLI (see
# DEPLOY-AWS.md) so no secret ever lands in git or Terraform state.
locals {
  ssm_prefix = "/${var.project}"

  secret_params = [
    "openai-api-key",
    "anthropic-api-key",
    "supabase-jwt-secret",
    "gmail-oauth-client-id",
    "gmail-oauth-client-secret",
    "cron-secret",
  ]
}

resource "aws_ssm_parameter" "secrets" {
  for_each = toset(local.secret_params)

  name  = "${local.ssm_prefix}/${each.value}"
  type  = "SecureString"
  value = "PLACEHOLDER_set_via_cli"

  lifecycle {
    ignore_changes = [value]
  }
}
