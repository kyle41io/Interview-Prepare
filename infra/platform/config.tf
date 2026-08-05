# Non-secret shared config. Service stacks read these instead of using
# terraform_remote_state: looser coupling, and no cross-stack state read
# permission is required.
locals {
  config = {
    "api-id"            = aws_apigatewayv2_api.http.id
    "api-execution-arn" = aws_apigatewayv2_api.http.execution_arn
    "supabase-url"      = var.supabase_url
    "admin-uids"        = var.admin_uids
    "demo-emails"       = var.demo_emails
    "frontend-bucket"   = aws_s3_bucket.frontend.bucket

    "cloudfront-distribution-id" = aws_cloudfront_distribution.frontend.id
    # Published because the content service's bucket CORS rule needs it; in
    # the old single-root layout this was a direct resource reference.
    "cloudfront-domain" = aws_cloudfront_distribution.frontend.domain_name
  }
}

resource "aws_ssm_parameter" "config" {
  for_each = local.config

  name  = "${var.ssm_prefix}/config/${each.key}"
  type  = "String"
  value = each.value
}
