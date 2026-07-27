locals {
  # route key prefix -> function key
  routes = {
    "/v1/progress"      = "progress"
    "/v1/settings"      = "progress"
    "/health"           = "progress"
    "/v1/billing"       = "billing"
    "/v1/pro"           = "billing"
    "/v1/chat"          = "chat"
    "/v1/notifications" = "inbox"
    "/v1/gmail"         = "inbox"
    "/v1/reminders"     = "inbox"
  }
}

resource "aws_apigatewayv2_api" "http" {
  name          = "${var.project}-api"
  protocol_type = "HTTP"
  cors_configuration {
    allow_origins = [var.allowed_origin]
    allow_methods = ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
    allow_headers = ["authorization", "content-type"]
    max_age       = 300
  }
}

resource "aws_apigatewayv2_integration" "fn" {
  for_each               = toset(values(local.routes))
  api_id                 = aws_apigatewayv2_api.http.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.fn[each.value].invoke_arn
  integration_method     = "POST"
  payload_format_version = "2.0"
}

# Two routes per prefix: the exact path and the greedy child proxy.
locals {
  route_keys = merge(
    { for p, fn in local.routes : "ANY ${p}" => fn },
    { for p, fn in local.routes : "ANY ${p}/{proxy+}" => fn if p != "/health" },
  )
}

resource "aws_apigatewayv2_route" "r" {
  for_each  = local.route_keys
  api_id    = aws_apigatewayv2_api.http.id
  route_key = each.key
  target    = "integrations/${aws_apigatewayv2_integration.fn[each.value].id}"
}

resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.http.id
  name        = "$default"
  auto_deploy = true
}

resource "aws_lambda_permission" "apigw" {
  for_each      = toset(values(local.routes))
  statement_id  = "AllowAPIGW-${each.value}"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.fn[each.value].function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.http.execution_arn}/*/*"
}
