# Learning content lives here instead of in the public repo. Deliberately a
# separate bucket from the frontend one: that bucket is world-readable through
# CloudFront, and CI runs `aws s3 sync . --delete` against it.
resource "aws_s3_bucket" "content" {
  bucket_prefix = "${var.project}-content-"
}

resource "aws_s3_bucket_public_access_block" "content" {
  bucket                  = aws_s3_bucket.content.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# The authoring sources are git-ignored, so this bucket is their only history.
# Versioning is what makes a bad edit or a lost working directory recoverable.
resource "aws_s3_bucket_versioning" "content" {
  bucket = aws_s3_bucket.content.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "content" {
  bucket = aws_s3_bucket.content.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# The browser fetches the presigned URL cross-origin, so without this the bundle
# fetch fails in the browser while still succeeding from curl.
resource "aws_s3_bucket_cors_configuration" "content" {
  bucket = aws_s3_bucket.content.id
  cors_rule {
    allowed_methods = ["GET"]
    allowed_origins = ["https://${aws_cloudfront_distribution.frontend.domain_name}"]
    allowed_headers = ["*"]
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }
}
