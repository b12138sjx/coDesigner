# CoDesigner Backend (Auth First)

This backend implements the first development slice of the architecture:

- NestJS API server
- Prisma + PostgreSQL
- Auth module (`register`, `login`, `refresh`)

## 1. Install

```bash
cd backend
npm install
```

## 2. Environment

```bash
cp .env.example .env
```

Update `DATABASE_URL` and JWT secrets.\n\nSuggested connection (isolated schema to avoid drift with existing public tables):\n`postgresql://postgres:<your_password>@localhost:5432/codesigner?schema=codesigner_auth`

## 3. Database migration

```bash
npm run prisma:migrate:dev -- --name init_auth
```

or in non-dev environments:

```bash
npm run prisma:migrate:deploy
```

## 4. Generate Prisma client

```bash
npm run prisma:generate
```

## 5. Start backend

```bash
npm run start:dev
```

Default base URL:

```text
http://localhost:3000/api/v1
```

## API Endpoints

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`

