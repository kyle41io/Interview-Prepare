output "api_base_url" {
  value = aws_apigatewayv2_api.http.api_endpoint
}

output "cloudfront_url" {
  value = "https://${aws_cloudfront_distribution.frontend.domain_name}"
}

output "frontend_bucket" {
  value = aws_s3_bucket.frontend.bucket
}

output "cloudfront_distribution_id" {
  value = aws_cloudfront_distribution.frontend.id
}

# Printed so the value for vars.AWS_DEPLOY_ROLE_ARN can be read straight out of
# the apply log. That repo variable has to be repointed at this role before the
# legacy stack (which owns the old one) is destroyed.
output "deploy_role_arn" {
  value = aws_iam_role.github_oidc.arn
}
