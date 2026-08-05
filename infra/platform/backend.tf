# The bucket name MUST start with "interview-prep-" — the deploy role's S3
# policy only authorizes arn:aws:s3:::interview-prep-*. The new key sits under
# the same bucket, so no IAM change is needed for it or its .tflock object.
terraform {
  backend "s3" {
    bucket       = "interview-prep-tfstate-403001213633"
    key          = "interview-prep/ms/platform.tfstate"
    region       = "us-east-1"
    encrypt      = true
    use_lockfile = true
  }
}
