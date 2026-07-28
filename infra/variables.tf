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
