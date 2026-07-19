locals {
  endpoint = "http://localhost:4566"
  project  = "task-horizon"

  common_tags = {
    Project     = "TaskHorizon"
    Environment = var.environment
    ManagedBy   = "terraform"
  }

  subnets = {
    "public-a"  = { cidr = "10.0.1.0/24", az_index = 0, tier = "public" }
    "public-b"  = { cidr = "10.0.2.0/24", az_index = 1, tier = "public" }
    "private-a" = { cidr = "10.0.3.0/24", az_index = 0, tier = "private" }
    "private-b" = { cidr = "10.0.4.0/24", az_index = 1, tier = "private" }
  }
}
