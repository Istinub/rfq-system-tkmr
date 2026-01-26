# RFQ System - TKMR

Monorepo for TKMR's Request for Quotation system.

## Overview
- Backend: Express + TypeScript + Prisma + PostgreSQL.
- Frontend: Quasar/Vue 3 SPA (hash mode) with `/api` calls proxied during dev.
- Secure links: 64-character hex tokens, default 7-day expiry, optional one-time use.
- Attachments: Stored in Google Drive; when `DRIVE_PUBLIC_FILES=true`, uploaded files get anyone-with-link read access.
- Admin UI: Uses `x-api-key` (stored in localStorage in the frontend) to access `/api/admin/*` endpoints.

## Stack & Ports
- Backend default port: `5000` (`PORT` env overrides). Binds to `0.0.0.0`.
- Frontend dev server: `9000` with proxy of `/api` → `http://localhost:5000`.
- Netlify build (hash SPA) serves the frontend; `/api/*` is proxied to Render via `frontend/netlify.toml`.

## Project Structure
```
rfq-system-tkmr/
├── netlify.toml                # Netlify build (frontend base)
├── backend/
│   ├── src/
│   │   ├── index.ts            # Express bootstrap, routes, CORS
│   │   ├── routes/
│   │   │   ├── health.routes.ts
│   │   │   ├── rfq.routes.ts
│   │   │   ├── rfq.byToken.routes.ts
│   │   │   ├── secureLink.routes.ts
│   │   │   ├── admin.routes.ts
│   │   │   └── drive.routes.ts
│   │   ├── controllers/        # RFQ, secure-link, admin logic (Prisma-backed)
│   │   ├── services/driveRfqStorage.service.ts # Drive upload helper
│   │   ├── lib/googleDrive.ts  # OAuth2 Drive client
│   │   ├── middleware/apiKeyAuth.ts
│   │   ├── middleware/rateLimiters.ts (defined, not currently mounted)
│   │   ├── middleware/ipThrottle.ts (defined, not currently mounted)
│   │   └── utils/generateToken.ts (32-byte → 64-hex generator)
│   ├── prisma/schema.prisma    # Postgres models for RFQs, tokens, logs
│   ├── RENDER_DEPLOYMENT.md
│   └── .env.example
├── frontend/
│   ├── quasar.config.js        # Hash router, dev proxy to :5000
│   ├── netlify.toml            # Proxy /api → Render backend
│   └── src/
│       ├── pages/RFQFormPage.vue
│       ├── pages/admin/*       # Admin dashboard pages
│       ├── layouts/AdminLayout.vue
│       └── services/
│           ├── api.ts          # RFQ + secure-link client
│           └── admin/adminApi.ts # Admin client (stores API key in localStorage, sets x-api-key)
└── shared/                     # Zod schemas and shared types
```

Legacy (present but unused): `backend/src/services/rfq.service.ts` and `backend/src/services/secureLink.service.ts` are in-memory prototypes; the live API uses Prisma controllers.

## Setup
### Prerequisites
- Node.js ≥ 18, npm ≥ 9
- PostgreSQL database

### Install dependencies
```bash
npm install
```

### Backend environment (.env in backend/)
```env
PORT=5000
NODE_ENV=development
CORS_ORIGINS=http://localhost:9000
DATABASE_URL=postgresql://user:pass@host:5432/db
ADMIN_API_KEY=change-me
DRIVE_CLIENT_ID=your-google-client-id
DRIVE_CLIENT_SECRET=your-google-client-secret
DRIVE_REFRESH_TOKEN=your-drive-refresh-token
DRIVE_FOLDER_ID=your-drive-folder-id
DRIVE_PUBLIC_FILES=false
REDIS_URL= # optional, used for Redis client/rate limit store (not mounted by default)
```

### Run in development
```bash
# Backend (port 5000)
cd backend
npm run dev

# Frontend (port 9000, proxies /api to 5000)
cd ../frontend
npm run dev
```

### Build
```bash
npm run build --workspaces
```

## API Endpoints (current)
- `GET /health`
- `GET /health/detailed`
- `POST /api/rfq`
- `POST /api/rfq/multipart`
- `GET /api/rfq`
- `GET /api/rfq/:id`
- `DELETE /api/rfq/:id`
- `GET /api/rfq/by-token/:token`
- `POST /api/secure-link/:rfqId`
- `GET /api/secure-link/:token`
- `POST /api/secure-link/invalidate/:token`
- `GET /api/drive/ping`
- `POST /api/drive/upload` (requires `x-admin-api-key` when `ADMIN_API_KEY` is set)
- Admin (`x-api-key` required):
  - `GET /api/admin/stats`
  - `GET /api/admin/rfqs`
  - `GET /api/admin/rfqs/:id`
  - `DELETE /api/admin/rfqs/:id`
  - `GET /api/admin/tokens`
  - `POST /api/admin/tokens/:id/disable`
  - `POST /api/admin/tokens/:id/regenerate`
  - `GET /api/admin/logs`
  - `GET /api/admin/settings`
  - `POST /api/admin/settings`

## Security Notes (current state)
- Secure links are real Prisma records with 64-hex tokens, 7-day default expiry, optional one-time access; invalid/expired/disabled links return 404/410 and log access attempts.
- RFQ creation and secure-link creation endpoints are unauthenticated. Admin routes are protected by `x-api-key`; missing `ADMIN_API_KEY` causes admin routes to return 503.
- Drive uploads require `x-admin-api-key` if `ADMIN_API_KEY` is set; otherwise allowed (dev convenience).
- Rate limiter and IP throttle helpers exist but are not mounted in `src/index.ts`.

## Testing
- Backend `npm test` currently prints "Tests removed" (no automated coverage).
- Frontend has no tests configured.

## Deployment
- Frontend: Netlify SPA build (base `frontend/`, publish `dist/spa`, `quasar build`). Redirect all paths to `index.html`; `/api/*` rewrites to the Render backend per `frontend/netlify.toml`.
- Backend: Deploy as a Render web service from `backend/` (`npm install && npm run build`, `npm start`). Ensure it listens on `0.0.0.0:$PORT` (default fallback 5000).
- Database: Run Prisma migrations in production (e.g., `npx prisma migrate deploy` in `backend/`) before starting the service.

## Future Enhancements
- [x] Secure links with expiry and access logging (Prisma-backed)
- [x] PostgreSQL + Prisma persistence for RFQs and tokens
- [x] Admin dashboard with API-key auth
- [x] Google Drive attachment uploads
- [ ] Harden validation with Zod end-to-end
- [ ] Add authenticated RFQ creation flow
- [ ] Email notifications for generated links
- [ ] Frontend and backend test suites
- [ ] CI/CD pipeline

## License
ISC

## Author
TKMR
