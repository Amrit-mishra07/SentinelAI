# Deployment Configuration

This directory contains infrastructure-as-code and deployment manifests.

## Docker Compose (Development)
Use the main `docker-compose.yml` in the project root for local development.

## Kubernetes (Production)
Create namespace, deployment, service, and configmap manifests:
- `namespace.yaml`
- `deployment.yaml`
- `service.yaml`
- `configmap.yaml`
- `ingress.yaml`

## Terraform (IaC)
Add Terraform configurations for cloud infrastructure:
- `main.tf`
- `variables.tf`
- `outputs.tf`

## Helm Charts
Create Helm chart for easy Kubernetes deployments.
