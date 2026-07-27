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

variable "table_names" {
  type = map(string)
  default = {
    progress = "ip_progress"
    billing  = "ip_billing"
    chat     = "ip_chat"
    inbox    = "ip_inbox"
  }
}
