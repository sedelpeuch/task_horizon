terraform {
  required_version = ">= 0.12"
  backend "s3" {
    bucket = "task-horizon-tfstate"
    key = "terraform/terraform.tfstate"
    region = "eu-west-3"
    access_key = "test"
    secret_key = "test"
    skip_credentials_validation = true
    skip_metadata_api_check = true
    use_lockfile = true
  }
}

provider "aws" {
  region     = var.aws_region
  access_key = "test"
  secret_key = "test"

  skip_credentials_validation = true
  skip_requesting_account_id  = true
  skip_metadata_api_check     = true

  endpoints {
    s3  = local.endpoint
    rds = local.endpoint
    ec2 = local.endpoint
    sts = local.endpoint
  }
}

resource "aws_vpc" "task_horizon_vpc" {
  cidr_block = "10.0.0.0/16"
  tags       = merge(local.common_tags, { Name = "TaskHorizonVPC" })
}

resource "aws_subnet" "task_horizon_subnet" {
  for_each = {
    public  = { cidr = "10.0.1.0/24", az_index = 0 }
    private = { cidr = "10.0.2.0/24", az_index = 1 }
  }
  vpc_id            = aws_vpc.task_horizon_vpc.id
  cidr_block        = each.value.cidr
  availability_zone = data.aws_availability_zones.available.names[each.value.az_index]
}

resource "aws_s3_bucket" "task_horizon_avatar_data" {
  bucket = "${data.aws_caller_identity.current.account_id}-${var.bucket_name}"
  lifecycle {
    ignore_changes = [tags]
  }
}

output "task_horizon_avatar_data_arn" {
  value = aws_s3_bucket.task_horizon_avatar_data.arn
}

resource "aws_db_subnet_group" "task_horizon_db_subnet_group" {
  count      = var.enable_rds ? 1 : 0
  name       = "task-horizon-db-subnet-group"
  subnet_ids = [aws_subnet.task_horizon_subnet["private"].id]
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
  lifecycle {
    prevent_destroy = true
  }
}
