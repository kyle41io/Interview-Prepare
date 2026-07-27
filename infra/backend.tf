# Remote state in S3 with native lockfile (Terraform >= 1.11) — no DynamoDB
# lock table needed. The bucket is created once as a user bootstrap step
# (see docs/superpowers/DEPLOY-AWS.md); fill in the bucket name there.
terraform {
  backend "s3" {
    # NOTE: real state bucket name MUST start "interview-prep-" (e.g. interview-prep-tfstate-<suffix>)
    # — GitHub deploy role's S3 policy only authorizes arn:aws:s3:::interview-prep-* buckets.
    bucket       = "REPLACE_ME_tfstate_bucket"
    key          = "interview-prep/terraform.tfstate"
    region       = "us-east-1"
    encrypt      = true
    use_lockfile = true
  }
}
