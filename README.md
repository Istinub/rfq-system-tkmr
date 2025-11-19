# RFQ System - TKMR

A monorepo system for Request For Quotation (RFQ) management for TKMR company.

## 📋 Overview

This is a full-stack monorepo starter project that includes:
- **Backend**: Node.js + TypeScript + Express API server
- **Frontend**: Quasar + TypeScript for UI
- **Shared**: Common types and validation using Zod

## 🏗️ Project Structure

```
rfq-system-tkmr/
├── backend/                 # Backend API server
│   ├── src/
│   │   ├── controllers/    # Request handlers
│   │   ├── routes/         # API routes
│   │   ├── services/       # Business logic
│   │   └── index.ts        # Entry point
│   ├── package.json
│   └── tsconfig.json
├── frontend/               # Quasar frontend app
│   ├── src/
│   │   ├── components/    # Vue components
│   │   ├── layouts/       # Layout components
│   │   ├── pages/         # Page components
│   │   ├── router/        # Vue Router config
│   │   ├── services/      # API service wrapper
│   │   └── main.ts        # Entry point
│   ├── package.json
│   ├── quasar.config.js
│   └── tsconfig.json
├── shared/                 # Shared types and validation
│   ├── src/
│   │   ├── types.ts       # TypeScript types & Zod schemas
│   │   ├── validation.ts  # Validation utilities
│   │   └── index.ts       # Exports
│   ├── package.json
│   └── tsconfig.json
└── package.json            # Root package with workspaces
```

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm (v9 or higher)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/Istinub/rfq-system-tkmr.git
cd rfq-system-tkmr
```

2. Install all dependencies:
```bash
npm install
```

This will install dependencies for all workspaces (backend, frontend, and shared).

### Running the Application

#### Development Mode

Run backend and frontend together:

```bash
# Terminal 1 - Backend (runs on port 3000)
npm run dev:backend

# Terminal 2 - Frontend (runs on port 9000)
npm run dev:frontend
```

Or run them individually:
```bash
npm run dev:backend   # Start backend server
npm run dev:frontend  # Start frontend dev server
```

#### Building for Production

Build all packages:
```bash
npm run build
```

Or build individually:
```bash
npm run build:shared    # Build shared package first
npm run build:backend   # Build backend
npm run build:frontend  # Build frontend
```

Start production backend:
```bash
cd backend
npm start
```

## 📦 Packages

### Backend (@rfq-system/backend)

Node.js + TypeScript + Express API server with:
- Health check endpoint (`GET /api/health`)
- RFQ creation endpoint (`POST /api/rfq`)
- Secure link generation (`POST /api/rfq/:id/secure-link`)
- Request validation using Zod
- CORS enabled
- Environment configuration

**Key Features:**
- Clean API structure with controllers, routes, and services
- Placeholder for secure RFQ link generation
- Type-safe request/response handling

### Frontend (@rfq-system/frontend)

Quasar + Vue 3 + TypeScript application with:
- Simple RFQ submission form
- Material Design UI
- API service wrapper for backend communication
- Form validation
- Responsive layout

**Key Features:**
- Clean component structure
- Reusable API service
- Type-safe with shared types
- Proxy configuration for API calls

### Shared (@rfq-system/shared)

Shared TypeScript types and Zod validation schemas:
- RFQ types
- RFQ Item types
- Secure Link types
- Health Check types
- Validation utilities

**Benefits:**
- Single source of truth for types
- Runtime validation with Zod
- Type safety across frontend and backend

## 🔧 Configuration

### Backend Configuration

Create `.env` file in `backend/` directory (see `.env.example`):
```env
PORT=3000
NODE_ENV=development
```

### Frontend Configuration

The frontend is configured to proxy API requests to `http://localhost:3000` in development mode. See `frontend/quasar.config.js` for configuration.

## 📝 API Endpoints

### Health Check
```
GET /api/health
Response: { status: 'ok', timestamp: '...', version: '1.0.0' }
```

### Create RFQ
```
POST /api/rfq
Body: {
  companyName: string,
  contactPerson: string,
  email: string,
  phone?: string,
  items: Array<{
    description: string,
    quantity: number,
    unit: string
  }>,
  notes?: string
}
Response: { message: '...', data: { id, ...rfq } }
```

### Generate Secure Link
```
POST /api/rfq/:id/secure-link
Response: { 
  message: '...', 
  data: { token, rfqId, expiresAt } 
}
```

## 🧪 Development

### Adding Dependencies

Add to specific workspace:
```bash
npm install <package> --workspace=backend
npm install <package> --workspace=frontend
npm install <package> --workspace=shared
```

### Linting

Run linters for all workspaces:
```bash
npm run lint
```

### Testing

Run tests for all workspaces:
```bash
npm run test
```

## 🛠️ Tech Stack

### Backend
- Node.js
- TypeScript
- Express
- Zod (validation)
- CORS

### Frontend
- Vue 3
- Quasar Framework
- TypeScript
- Axios
- Vue Router

### Shared
- TypeScript
- Zod

## 📄 License

ISC

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📧 Contact

For questions or support, please contact the TKMR team.
