output "function_name" {
  value = aws_lambda_function.this.function_name
}

output "function_arn" {
  value = aws_lambda_function.this.arn
}

output "role_id" {
  description = "For attaching service-specific inline policies (e.g. content's S3 read)."
  value       = aws_iam_role.this.id
}

output "role_name" {
  value = aws_iam_role.this.name
}

output "role_arn" {
  value = aws_iam_role.this.arn
}

output "table_name" {
  value = var.create_table ? aws_dynamodb_table.this[0].name : null
}

output "table_arn" {
  value = var.create_table ? aws_dynamodb_table.this[0].arn : null
}

output "log_group_name" {
  value = aws_cloudwatch_log_group.fn.name
}
