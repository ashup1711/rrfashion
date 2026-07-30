# Deployment Architecture

## Overview

This document describes the deployment architecture for R R Fashion:

| Layer | Platform | Location |
|-------|----------|----------|
| **Frontend** | GitHub Pages (via GitHub Actions) | Public cloud |
| **Backend** | Docker Compose on self-hosted Mac Mini | Local network |
| **Tunnel** | ngrok | Exposes local backend to the internet |
| **Database** | PostgreSQL (in Docker) | Same Mac Mini |
| **File Storage** | MinIO (S3-compatible, in Docker) | Same Mac Mini |
| **Cache** | Redis (in Docker) | Same Mac Mini |

```
┌─────────────────────────────────────────────────┐
│  GitHub Pages (HTTPS)                           │
│  https://ashup1711.github.io/rrfashion          │
│                                                 │
│  ┌───────────────────────────────────────────┐  │
│  │  React SPA (Vite build)                   │  │
│  │  VITE_API_URL → https://xxxx.ngrok.io/api │  │
│  └───────────────────────────────────────────┘  │
└──────────────────────┬──────────────────────────┘
                       │ withCredentials: true
                       │ (HTTP-only cookies)
                       │ CORS origin: GitHub Pages URL
                       ▼
┌─────────────────────────────────────────────────┐
│  ngrok Tunnel (HTTPS)                           │
│  https://xxxx.ngrok.io  ────────► localhost:3000│
└─────────────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────┐
│  Mac Mini (Local Network)                       │
│                                                 │
│  ┌───────────────────────────────────────────┐  │
│  │  Docker Compose                           │  │
│  │                                           │  │
│  │  ┌──────────┐  ┌──────────┐  ┌────────┐  │  │
│  │  │ NestJS   │  │PostgreSQL│  │ Redis  │  │  │
│  │  │ (API)    │  │(Database)│  │(Cache) │  │  │
│  │  └──────────┘  └──────────┘  └────────┘  │  │
│  │  ┌──────────┐                             │  │
│  │  │ MinIO    │                             │  │
│  │  │(Storage) │                             │  │
│  │  └──────────┘                             │  │
│  └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

## Frontend Deployment

### Build Process

The React app is built with Vite. The build output goes to the `dist/` directory.

```bash
# Build for production
npm run build

# Output: frontend/dist/
#   - index.html
#   - assets/*.js / *.css
```

### GitHub Actions CI/CD

The frontend is deployed via GitHub Actions to GitHub Pages. The workflow:

1. Triggered on push to `main` or `develop` branch
2. Installs dependencies (`npm ci`)
3. Runs lint (`npm run lint`)
4. Runs tests (`npm test`)
5. Builds the app (`npm run build`)
6. Deploys `dist/` to the `gh-pages` branch
7. GitHub Pages serves the content at `https://ashup1711.github.io/rrfashion/`

### Environment Variables (Build-time)

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_URL` | Yes | Backend API base URL (the ngrok URL) — e.g. `https://xxxx.ngrok.io/api` |

**Setting the variable in CI:**

```yaml
# .github/workflows/deploy.yml (example)
- name: Build
  run: npm run build
  env:
    VITE_API_URL: ${{ secrets.VITE_API_URL }}
```

### Environment Variables (Runtime via `__RUNTIME_ENV__`)

The app also supports runtime environment variables via `window.__RUNTIME_ENV__`. This is useful when the ngrok URL changes between deployments without rebuilding:

```html
<!-- index.html -->
<script>
  window.__RUNTIME_ENV__ = {
    API_URL: 'https://new-ngrok-url.ngrok.io/api'
  };
</script>
```

The resolution order is:
1. `localStorage.getItem('api_url')` — allows runtime override
2. `window.__RUNTIME_ENV__.API_URL` — injected via index.html
3. `import.meta.env.VITE_API_URL` — build-time env var
4. `http://localhost:3000/api` — fallback for local development

### HashRouter

The frontend uses `HashRouter` (URL hash-based routing). All routes are prefixed with `#/`:

```
https://ashup1711.github.io/rrfashion/#/shop
https://ashup1711.github.io/rrfashion/#/cart
https://ashup1711.github.io/rrfashion/#/admin/dashboard
```

This is required because GitHub Pages does not support SPA fallback routing with `BrowserRouter`.

---

## Backend Deployment (Docker Compose)

### Container Architecture

| Container | Image | Port | Purpose |
|-----------|-------|------|---------|
| `rr-backend` | `rr-fashion-backend:latest` | `3000` | NestJS API server |
| `rr-postgres` | `postgres:16-alpine` | `5432` | Primary database |
| `rr-redis` | `redis:7-alpine` | `6379` | Caching and session store |
| `rr-minio` | `minio/minio` | `9000` (API), `9001` (Console) | File storage |

### Docker Compose Configuration

```yaml
# docker-compose.yml (example structure)
version: '3.8'
services:
  backend:
    build: ./backend
    ports:
      - '3000:3000'
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://...
      REDIS_URL: redis://rr-redis:6379
      MINIO_ENDPOINT: rr-minio
      CORS_ORIGINS: https://ashup1711.github.io,https://xxxx.ngrok.io
    depends_on:
      - postgres
      - redis
      - minio

  postgres:
    image: postgres:16-alpine
    volumes:
      - pgdata:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine

  minio:
    image: minio/minio
    command: server /data --console-address ':9001'
```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NODE_ENV` | Yes | Set to `production` for production |
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `REDIS_URL` | Yes | Redis connection string |
| `MINIO_ENDPOINT` | Yes | MinIO server hostname |
| `MINIO_ACCESS_KEY` | Yes | MinIO access key |
| `MINIO_SECRET_KEY` | Yes | MinIO secret key |
| `JWT_SECRET` | Yes | Customer JWT signing secret |
| `JWT_ADMIN_SECRET` | Yes | Admin JWT signing secret |
| `CORS_ORIGINS` | Yes | Comma-separated list of allowed CORS origins |
| `PORT` | No | API port (default: 3000) |

### CORS_ORIGINS Configuration

The `CORS_ORIGINS` environment variable must include:

1. The **GitHub Pages URL**: `https://ashup1711.github.io`
2. The **current ngrok URL**: `https://xxxx.ngrok.io`
3. Any **custom domain**: `https://rrfashion.com` (if configured)

Format: comma-separated, no trailing slashes:

```
CORS_ORIGINS=https://ashup1711.github.io,https://xxxx.ngrok.io
```

---

## Ngrok Configuration

### Why ngrok?

- GitHub Pages serves the frontend over HTTPS
- The backend runs on a local Mac Mini without a public IP
- ngrok creates a secure HTTPS tunnel from a public URL to `localhost:3000`
- Cookies require HTTPS for the `Secure` flag — ngrok provides HTTPS termination

### Setup

```bash
# Install ngrok (macOS)
brew install ngrok

# Authenticate (one-time)
ngrok config add-authtoken YOUR_AUTH_TOKEN

# Start tunnel to backend
ngrok http 3000
```

This creates a public URL like `https://a1b2c3d4.ngrok.io` that forwards to `http://localhost:3000`.

### Ngrok URL Changes

Every time ngrok restarts, the URL changes. When this happens:

1. **Update `VITE_API_URL`** in the GitHub Actions secret or `__RUNTIME_ENV__` in `index.html`
2. **Update `CORS_ORIGINS`** in the backend's Docker Compose environment
3. **Restart the backend** to pick up the new CORS origin

Alternatively, use a **fixed subdomain** (ngrok Pro feature):

```bash
ngrok http 3000 --subdomain=rrfashion-api
```

This gives a stable URL: `https://rrfashion-api.ngrok.io`

### CORS Considerations

- The frontend (GitHub Pages) sends requests to the backend via ngrok
- This is a **cross-origin** request (different origins)
- The backend must include the GitHub Pages URL (and ngrok URL) in `CORS_ORIGINS`
- The `Access-Control-Allow-Origin` response header must match the exact requesting origin
- The response must include `Access-Control-Allow-Credentials: true` for cookie auth

---

## Cookie Auth Considerations

### HTTP-Only Cookies and Cross-Origin Requests

Since the frontend and backend are on different origins (GitHub Pages vs ngrok), several requirements must be met for cookies to work:

1. **`SameSite=None; Secure`** for cross-origin cookie transmission
2. **`withCredentials: true`** on all Axios requests from the frontend
3. **`Access-Control-Allow-Credentials: true`** in the backend CORS config
4. **`Access-Control-Allow-Origin`** must be the exact origin (no wildcard `*`)

### Current Cookie Configuration

| Cookie | HTTP-Only | Secure | SameSite | Path | MaxAge |
|--------|-----------|--------|----------|------|--------|
| `access_token` | Yes | Yes (prod) | Strict | `/` | 15 min |
| `refresh_token` | Yes | Yes (prod) | Strict | `/api/auth` | 7 days |
| `admin_access_token` | Yes | Yes (prod) | Strict | `/` | 15 min |
| `admin_refresh_token` | Yes | Yes (prod) | Strict | `/api/admin/auth` | 7 days |

**Note on SameSite**: In the current setup, cookies use `SameSite=Strict`. For cross-origin (GitHub Pages → ngrok), this requires `SameSite=None` to work in some browsers. If cookie transmission fails, change to `SameSite: 'none'` in production:

```typescript
res.cookie('access_token', token, {
  httpOnly: true,
  secure: true,              // Required when SameSite=None
  sameSite: 'none',          // Allows cross-origin cookie transmission
  path: '/',
  maxAge: 15 * 60 * 1000,
});
```

### Secure Flag

- The `Secure` flag is enabled when `NODE_ENV=production`
- ngrok provides HTTPS termination, so `Secure` cookies work correctly
- In local development (`http://localhost`), `Secure` is disabled to allow HTTP

### Frontend Requirements

Every Axios request must include `withCredentials: true`:

```typescript
const apiClient = axios.create({
  withCredentials: true,
  // ...
});
```

This tells the browser to send cookies with cross-origin requests.

### Auth Flow

```
1. User visits https://ashup1711.github.io/rrfashion/
2. App loads, calls /api/auth/me (cookie sent automatically)
3. If cookie is valid → user data returned → app shows authenticated UI
4. If cookie is invalid/expired → 401 response → app shows login page
5. User logs in → backend sets access_token + refresh_token cookies
6. App calls /api/auth/me again → 200 → user is authenticated
```

---

## Environment Setup (Development vs Production)

### Development

```bash
# Frontend
cd frontend
npm run dev
# → http://localhost:5173

# Backend
cd backend
npm run start:dev
# → http://localhost:3000
```

In development:
- No ngrok needed
- No HTTPS needed
- `VITE_API_URL=http://localhost:3000/api`
- CORS allows all origins (`origin: true`)
- Cookies: `Secure=false`, `SameSite=Strict` (same-origin requests)

### Production

```bash
# Frontend (deployed via GitHub Actions)
VITE_API_URL=https://xxxx.ngrok.io/api

# Backend (Docker Compose on Mac Mini)
NODE_ENV=production
CORS_ORIGINS=https://ashup1711.github.io,https://xxxx.ngrok.io
```

In production:
- ngrok provides HTTPS tunnel
- Cookies: `Secure=true`, `SameSite=Strict` (or `None`)
- CORS origin must exactly match the GitHub Pages URL

### Troubleshooting Cookie Auth

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| 401 on every request | Cookies not being sent | Check `withCredentials: true` on Axios |
| No `Set-Cookie` headers | CORS missing credentials | Check `Access-Control-Allow-Credentials: true` |
| Cookies not stored | `Secure` flag on HTTP | Use HTTPS (ngrok in prod, or localhost in dev) |
| CORS error in console | Origin not in allowlist | Add GitHub Pages URL to `CORS_ORIGINS` |
| Blank screen after login | HashRouter redirect issue | Use `window.location.href = '/rrfashion/#/...'` |
| `SameSite` cookie blocked | Cross-origin with `Strict` | Change to `SameSite: 'none'` in production |

---

## CI/CD Pipeline

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌─────────────┐
│   Push   │───►│   Lint   │───►│   Test   │───►│    Build    │
│ to main  │    │ npm run  │    │ npm test │    │ npm run     │
│          │    │ lint     │    │          │    │ build       │
└──────────┘    └──────────┘    └──────────┘    └──────┬──────┘
                                                        │
                                                        ▼
                                               ┌──────────────┐
                                               │   Deploy to  │
                                               │  GitHub Pages│
                                               │  (gh-pages   │
                                               │   branch)    │
                                               └──────────────┘
```

### GitHub Actions Workflow

```yaml
name: Deploy Frontend

on:
  push:
    branches: [main]
    paths:
      - 'frontend/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: frontend

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json

      - run: npm ci
      - run: npm run lint
      - run: npm test
      - run: npm run build
        env:
          VITE_API_URL: ${{ secrets.VITE_API_URL }}

      - uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: frontend/dist
          publish_branch: gh-pages
```

---

## Security Considerations

1. **JWT secrets**: Use strong, unique secrets for `JWT_SECRET` and `JWT_ADMIN_SECRET`
2. **Cookie theft**: HTTP-Only and Secure flags prevent JavaScript access and man-in-the-middle
3. **CSRF protection**: SameSite=Strict prevents cross-site request forgery
4. **ngrok**: Uses TLS encryption, but the tunnel endpoint is publicly accessible — use authentication tokens
5. **MinIO**: Secure with access/secret keys; do not expose the console port publicly
6. **Database**: PostgreSQL port should not be exposed outside Docker network
