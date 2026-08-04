# progress owns exactly one table and serves /v1/progress, /v1/settings and
# /health. No foreign_table_arns: this service has no data-ownership violation.
module "service" {
  source = "../../../infra/modules/lambda-service"

  name       = "progress"
  timeout    = 15
  bundle_dir = "${path.module}/../dist-lambda/progress"

  create_table  = true
  table_name    = "ip_ms_progress"
  table_env_key = "DDB_TABLE"

  # /health is mapped to progress by the original route table, and gets no
  # {proxy+} child.
  route_paths = ["/v1/progress", "/v1/settings", "/health"]
}
