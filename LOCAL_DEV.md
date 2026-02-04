# RFQ System – Local Development (Production-ready)

## Stack
- WSL2 (Ubuntu)
- Node.js 20
- Neon PostgreSQL
- Prisma (deploy workflow)
- Quasar (frontend)
- Express + TypeScript (backend)

## Environment
- Backend: `http://localhost:5000`
- Frontend: `http://localhost:9000`
- Database: Neon (same as prod)

## Commands

### Install dependencies (root)
```bash
npm install
```

### Start backend
```bash
cd backend
npm run dev
```

### Start frontend
```bash
cd frontend
quasar dev
```

### Prisma (safe for production)
```bash
cd backend
npx prisma generate
npx prisma migrate deploy
```

⚠️ Do NOT use prisma migrate dev when connected to Neon.

## Repo structure

rfq-system-tkmr/
├── backend/
├── frontend/
├── shared/
├── netlify.toml
├── package.json
└── tsconfig.json



---

## 4 Backend environment file (Neon)

Create/update: `backend/.env`

```env
NODE_ENV=development
PORT=5000

# Neon (recommended to keep workflow production-ready)
# IMPORTANT: use sslmode=require
# IMPORTANT: do NOT use channel_binding=require
DATABASE_URL="postgresql://<user>:<password>@<neon-host>/<db>?sslmode=require"

# Frontend dev origin
CORS_ORIGINS="http://localhost:9000"

# Local admin key (matches production pattern; value can differ)
ADMIN_API_KEY="dev-admin-key"

# Drive OAuth (used by scripts/generateDriveToken.js)
DRIVE_OAUTH_REDIRECT_URI="http://localhost:3000/oauth2callback"
DRIVE_OAUTH_LOCAL_PORT=3000
```

## Frontend environment

Create/update: `frontend/.env.development`

```env
VITE_BACKEND_ORIGIN=http://localhost:5000
# VITE_BACKEND_ORIGIN=https://<your-codespace>-5000.app.github.dev
```
