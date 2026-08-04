variable "region" {
  type    = string
  default = "us-east-1"
}

variable "cost_tag" {
  type    = string
  default = "interview-prep"
}

variable "ssm_prefix" {
  type    = string
  default = "/interview-prep/ms"
}
