variable "name" {
  description = "Service/function key, e.g. \"progress\". Becomes the physical name suffix."
  type        = string
}

variable "name_prefix" {
  description = <<-EOT
    Physical-name prefix. Must stay inside the deploy role's interview-prep-*
    pattern (infra/iam.tf:215-411) or every apply fails at refresh.
  EOT
  type        = string
  default     = "interview-prep-ms"
}

variable "ssm_prefix" {
  description = <<-EOT
    SSM namespace root. MUST be nested under /interview-prep/ — the deploy
    role's SSM statement is scoped to parameter/interview-prep/* and the slash
    is literal, so a top-level /interview-prep-ms/ prefix would 403.
  EOT
  type        = string
  default     = "/interview-prep/ms"
}

variable "timeout" {
  type    = number
  default = 15
}

variable "memory_size" {
  type    = number
  default = 256
}

variable "bundle_dir" {
  description = "Directory containing this function's esbuild output (index.js)."
  type        = string
}

variable "create_table" {
  description = "Whether this module instance owns a DynamoDB table."
  type        = bool
  default     = false
}

variable "table_name" {
  description = "Physical table name. Must match ip_ms_* (deploy role scopes DynamoDB to table/ip_*)."
  type        = string
  default     = null
}

variable "table_env_key" {
  description = "Env var name carrying this service's own table name, e.g. DDB_CHAT_TABLE."
  type        = string
  default     = null
}

variable "table_ttl" {
  description = "Enable the epoch-seconds `ttl` attribute (chat quota rows, inbox seen-message dedupe)."
  type        = bool
  default     = false
}

variable "table_gsi1" {
  description = "Create the status-index GSI on gsi1pk/gsi1sk (billing only)."
  type        = bool
  default     = false
}

variable "foreign_table_arns" {
  description = <<-EOT
    Table ARNs owned by ANOTHER service. Every entry here is a
    database-per-service violation preserved from P1. The list should be empty
    for every service after P5.
  EOT
  type        = list(string)
  default     = []
}

variable "foreign_table_index_arns" {
  description = "Index ARNs (\"<table-arn>/index/*\") for foreign tables that have a GSI."
  type        = list(string)
  default     = []
}

variable "allow_scan" {
  description = "Grant dynamodb:Scan. Only the inbox paths need it (gmail-account.service.ts listActiveAccounts)."
  type        = bool
  default     = false
}

variable "extra_env" {
  description = "Additional environment variables (foreign table names, bucket names)."
  type        = map(string)
  default     = {}
}

variable "route_paths" {
  description = <<-EOT
    Exact API paths this function serves, e.g. ["/v1/progress", "/health"].
    Each expands to 4 methods x (exact path + a {proxy+} child), except
    /health which gets no child. Empty means the function is not API-facing.
  EOT
  type        = list(string)
  default     = []
}

variable "extra_route_keys" {
  description = "Fully-formed route keys that do not follow the expansion, e.g. [\"GET /v1/content/bundle\"]."
  type        = list(string)
  default     = []
}
