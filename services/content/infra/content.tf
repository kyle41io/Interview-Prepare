# Learning content lives here instead of in the public repo. Deliberately a
# separate bucket from the frontend one: that bucket is world-readable through
# CloudFront, and CI runs `aws s3 sync . --delete` against it.
resource "aws_s3_bucket" "content" {
  bucket_prefix = "${var.name_prefix}-content-"
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

# Published so deploy-content-data can find the bucket without Terraform state
# access, the same way deploy-web finds the frontend bucket. bucket_prefix
# generates the suffix at create time, so the name is not derivable from config
# — anything needing it either reads it here or resorts to listing buckets by
# prefix and guessing.
resource "aws_ssm_parameter" "content_bucket" {
  name  = "${var.ssm_prefix}/config/content-bucket"
  type  = "String"
  value = aws_s3_bucket.content.bucket
}

# The browser fetches the presigned URL cross-origin, so without this the bundle
# fetch fails in the browser while still succeeding from curl. The distribution
# domain now comes from the platform stack via SSM.
data "aws_ssm_parameter" "cloudfront_domain" {
  name = "${var.ssm_prefix}/config/cloudfront-domain"
}

resource "aws_s3_bucket_cors_configuration" "content" {
  bucket = aws_s3_bucket.content.id
  cors_rule {
    allowed_methods = ["GET"]
    allowed_origins = ["https://${nonsensitive(data.aws_ssm_parameter.cloudfront_domain.value)}"]
    allowed_headers = ["*"]
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }
}

# Read-only: this is a public-facing path that physically cannot mutate
# content.
#
# ListBucket is deliberately included alongside GetObject even though the
# content function only ever reads objects, not the bucket listing. Without
# it, S3 returns 403 AccessDenied instead of 404 NotFound for a missing key,
# so the service's empty-bundle branch never fires and the dashboard would
# 500 during the window between deploying this infra and seeding the bucket.
# PutObject/DeleteObject stay off this role.
data "aws_iam_policy_document" "content_read" {
  statement {
    sid       = "ContentGetObject"
    effect    = "Allow"
    actions   = ["s3:GetObject"]
    resources = ["${aws_s3_bucket.content.arn}/*"]
  }

  statement {
    sid       = "ContentListBucket"
    effect    = "Allow"
    actions   = ["s3:ListBucket"]
    resources = [aws_s3_bucket.content.arn]
  }
}

resource "aws_iam_role_policy" "content_read" {
  name   = "${var.name_prefix}-content-read"
  role   = module.service.role_id
  policy = data.aws_iam_policy_document.content_read.json
}
