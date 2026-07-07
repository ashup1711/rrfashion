# RR FASHION — Backend (NestJS)

## Overview

This is the backend REST API for **RR FASHION**, an online fashion shopping store.
Built with [NestJS](https://nestjs.com/) and [Prisma](https://www.prisma.io/) (PostgreSQL).

## Tech Stack

- **Framework**: NestJS v10 (TypeScript)
- **ORM**: Prisma v5 (PostgreSQL)
- **Validation**: class-validator + class-transformer
- **Auth**: JWT (scaffolded, not yet implemented)

## Prerequisites

- Node.js >= 18
- PostgreSQL running locally
- npm or yarn

## Getting Started

```bash
# Install dependencies
npm install

# Generate Prisma client
npm run prisma:generate

# Run database migrations
npm run prisma:migrate

# Seed the database
npm run prisma:seed

# Start development server
npm run start:dev
```

The API will be available at `http://localhost:3000/api`.

## Project Structure

```
backend/
├── prisma/
│   ├── schema.prisma          # Database schema
│   └── seed.ts                # Seed script
├── src/
│   ├── main.ts                # App bootstrap
│   ├── app.module.ts          # Root module
│   ├── common/                # Shared utilities
│   │   ├── decorators/
│   │   ├── filters/
│   │   ├── guards/
│   │   ├── interceptors/
│   │   ├── pipes/
│   │   └── dto/
│   ├── config/                # Configuration
│   ├── modules/               # Feature modules
│   │   ├── auth/
│   │   ├── users/
│   │   ├── products/
│   │   ├── categories/
│   │   ├── orders/
│   │   ├── reviews/
│   │   └── cart/
│   ├── prisma/                # Prisma service
│   └── uploads/               # File uploads
└── test/                      # E2E tests
```

## Scripts

| Script              | Description                        |
|---------------------|------------------------------------|
| `npm run start`     | Start production server            |
| `npm run start:dev` | Start dev server with hot reload   |
| `npm run build`     | Build for production               |
| `npm run test`      | Run unit tests                     |
| `npm run test:e2e`  | Run end-to-end tests               |
| `npm run prisma:generate` | Generate Prisma client        |
| `npm run prisma:migrate`  | Run database migrations        |
| `npm run prisma:seed`     | Seed the database             |
