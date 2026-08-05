output "function_name" {
  value = module.service.function_name
}

output "content_bucket" {
  value = aws_s3_bucket.content.bucket
}
