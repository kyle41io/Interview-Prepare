variable "project" {
  type    = string
  default = "interview-prep"
}

variable "region" {
  type    = string
  default = "us-east-1"
}

variable "github_repo" {
  description = "owner/repo allowed to assume the OIDC deploy role"
  type        = string
}

variable "allowed_origin" {
  description = "CloudFront origin allowed by API Gateway CORS; set after first apply"
  type        = string
  default     = "*"
}

variable "extra_allowed_origins" {
  description = <<-EOT
    Additional browser origins allowed by API Gateway CORS, on top of
    var.allowed_origin. Empty by default: CloudFront is the only frontend since
    GitHub Pages was retired. Add an entry here rather than widening the
    allow-list in apigateway.tf.
  EOT
  type        = list(string)
  default     = []
}

variable "admin_uids" {
  description = <<-EOT
    Comma-separated Supabase user IDs allowed to call /v1/billing/admin/*.
    AdminGuard splits this and checks the caller's token subject against it, so
    an empty value means every admin request is rejected with 403. Not a secret:
    the same list ships in assets/js/config.js for UI gating, and holding a UID
    grants nothing without a validly signed token for that subject.
  EOT
  type        = string
  default     = "2c2cc2cf-9ced-4642-bdda-dcf7182b3f3a"
}

variable "demo_emails" {
  description = <<-EOT
    Comma-separated emails of the seeded demo accounts. ChatService splits this
    and applies the demo chat caps (5/session, 30/day) to matching callers, so
    an empty value means the demo accounts get ordinary free-tier limits. Not a
    secret: the same credentials are published on the sign-in screen.
  EOT
  type        = string
  default     = "demo@example.com,demo.pro@example.com"
}

variable "supabase_url" {
  description = <<-EOT
    Supabase project URL (public - it ships in assets/js/config.js). Used to
    build the JWKS URL the API verifies access tokens against: Supabase signs
    them with ES256 and publishes the public key, so the legacy HS256 shared
    secret alone cannot verify them.
  EOT
  type        = string
  default     = "https://tbihofgqjrwfgjtfjyrg.supabase.co"
}

variable "table_names" {
  type = map(string)
  default = {
    progress = "ip_progress"
    billing  = "ip_billing"
    chat     = "ip_chat"
    inbox    = "ip_inbox"
  }
}
