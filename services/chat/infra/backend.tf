terraform {
  backend "s3" {
    bucket       = "interview-prep-tfstate-403001213633"
    key          = "interview-prep/ms/chat.tfstate"
    region       = "us-east-1"
    encrypt      = true
    use_lockfile = true
  }
}
