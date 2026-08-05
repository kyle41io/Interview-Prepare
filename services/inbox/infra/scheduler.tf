data "aws_iam_policy_document" "scheduler_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["scheduler.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "scheduler" {
  name               = "${var.name_prefix}-scheduler-role"
  assume_role_policy = data.aws_iam_policy_document.scheduler_assume.json
}

resource "aws_iam_role_policy" "scheduler_invoke" {
  name = "${var.name_prefix}-scheduler-invoke"
  role = aws_iam_role.scheduler.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["lambda:InvokeFunction"]
      Resource = module.scan.function_arn
    }]
  })
}

resource "aws_scheduler_schedule" "gmail_scan" {
  name = "${var.name_prefix}-gmail-scan"
  flexible_time_window {
    mode = "OFF"
  }
  schedule_expression = "rate(15 minutes)"
  target {
    arn      = module.scan.function_arn
    role_arn = aws_iam_role.scheduler.arn
  }
}
