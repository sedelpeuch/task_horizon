variable "environment" {
  description = "Environnement de déploiement (test, staging, prod)"
  type        = string
}

variable "bucket_name" {
  description = "The name of the S3 bucket"
  type        = string
  default = "task-horizon-avatar-data"
}

variable "aws_region" {
  description = "The AWS region"
  type        = string
  default     = "eu-west-3"
}

variable "enable_rds" {
  description = "Enable RDS resources (requires LocalStack Pro or real AWS)"
  type        = bool
  default     = false
}

variable "db_username" {
  description = "The username for the RDS instance"
  type        = string
  sensitive   = true
}

variable "db_password" {
  description = "The password for the RDS instance"
  type        = string
  sensitive   = true
}
