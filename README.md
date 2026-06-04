# TaskHorizon

A minimalist Kanban manager built as a **full-stack portfolio project** demonstrating modern cloud infrastructure, DevOps practices, and software architecture.

## 📋 Project Overview

**TaskHorizon** showcases:

- **Backend**: FastAPI + PostgreSQL with clean architecture
- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **Infrastructure**: Kubernetes (EKS) + Helm + Terraform
- **CI/CD**: GitHub Actions push-based deployment pipeline
- **Code Quality**: Pre-commit hooks, pytest, ESLint

This project serves as proof of competency for:

- Senior Developer / Junior DevOps roles
- Infrastructure as Code (Terraform)
- Container orchestration (Kubernetes/Helm)
- Automated CI/CD pipelines
- Full-stack application development

## 🚀 Quick Start

### Prerequisites

- Docker & Docker Compose
- Python 3.12+ (for local development)
- Node.js 20+ & Yarn (for web development)

### Development Setup

```bash
# Copy environment variables
cp .env.example .env

# Start all services
docker compose up

# Or develop locally:

# Backend
cd api
pip install -e ".[dev]"
pytest
uvicorn taskhorizon.main:app --reload

# Frontend
cd web
yarn install
yarn dev
```

### Access

- **Frontend**: <http://localhost:5173>
- **API Docs**: <http://localhost:8000/docs>
- **Database**: localhost:5432 (postgres/postgres)

## 📁 Project Structure

```
task_horizon/
├── api/                    # FastAPI backend
│   ├── src/taskhorizon/
│   ├── tests/
│   ├── pyproject.toml
│   └── Dockerfile
├── web/                    # React frontend
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── Dockerfile
├── helm/                   # Kubernetes Helm charts
├── terraform/              # Infrastructure as Code
├── docker-compose.yml      # Local development
├── .pre-commit-config.yaml # Git hooks
└── README.md
```

## 🔄 Development Workflow

### Code Quality & Hooks

Pre-commit hooks enforce code quality:

```bash
# Install hooks
pre-commit install

# Hooks run automatically on commit:
# - Ruff (Python linting)
# - Black (Python formatting)
# - ESLint (JavaScript/TypeScript linting)
# - Trailing whitespace, YAML formatting, etc.
```

### Testing

```bash
# Backend tests with coverage
cd api
pytest --cov=src/taskhorizon

# Frontend (ready for your test setup)
cd web
yarn test
```

### Build & Deploy

All deployments are **push-based** via GitHub Actions:

- **Feature branches** → Lint + Test + Build (no deploy)
- **Develop** → Deploy to staging cluster
- **Main** → Deploy to production EKS cluster

## 🏗️ Architecture

### Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS |
| **Backend** | FastAPI, Uvicorn, PostgreSQL |
| **Container** | Docker, Docker Compose |
| **Orchestration** | Kubernetes (EKS), Helm |
| **IaC** | Terraform (VPC, EKS, RDS) |
| **CI/CD** | GitHub Actions |
| **Registry** | GitHub Container Registry (ghcr.io) |

### Deployment Environments

- **Local**: Docker Compose (all services)
- **Dev/Staging**: EKS cluster (managed via Terraform)
- **Production**: EKS cluster (Helm + Terraform)

## 📚 Documentation

- **Blog Article**: Full writeup at <https://delpeuch.net/docs/projects/personnel/>
- **Learning Path**: See <https://delpeuch.net/blog/tags/cloud>

## 🤝 Contributing

This is a personal portfolio project. For improvements or feedback, please open an issue or reach out.

## 📄 License

MIT

---

**Built with ❤️ for learning DevOps and cloud architecture**
