variable "region" {
  type    = string
  default = "us-east-1"
}

variable "name_prefix" {
  description = "Physical-name prefix; must match the deploy role's interview-prep-* pattern."
  type        = string
  default     = "interview-prep-ms"
}

variable "cost_tag" {
  description = <<-EOT
    Value of the `project` tag on every resource. Deliberately the original
    "interview-prep", not name_prefix, so cost reporting keeps aggregating the
    old and new environments under one project during the parallel window.
  EOT
  type        = string
  default     = "interview-prep"
}

variable "ssm_prefix" {
  description = "MUST be nested under /interview-prep/ — see the deploy role's SSM statement."
  type        = string
  default     = "/interview-prep/ms"
}

variable "supabase_url" {
  type    = string
  default = "https://tbihofgqjrwfgjtfjyrg.supabase.co"
}

variable "admin_uids" {
  type    = string
  default = "2c2cc2cf-9ced-4642-bdda-dcf7182b3f3a"
}

variable "demo_emails" {
  type    = string
  default = "demo@example.com,demo.pro@example.com"
}

variable "extra_allowed_origins" {
  description = "Additional CORS origins beyond the stack's own CloudFront domain (e.g. http://localhost:8000)."
  type        = list(string)
  default     = []
}
