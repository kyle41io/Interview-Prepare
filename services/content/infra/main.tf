# content keeps its data in S3, not DynamoDB, so create_table is false and the
# module emits no Ddb statement at all. Its single route does not follow the
# 4-methods expansion, so it is passed as an explicit route key.
module "service" {
  source = "../../../infra/modules/lambda-service"

  name       = "content"
  timeout    = 15
  bundle_dir = "${path.module}/../dist-lambda/content"

  create_table = false

  extra_env = {
    CONTENT_BUCKET = aws_s3_bucket.content.bucket
  }

  extra_route_keys = ["GET /v1/content/bundle"]
}
