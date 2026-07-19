terraform {
  required_version = ">= 0.12"
  backend "s3" {
    bucket       = "task-horizon-tfstate"
    key          = "terraform/terraform.tfstate"
    region       = "eu-west-3"
    use_lockfile = true
  }
}

provider "aws" {
  region = var.aws_region
}

resource "aws_vpc" "task_horizon_vpc" {
  cidr_block = "10.0.0.0/16"
  tags       = merge(local.common_tags, { Name = "TaskHorizonVPC" })
}

# 4 subnets : 2 publics + 2 privés dans 2 AZs différentes.
# EKS et RDS requièrent au moins 2 AZs pour la haute disponibilité.
# Les tags kubernetes.io/role/* indiquent au Load Balancer Controller
# dans quels subnets créer les ALB publics (elb) ou internes (internal-elb).
resource "aws_subnet" "task_horizon_subnet" {
  for_each = local.subnets

  vpc_id                  = aws_vpc.task_horizon_vpc.id
  cidr_block              = each.value.cidr
  availability_zone       = data.aws_availability_zones.available.names[each.value.az_index]
  map_public_ip_on_launch = each.value.tier == "public"

  tags = merge(
    local.common_tags,
    { Name = "${local.project}-subnet-${each.key}" },
    { "kubernetes.io/cluster/task-horizon-eks" = "shared" },
    each.value.tier == "public"
      ? { "kubernetes.io/role/elb" = "1" }
      : { "kubernetes.io/role/internal-elb" = "1" }
  )
}

# Internet Gateway : porte d'entrée/sortie vers internet pour les subnets publics.
# Sans lui, le subnet public est une île isolée — rien ne peut sortir ni entrer.
resource "aws_internet_gateway" "task_horizon_igw" {
  vpc_id = aws_vpc.task_horizon_vpc.id
  tags   = merge(local.common_tags, { Name = "${local.project}-igw" })
}

# Elastic IP fixe pour le NAT Gateway.
# Le NAT a besoin d'une IP publique stable pour masquer les IPs privées des nodes.
resource "aws_eip" "task_horizon_nat" {
  domain     = "vpc"
  tags       = merge(local.common_tags, { Name = "${local.project}-nat-eip" })
  depends_on = [aws_internet_gateway.task_horizon_igw]
}

# NAT Gateway : permet aux nodes EKS (en subnet privé) de sortir vers internet
# pour puller les images Docker et appeler les APIs AWS, sans être accessibles depuis internet.
# Placé dans un subnet public car il a lui-même besoin de l'IGW pour sortir.
resource "aws_nat_gateway" "task_horizon_nat" {
  allocation_id = aws_eip.task_horizon_nat.id
  subnet_id     = aws_subnet.task_horizon_subnet["public-a"].id
  tags          = merge(local.common_tags, { Name = "${local.project}-nat" })
  depends_on    = [aws_internet_gateway.task_horizon_igw]
}

# Route table publique : envoie tout le trafic sortant (0.0.0.0/0) vers l'IGW.
# Associée aux subnets publics — c'est ce qui les rend "publics".
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.task_horizon_vpc.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.task_horizon_igw.id
  }

  tags = merge(local.common_tags, { Name = "${local.project}-rt-public" })
}

# Route table privée : envoie le trafic sortant vers le NAT Gateway (pas l'IGW).
# Les nodes sortent sur internet via NAT, mais ne sont pas accessibles depuis l'extérieur.
resource "aws_route_table" "private" {
  vpc_id = aws_vpc.task_horizon_vpc.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.task_horizon_nat.id
  }

  tags = merge(local.common_tags, { Name = "${local.project}-rt-private" })
}

# Associations : lie chaque subnet à sa route table (public → rt-public, private → rt-private).
# Sans association, AWS utilise la route table par défaut du VPC qui ne route que le trafic local.
resource "aws_route_table_association" "task_horizon_subnet" {
  for_each = local.subnets

  subnet_id      = aws_subnet.task_horizon_subnet[each.key].id
  route_table_id = each.value.tier == "public" ? aws_route_table.public.id : aws_route_table.private.id
}

resource "aws_s3_bucket" "task_horizon_avatar_data" {
  bucket = "${data.aws_caller_identity.current.account_id}-${var.bucket_name}"
  lifecycle {
    ignore_changes = [tags]
  }
}

# Bloque tout accès public au bucket — les avatars passent par l'API, jamais en accès direct.
resource "aws_s3_bucket_public_access_block" "task_horizon_avatar_data" {
  bucket                  = aws_s3_bucket.task_horizon_avatar_data.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# CORS : autorise le navigateur à uploader des avatars directement vers S3.
# allowed_origins à restreindre au domaine de l'app en prod.
resource "aws_s3_bucket_cors_configuration" "task_horizon_avatar_data" {
  bucket = aws_s3_bucket.task_horizon_avatar_data.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "PUT", "POST"]
    allowed_origins = ["*"]
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }
}

# Bucket policy : seul le rôle IAM de l'API peut lire/écrire les avatars.
resource "aws_s3_bucket_policy" "task_horizon_avatar_data" {
  bucket     = aws_s3_bucket.task_horizon_avatar_data.id
  depends_on = [aws_s3_bucket_public_access_block.task_horizon_avatar_data]

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowAPIAccess"
        Effect = "Allow"
        Principal = {
          AWS = aws_iam_role.task_horizon_api.arn
        }
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
        ]
        Resource = "${aws_s3_bucket.task_horizon_avatar_data.arn}/*"
      },
      {
        Sid    = "AllowListBucket"
        Effect = "Allow"
        Principal = {
          AWS = aws_iam_role.task_horizon_api.arn
        }
        Action   = ["s3:ListBucket"]
        Resource = aws_s3_bucket.task_horizon_avatar_data.arn
      }
    ]
  })
}

# IAM policy : permissions S3 accordées au rôle de l'API.
resource "aws_iam_policy" "task_horizon_s3_avatar" {
  name        = "${local.project}-${var.environment}-s3-avatar"
  description = "Permet aux pods API de lire/écrire les avatars dans S3"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"]
        Resource = "${aws_s3_bucket.task_horizon_avatar_data.arn}/*"
      },
      {
        Effect   = "Allow"
        Action   = ["s3:ListBucket"]
        Resource = aws_s3_bucket.task_horizon_avatar_data.arn
      }
    ]
  })
}

# Rôle IAM pour IRSA : les pods EKS assument ce rôle via l'OIDC provider du cluster.
# Le ServiceAccount Kubernetes annoté avec ce rôle obtient les permissions S3 sans credentials.
resource "aws_iam_role" "task_horizon_api" {
  name = "${local.project}-${var.environment}-api"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Federated = module.eks.oidc_provider_arn
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringEquals = {
            "${module.eks.oidc_provider}:sub" = "system:serviceaccount:taskhorizon:taskhorizon-${var.environment}-api"
            "${module.eks.oidc_provider}:aud" = "sts.amazonaws.com"
          }
        }
      }
    ]
  })

  tags = local.common_tags
}

resource "aws_iam_role_policy_attachment" "task_horizon_api_s3" {
  role       = aws_iam_role.task_horizon_api.name
  policy_arn = aws_iam_policy.task_horizon_s3_avatar.arn
}

output "task_horizon_avatar_data_arn" {
  value = aws_s3_bucket.task_horizon_avatar_data.arn
}

# À annoter sur le ServiceAccount Kubernetes de l'API dans Helm values :
# serviceAccount.annotations."eks.amazonaws.com/role-arn"
output "api_iam_role_arn" {
  value       = aws_iam_role.task_horizon_api.arn
  description = "ARN du rôle IAM à annoter sur le ServiceAccount de l'API"
}

resource "aws_db_subnet_group" "task_horizon_db_subnet_group" {
  count      = var.enable_rds ? 1 : 0
  name       = "task-horizon-db-subnet-group"
  subnet_ids = [
    aws_subnet.task_horizon_subnet["private-a"].id,
    aws_subnet.task_horizon_subnet["private-b"].id,
  ]
}

resource "aws_db_instance" "task_horizon_db" {
  count                   = var.enable_rds ? 1 : 0
  engine                  = "postgres"
  instance_class          = "db.t3.micro"
  allocated_storage       = 20
  db_name                 = "task_horizon_db"
  username                = var.db_username
  password                = var.db_password
  skip_final_snapshot     = true
  db_subnet_group_name    = aws_db_subnet_group.task_horizon_db_subnet_group[0].name
  storage_encrypted       = true
  backup_retention_period = 7
  lifecycle {
    prevent_destroy = true
  }
}

# Autorise le trafic HTTP entrant vers le cluster (nécessaire pour l'ALB en Auto Mode)
resource "aws_security_group_rule" "eks_cluster_http_ingress" {
  type              = "ingress"
  from_port         = 80
  to_port           = 80
  protocol          = "tcp"
  cidr_blocks       = ["0.0.0.0/0"]
  security_group_id = module.eks.cluster_primary_security_group_id
  description       = "Allow HTTP from internet for ALB"
}

resource "aws_iam_role" "eks_admin" {
  name = "${local.project}-eks-admin"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root" }
      Action    = "sts:AssumeRole"
    }]
  })

  tags = local.common_tags
}

module "eks" {
  source          = "terraform-aws-modules/eks/aws"
  version         = "~> 20.0"
  cluster_name    = "task-horizon-eks"
  cluster_version = "1.34"
  vpc_id          = aws_vpc.task_horizon_vpc.id
  subnet_ids      = values(aws_subnet.task_horizon_subnet)[*].id
  tags            = local.common_tags
  cluster_endpoint_public_access = true
  cluster_compute_config = {
    enabled    = true
    node_pools = ["general-purpose"]
  }

  access_entries = {
    admin = {
      principal_arn = "arn:aws:iam::933103158736:user/sedelpeuch"
      policy_associations = {
        cluster_admin = {
          policy_arn   = "arn:aws:eks::aws:cluster-access-policy/AmazonEKSClusterAdminPolicy"
          access_scope = { type = "cluster" }
        }
      }
    }
    eks_admin_role = {
      principal_arn = aws_iam_role.eks_admin.arn
      policy_associations = {
        cluster_admin = {
          policy_arn   = "arn:aws:eks::aws:cluster-access-policy/AmazonEKSClusterAdminPolicy"
          access_scope = { type = "cluster" }
        }
      }
    }
  }
}


