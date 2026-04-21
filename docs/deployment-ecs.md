# CoDesigner ECS Docker + CI/CD Guide

## 1. Stack Overview

This repository now ships with four containerized services:

- `web`: Vite frontend build output served by Nginx
- `backend`: NestJS + Prisma API
- `ai-api`: Next.js AI service
- `postgres`: PostgreSQL database

Local startup uses Docker Compose. ECS deployment uses GitHub Actions to build images, push them to Alibaba Cloud ACR, and update the ECS host over SSH.

## 2. Run Locally

Start the whole stack with:

```bash
docker compose up -d --build
```

Default local URLs:

- App: `http://localhost:8080`
- Backend health: `http://localhost:8080/api/v1/health`
- AI health: `http://localhost:8080/api/health`

If you want custom ports, JWT secrets, or OpenAI settings, copy the sample env file first:

```bash
cp .env.docker.example .env
```

Then run `docker compose up -d --build` again.

If Docker build runs in a network with unstable access to `registry.npmjs.org`, keep this in `.env`:

```dotenv
APT_MIRROR=mirrors.aliyun.com
NPM_REGISTRY=https://registry.npmmirror.com
```

If Docker Hub itself is unstable in your network, you can also override the base images:

```dotenv
POSTGRES_IMAGE=postgres:16-alpine
NODE_IMAGE=node:20-bookworm-slim
NGINX_IMAGE=nginx:1.27-alpine
```

The Docker flow now reads `POSTGRES_IMAGE`, `NODE_IMAGE`, `NGINX_IMAGE`, `APT_MIRROR`, and `NPM_REGISTRY` from env when applicable.

## 3. Prepare Alibaba Cloud ACR

Create three repositories under the same namespace:

- `codesigner-web`
- `codesigner-backend`
- `codesigner-ai-api`

Record your full registry prefix, for example:

```text
registry.cn-hangzhou.aliyuncs.com/your-namespace
```

## 4. Configure GitHub Secrets

Add these repository secrets in GitHub:

- `ACR_REGISTRY`
- `ACR_USERNAME`
- `ACR_PASSWORD`
- `ECS_HOST`
- `ECS_PORT`
- `ECS_USER`
- `ECS_SSH_KEY`

Notes:

- `ACR_REGISTRY` should be the full image prefix, such as `registry.cn-hangzhou.aliyuncs.com/your-namespace`
- `ECS_SSH_KEY` should be the private key content for your ECS login
- `ECS_PORT` is usually `22`

## 5. One-Time ECS Initialization

Only the first deployment needs these manual steps.

### 5.1 Install Docker and Compose

Install Docker Engine and the Docker Compose plugin on ECS, then confirm:

```bash
docker --version
docker compose version
```

### 5.2 Prepare the deployment directory

```bash
sudo mkdir -p /opt/codesigner/deploy
sudo chown -R "$USER":"$USER" /opt/codesigner
```

Place these files on the server:

- `deploy/compose.prod.yml` -> `/opt/codesigner/deploy/compose.prod.yml`
- `deploy/.env.prod.example` -> copy to `/opt/codesigner/deploy/.env.prod`

### 5.3 Fill the production env file

Use `/opt/codesigner/deploy/.env.prod` like this:

```dotenv
ACR_REGISTRY=registry.cn-hangzhou.aliyuncs.com/your-namespace
CORS_ORIGIN=http://<ecs-public-ip>
POSTGRES_IMAGE=postgres:16-alpine
APT_MIRROR=mirrors.aliyun.com
NPM_REGISTRY=https://registry.npmmirror.com

POSTGRES_DB=codesigner
POSTGRES_USER=postgres
POSTGRES_PASSWORD=replace_with_strong_password
DATABASE_URL=postgresql://postgres:replace_with_strong_password@postgres:5432/codesigner?schema=codesigner_auth

THROTTLE_TTL_MS=60000
THROTTLE_LIMIT=20

JWT_ACCESS_SECRET=replace_with_long_random_access_secret
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_SECRET=replace_with_long_random_refresh_secret
JWT_REFRESH_EXPIRES_IN=7d

OPENAI_API_KEY=
OPENAI_MODEL=gpt-4.1-mini
```

Notes:

- URL-encode the database password if it contains special characters
- This guide assumes public-IP access first, so `CORS_ORIGIN` starts as `http://<ecs-public-ip>`
- `OPENAI_API_KEY` can be empty if you want to keep the local fallback behavior

### 5.4 Login to ACR once on the server

```bash
docker login <your-acr-registry-host>
```

## 6. First Manual Deployment

Before enabling automatic deploys, you can verify the server manually:

```bash
cd /opt/codesigner
IMAGE_TAG=latest docker compose --env-file deploy/.env.prod -f deploy/compose.prod.yml pull
IMAGE_TAG=latest docker compose --env-file deploy/.env.prod -f deploy/compose.prod.yml up -d --remove-orphans
```

Verify the services:

```bash
docker compose --env-file deploy/.env.prod -f deploy/compose.prod.yml ps
curl http://127.0.0.1/api/v1/health
curl http://127.0.0.1/api/health
curl http://127.0.0.1/healthz
```

Public entry:

```text
http://<ecs-public-ip>
```

## 7. Automatic Deployment Flow

The workflow file is `.github/workflows/deploy-ecs.yml`.

Triggers:

- push to `main`
- manual `workflow_dispatch`

The pipeline does the following:

1. Build `web`, `backend`, and `ai-api` images
2. Push both `${GITHUB_SHA}` and `latest` tags to ACR
3. SSH into ECS
4. Run:

```bash
IMAGE_TAG=<github-sha> docker compose --env-file deploy/.env.prod -f deploy/compose.prod.yml pull
IMAGE_TAG=<github-sha> docker compose --env-file deploy/.env.prod -f deploy/compose.prod.yml up -d --remove-orphans
```

## 8. Rollback

Rollback is just a tag switch:

```bash
cd /opt/codesigner
IMAGE_TAG=<previous-sha> docker compose --env-file deploy/.env.prod -f deploy/compose.prod.yml pull
IMAGE_TAG=<previous-sha> docker compose --env-file deploy/.env.prod -f deploy/compose.prod.yml up -d --remove-orphans
```

## 9. Common Ops Commands

Check container status:

```bash
docker compose --env-file deploy/.env.prod -f deploy/compose.prod.yml ps
```

Tail logs:

```bash
docker compose --env-file deploy/.env.prod -f deploy/compose.prod.yml logs -f web
docker compose --env-file deploy/.env.prod -f deploy/compose.prod.yml logs -f backend
docker compose --env-file deploy/.env.prod -f deploy/compose.prod.yml logs -f ai-api
docker compose --env-file deploy/.env.prod -f deploy/compose.prod.yml logs -f postgres
```

Restart all services:

```bash
docker compose --env-file deploy/.env.prod -f deploy/compose.prod.yml restart
```

Stop while keeping the database volume:

```bash
docker compose --env-file deploy/.env.prod -f deploy/compose.prod.yml down
```

Delete data too:

```bash
docker compose --env-file deploy/.env.prod -f deploy/compose.prod.yml down -v
```
