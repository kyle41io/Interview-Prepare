# Note what is absent: no local.routes, no integrations, no per-function
# permissions. Route ownership moved to the services, which is what makes
# their deploys independent.
resource "aws_apigatewayv2_api" "http" {
  name          = "${var.name_prefix}-api"
  protocol_type = "HTTP"

  # CORS is answered by API Gateway itself. OPTIONS is deliberately left
  # unrouted by every service stack so this configuration is what responds to
  # preflight; an OPTIONS or ANY route would shadow it and turn every
  # authenticated call into an opaque network error.
  #
  # The allowed origin is DERIVED from this stack's own distribution rather
  # than passed in as a variable, which removes the vars.CLOUDFRONT_ORIGIN repo
  # variable the old workflow had to keep in sync.
  cors_configuration {
    allow_origins = distinct(concat(
      ["https://${aws_cloudfront_distribution.frontend.domain_name}"],
      var.extra_allowed_origins,
    ))
    allow_methods = ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
    allow_headers = ["authorization", "content-type"]
    max_age       = 300
  }
}

resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.http.id
  name        = "$default"
  auto_deploy = true
}
