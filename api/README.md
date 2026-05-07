# ASK Blue Metal — API

Backend service for the ASK Blue Metal Weighbridge Integrated Production & Billing
Management System. Built with Node.js + TypeScript + Express + Prisma + PostgreSQL.

This Phase 0/1 slice ships:
- Foundation: config, logging, error handling, request id, validation, OpenAPI.
- IAM: login, refresh-token rotation with reuse detection, logout, `/me`,
  user management, role listing, RBAC middleware, account lockout.
- Audit: cross-cutting audit log + read-only `audit-logs` endpoint.

## Prerequisites

- Node.js 20+
- PostgreSQL 14+ running locally (any install method; no Docker required)

## Setup

```sh
cd api
cp .env.example .env
# Edit .env: set DATABASE_URL, JWT_SECRET, COOKIE_SECRET, SEED_ADMIN_PASSWORD
npm install
npm run prisma:generate
npm run prisma:migrate -- --name init
npm run db:seed
npm run dev
```

The API listens on `http://localhost:4000/api/v1`. OpenAPI docs at
`http://localhost:4000/api/v1/docs`. Raw spec at `/api/v1/openapi.json`.

## Sanity check

```sh
curl -s http://localhost:4000/api/v1/health
curl -s -X POST http://localhost:4000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"Admin@12345678"}'
```

The mobile client should send `X-Client-Type: mobile` on `/auth/login` and
`/auth/refresh` to receive the refresh token in the response body. Web clients
ignore this header and rely on the signed `HttpOnly` cookie.

## Layout

```
src/
  app.ts                 Express app factory
  server.ts              Process bootstrap
  infra/                 Cross-cutting: config, logger, db, errors, validation, openapi
  contexts/
    iam/                 Auth, users, roles, permissions
    audit/               Audit log
prisma/
  schema.prisma          Data model
  seed.ts                Permissions, roles, default admin
```

Each context owns its routes, services, and schemas. New modules
(masters, operations, shift, …) will be added as sibling folders under `contexts/`.

## Notes for production hardening (later phase)

- Switch JWT to RS256 with PEM keys.
- Front the API with HTTPS; set `NODE_ENV=production` so cookies become `Secure` and `SameSite=Strict`.
- Add CSRF protection on cookie-auth flows.
- Move rate-limit counters and refresh-token revocation lookups to Redis once load justifies it.
