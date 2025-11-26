# Deploying the RFQ Backend to Render (Free Tier)

Render can host the backend service as a free Web Service. Follow the steps below to prepare, build, and deploy the project.

## 1. Prerequisites

- Render account (free tier is sufficient).
- GitHub repository connected to Render.
- A deployed frontend URL (e.g. Quasar SPA on Render, Netlify, or Vercel) to use for CORS.

## 2. Repository Setup

The backend lives in the `backend/` workspace. Render will automatically run commands from that folder when you set the build and start scripts.

Recommended Render service settings:

| Setting              | Value                                      |
|----------------------|---------------------------------------------|
| Environment          | Node                                        |
| Region               | (closest to users)                           |
| Branch               | `main` (or your production branch)          |
| Root Directory       | `backend`                                   |
| Build Command        | `npm install && npm run build`              |
| Start Command        | `npm start`                                 |
| Instance Type        | Free (suspend on inactivity)                |

## 3. Environment Variables

Configure the following variables in Render’s **Environment** tab:

| Key                      | Example Value                                      | Notes |
|--------------------------|----------------------------------------------------|-------|
| `NODE_ENV`               | `production`                                       | Ensures production logging/behaviour |
| `PORT`                   | `10000` (Render injects this automatically)        | Keep placeholder in `.env`, Render overrides it |
| `FRONTEND_URL`           | `https://your-frontend-domain.onrender.com`        | Used to build secure link URLs |
| `CORS_ORIGINS`           | `https://your-frontend-domain.onrender.com`        | Comma-separated list of allowed origins |
| `SECURE_LINK_TTL_MINUTES`| `10080`                                            | Default 7 day expiry |

> Render sets the `PORT` environment variable automatically. The server reads it and falls back to `5000` when not provided, so no code adjustments are required.

## 4. Build Output

After running `npm run build` Render expects the compiled files under `backend/dist/`. The relevant structure:

```
backend/
├── dist/
│   ├── index.js        # Compiled server entry point
│   ├── controllers/
│   ├── routes/
│   ├── services/
│   └── ...
├── package.json
├── tsconfig.json
└── src/
```

Ensure `tsconfig.json` continues to emit JavaScript into `dist/` and that `npm start` executes `node dist/index.js`.

## 5. Enabling CORS for the Frontend Domain

1. Set `CORS_ORIGINS` in Render’s Environment tab to the fully qualified frontend URL (multiple origins comma-separated).
2. The server reads `CORS_ORIGINS` and restricts CORS to those values. If the variable is omitted, all origins are allowed (development default).
3. If the frontend domain changes, update `CORS_ORIGINS` and redeploy.

## 6. Deployment Flow

1. Push your changes to the configured branch.
2. Render detects the push, runs `npm install && npm run build` in `backend/`.
3. Render starts the service with `npm start`.
4. Verify deployment in Render logs — you should see:
   ```
   🚀 RFQ System backend ready
      Environment : production
      Listening   : 0.0.0.0:<port>
      Health      : /health
      Secure API  : /api/secure
      CORS origin : https://your-frontend-domain.onrender.com
   ```
5. Test the `/health` endpoint and a secure link request using the deployed URL.

## 7. Future Enhancements

- Configure Render’s **Health Check Path** to `/health` for automated restarts.
- Add background jobs or cron tasks later using Render cron jobs if needed.
- Monitor logs using Render’s built-in logging tab, or export to an external provider.

Happy deploying!
