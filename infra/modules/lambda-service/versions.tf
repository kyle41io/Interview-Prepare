# Not in the task brief, but required: without it a standalone
# `terraform init` in this directory resolves the latest aws provider (6.x),
# where data.aws_region's `name` attribute is deprecated — so `validate`
# reports a warning for code that is correct under the 5.x the consuming
# stacks actually pin (infra/versions.tf). The constraints mirror the root
# stack's so the module validates against the provider it runs on.
terraform {
  required_version = ">= 1.11.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.60"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.4"
    }
  }
}
