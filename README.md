# RFQ System - TKMR

A comprehensive Request for Quotation (RFQ) system for TKMR, built as a monorepo with npm workspaces.

## 📋 Overview

This monorepo contains three interconnected packages:

- **Backend**: Node.js + TypeScript + Express API server
- **Frontend**: Quasar Framework + TypeScript + Vue 3 web application
- **Shared**: Common types and validation utilities

## 🏗️ Project Structure

```
rfq-system-tkmr/
├── backend/              # Express API server
│   ├── src/
│   │   ├── index.ts                # Main server entry point
│   │   ├── controllers/
│   │   │   ├── rfq.controller.ts   # RFQ CRUD and secure-link creation
│   │   │   └── secureLink.controller.ts # Secure-link retrieval logic
│   │   ├── routes/
│   │   │   ├── health.ts           # Legacy health router (deprecated)
│   │   │   ├── health.routes.ts    # Health check endpoints
│   │   │   ├── rfq.routes.ts       # RFQ REST API
│   │   │   └── secureLink.routes.ts# Secure-link lookup API
│   │   └── services/
│   │       ├── rfq.service.ts      # RFQ persistence + secure link binding
│   │       └── secureLink.service.ts # In-memory secure-link store & audit logs
│   ├── tests/
│   │   └── rfq.byToken.test.ts     # Jest + Supertest coverage for secure links
│   ├── package.json
│   └── tsconfig.json
├── frontend/             # Quasar web application
│   ├── src/
│   │   ├── main.ts      # Application entry point
│   │   ├── App.vue      # Root component
│   │   ├── layouts/     # Layout components
│   │   ├── pages/       # Page components (RFQ form)
│   │   ├── router/      # Vue Router configuration
│   │   └── css/         # Styles
│   ├── package.json
│   ├── tsconfig.json
│   └── quasar.config.js
├── shared/               # Shared types and utilities
│   ├── src/
│   │   ├── index.ts                 # Main exports (frontend-safe + backend helpers)
│   │   ├── types.ts                 # Global TypeScript response helpers
│   │   ├── types/secureLink.types.ts# Secure-link specific types
│   │   ├── schemas/                 # Zod schemas for RFQ + secure links
│   │   └── utils/                   # generateToken + validate middleware
│   ├── package.json
│   └── tsconfig.json
├── package.json          # Root workspace configuration
└── README.md
```

## 🚀 Getting Started

### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0

### Installation

Install all dependencies for all workspaces:

```bash
npm install
```

### Building

Build all packages:

```bash
npm run build
```

Build specific workspace:

```bash
npm run build --workspace=backend
npm run build --workspace=frontend
npm run build --workspace=shared
```

## 💻 Development

### Backend Development

Start the backend development server (ensure the shared package is built first):

```bash
cd shared
npm run build

cd ../backend
npm run dev
```

The API will be available at `http://localhost:3000`

#### Available Endpoints

- `GET /` - API information payload
- `GET /health` - Basic health check
- `GET /health/detailed` - Detailed health check
- `POST /api/rfq` - Create a new RFQ request
- `POST /api/rfq/:id/secure-link` - Generate a secure access link for an RFQ
- `GET /api/rfq/by-token/:token` - Retrieve an RFQ by secure token (used by frontend)
- `GET /api/secure/:token` - Secure-link RFQ retrieval with access logging

### Frontend Development

Start the frontend development server:

```bash
cd frontend
npm run dev
```

The application will be available at `http://localhost:9000`

### Shared Package Development

Build the shared package (required before running backend Jest tests or dev server):

```bash
cd shared
npm run build

# or watch for changes
npm run dev
```

## 📦 Workspaces

### Backend (@rfq-system-tkmr/backend)

Express API server with:
- TypeScript support
- `/health` endpoints for monitoring
- Secure-link lifecycle: creation, validation, audit logging
- RFQ submission + secure-link generation controllers
- Jest + Supertest test suite for secure-link retrieval
- CORS enabled and environment variable support

**Key Dependencies:**
- express
- cors
- dotenv
- @rfq-system-tkmr/shared

### Frontend (@rfq-system-tkmr/frontend)

Quasar Framework application with:
- Vue 3 + TypeScript
- Responsive RFQ form page + secure-link viewer
- Material Design components & global layouts
- Form validation backed by shared Zod schemas
- Success and error notifications

**Key Dependencies:**
- quasar
- vue
- vue-router
- pinia
- @rfq-system-tkmr/shared

### Shared (@rfq-system-tkmr/shared)

Common utilities and types:
- Zod schemas for RFQs, RFQ items, and secure links
- Secure-link types (`SecureLink`, `SecureLinkValidationResult`, etc.)
- Shared Axios validation helpers (`validate`)
- Cryptographically secure token generation helper (`generateToken`)

## 🧪 Testing

Run backend tests (Jest + Supertest):

```bash
# ensure shared has been built first
npm run build --workspace=shared
npm run test --workspace=backend
```

Frontend testing is not yet configured; placeholder scripts are present.

## 🔍 Linting

Lint all workspaces:

```bash
npm run lint
```

## 📝 Environment Variables

### Backend (.env)

Create a `.env` file in the `backend` directory:

```env
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:9000
```

## 🚢 Production Build

Build all packages for production:

```bash
npm run build
```

### Render Deployment

Render build command:

```bash
npm install --workspaces && npm run build --workspaces
```

Start the backend server:

```bash
cd backend
npm start
```

Build and serve the frontend:

```bash
cd frontend
npm run build
# Serve the dist folder with your preferred static file server
```

## 🔒 Security Notes

- The secure link functionality is currently a placeholder implementation
- In production, implement proper token generation with cryptographic libraries
- Add authentication and authorization middleware
- Validate all inputs on the backend
- Use environment variables for sensitive configuration
- Consider adding rate limiting and request validation

## 🛠️ Future Enhancements

- [x] Implement secure link generation with expiry and access logging
- [ ] Add database integration (PostgreSQL/MongoDB)
- [ ] Implement complete validation with Zod or Joi
- [ ] Add authentication system
- [ ] Create admin dashboard
- [ ] Add email notifications
- [ ] Implement file upload for attachments
- [ ] Add frontend unit and integration tests
- [ ] Set up CI/CD pipeline

## 📄 License

ISC

## 👥 Author

TKMR
