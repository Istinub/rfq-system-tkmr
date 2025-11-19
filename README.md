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
│   │   ├── index.ts     # Main server entry point
│   │   └── routes/
│   │       ├── health.ts    # Health check endpoints
│   │       └── secure.ts    # Secure link API (placeholder)
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
│   │   ├── index.ts     # Main exports
│   │   ├── types.ts     # TypeScript interfaces
│   │   └── validation.ts # Validation utilities (placeholder)
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

Start the backend development server:

```bash
cd backend
npm run dev
```

The API will be available at `http://localhost:3000`

#### Available Endpoints

- `GET /` - API information
- `GET /health` - Basic health check
- `GET /health/detailed` - Detailed health check
- `POST /api/secure/generate-link` - Generate secure RFQ link (placeholder)
- `GET /api/secure/verify/:token` - Verify secure token (placeholder)
- `POST /api/secure/submit/:token` - Submit RFQ via secure link (placeholder)

### Frontend Development

Start the frontend development server:

```bash
cd frontend
npm run dev
```

The application will be available at `http://localhost:9000`

### Shared Package Development

Build shared package in watch mode:

```bash
cd shared
npm run dev
```

## 📦 Workspaces

### Backend (@rfq-system-tkmr/backend)

Express API server with:
- TypeScript support
- `/health` endpoint for monitoring
- Secure link API placeholder for future RFQ submission
- CORS enabled
- Environment variable support

**Key Dependencies:**
- express
- cors
- dotenv
- @rfq-system-tkmr/shared

### Frontend (@rfq-system-tkmr/frontend)

Quasar Framework application with:
- Vue 3 + TypeScript
- Responsive RFQ form page
- Material Design components
- Form validation
- Success notifications

**Key Dependencies:**
- quasar
- vue
- vue-router
- pinia
- @rfq-system-tkmr/shared

### Shared (@rfq-system-tkmr/shared)

Common utilities and types:
- TypeScript type definitions for RFQ entities
- Validation utilities (placeholder for Zod/Joi)
- Shared interfaces between frontend and backend

## 🧪 Testing

Run tests for all workspaces:

```bash
npm test
```

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

- [ ] Implement proper secure link generation with expiry
- [ ] Add database integration (PostgreSQL/MongoDB)
- [ ] Implement complete validation with Zod or Joi
- [ ] Add authentication system
- [ ] Create admin dashboard
- [ ] Add email notifications
- [ ] Implement file upload for attachments
- [ ] Add unit and integration tests
- [ ] Set up CI/CD pipeline

## 📄 License

ISC

## 👥 Author

TKMR
