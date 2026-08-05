# billing owns ip_ms_billing and the only GSI in the system. `pro` deploys
# inside this same function (it imports BillingModule for entitlement and the
# dependency is in-process and free); it moves to content-service in P5, once
# the entitlement read model exists.
module "service" {
  source = "../../../infra/modules/lambda-service"

  name       = "billing"
  timeout    = 15
  bundle_dir = "${path.module}/../dist-lambda/billing"

  create_table  = true
  table_name    = "ip_ms_billing"
  table_env_key = "DDB_BILLING_TABLE"

  # status-index, for the admin cross-user payment-status listing
  # (billing.service.ts listPayments). Keyed on gsi1pk/gsi1sk.
  table_gsi1 = true

  route_paths = ["/v1/billing", "/v1/pro"]
}
