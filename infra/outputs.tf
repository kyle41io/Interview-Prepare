output "api_base_url" {
  description = "Invoke URL for the HTTP API"
  value       = aws_apigatewayv2_stage.default.invoke_url
}

output "cloudfront_url" {
  description = "Public URL of the frontend"
  value       = "https://${aws_cloudfront_distribution.frontend.domain_name}"
}

output "frontend_bucket" {
  value = aws_s3_bucket.frontend.id
}

output "cloudfront_distribution_id" {
  value = aws_cloudfront_distribution.frontend.id
}

# Name is generated from bucket_prefix, so the content push has no way to guess
# it. Exported so `terraform output -raw content_bucket` feeds CONTENT_BUCKET
# for `npm run content:push` instead of digging through terraform state show.
output "content_bucket" {
  description = "Private bucket holding the learning-content bundle and sources"
  value       = aws_s3_bucket.content.id
}
