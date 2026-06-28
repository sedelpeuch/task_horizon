terraform {
  required_version = ">= 0.12"
}

provider "aws" {
  region     = var.aws_region
  access_key = "test"
  secret_key = "test"

  skip_credentials_validation = true
  skip_requesting_account_id  = true
  skip_metadata_api_check     = true

  endpoints {
    s3  = "http://localhost:4566"
    rds = "http://localhost:4566"
    ec2 = "http://localhost:4566"
    sts = "http://localhost:4566"
  }
}

resource "aws_vpc" "task_horizon_vpc" {
  cidr_block = "10.0.0.0/16"
}

resource "aws_subnet" "task_horizon_subnet_public" {
  vpc_id            = aws_vpc.task_horizon_vpc.id
  cidr_block        = "10.0.1.0/24"
  availability_zone = data.aws_availability_zones.available.names[0]
}

resource "aws_subnet" "task_horizon_subnet_private" {
  vpc_id            = aws_vpc.task_horizon_vpc.id
  cidr_block        = "10.0.2.0/24"
  availability_zone = data.aws_availability_zones.available.names[1]
}

resource "aws_s3_bucket" "task_horizon_avatar_data" {
  bucket = "${data.aws_caller_identity.current.account_id}-${var.bucket_name}"
}

output "task_horizon_avatar_data_arn" {
  value = aws_s3_bucket.task_horizon_avatar_data.arn
}

resource "aws_db_subnet_group" "task_horizon_db_subnet_group" {
  count      = var.enable_rds ? 1 : 0
  name       = "task-horizon-db-subnet-group"
  subnet_ids = [aws_subnet.task_horizon_subnet_private.id]
}

resource "aws_db_instance" "task_horizon_db" {
  count                = var.enable_rds ? 1 : 0
  engine               = "postgres"
  instance_class       = "db.t3.micro"
  allocated_storage    = 20
  db_name              = "task_horizon_db"
  username             = var.db_username
  password             = var.db_password
  skip_final_snapshot  = true
  db_subnet_group_name = aws_db_subnet_group.task_horizon_db_subnet_group[0].name
}
