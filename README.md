# AI Project Management SaaS

Phase 1 establishes the basic backend foundation for the AI Project Management SaaS.

## Current tech stack

- JavaScript
- Node.js
- Express.js
- MongoDB
- Mongoose
- dotenv

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a local environment file from the example:

   ```bash
   copy .env.example .env
   ```

3. Update the required variables in `.env` with your MongoDB connection string and JWT settings.

## Required environment variables

| Variable | Description |
| --- | --- |
| `PORT` | Port for the HTTP server. Defaults to `5000` if omitted. |
| `MONGODB_URI` | MongoDB connection URI used by Mongoose. |
| `JWT_SECRET` | Long, random secret used to sign login tokens. |
| `JWT_EXPIRES_IN` | JWT lifetime, for example `1d`. |

## Run the server

For development with automatic restarts:

```bash
npm run dev
```

For production:

```bash
npm start
```

The server connects to MongoDB before it begins listening for HTTP requests.

## Backend Docker (local)

Run these commands from the repository root. Docker Desktop must use Linux
containers. The image contains only the backend and production dependencies;
run the normal test suite on the host with `npm.cmd test` (Windows).

Use the existing root `.env` for runtime configuration; it is excluded from the
build context and image. Use Docker env-file syntax (`NAME=value`, without shell
expansion or surrounding quotes). Required variables are `MONGODB_URI` (MongoDB
Atlas), `JWT_SECRET`, `JWT_EXPIRES_IN`, `GEMINI_API_KEY`, `EMBEDDING_MODEL`, and
`FRONTEND_ORIGIN`. `GEMINI_MODEL` retains the application's default when omitted.
Keep credentials private. No local MongoDB service or volume is needed.

```powershell
docker build -t ai-project-management-backend:local .
docker run -d --name ai-pm-backend-local --env-file .env -e NODE_ENV=production -e PORT=5000 -p 127.0.0.1:5000:5000 ai-project-management-backend:local
Invoke-RestMethod http://127.0.0.1:5000/api/health
docker restart ai-pm-backend-local
docker stop ai-pm-backend-local
docker rm ai-pm-backend-local
```

The local run command explicitly selects port 5000 and production mode. A hosting
platform can inject its own `PORT`; `EXPOSE 5000` is documentation, not a runtime
restriction. If host port 5000 is occupied, use `-p 127.0.0.1:5001:5000` and check
health on host port 5001. The server connects to Atlas before becoming reachable;
Atlas network access must permit the machine's outbound connection. The health
endpoint reports HTTP availability, not a continuous database readiness check.
The existing CORS origin configuration is preserved.

## Deployment configuration (not deployed)

The intended hosts are Vercel for `frontend/`, Render for the existing backend
Dockerfile, and MongoDB Atlas. These settings prepare a future manual deployment;
the GitHub Actions workflow only validates code and builds an image.

### Render backend

- Use a Docker web service with repository root as the build context and
  `./Dockerfile` as the Dockerfile path. Keep its existing startup command.
- Let Render supply `PORT`; do not copy the local port setting into Render.
  The server listens on all interfaces and connects to Atlas before listening.
- Set the health check path to `/api/health`. It returns `{ "status": "ok" }`
  for HTTP availability; it does not continuously check database readiness.
- Supply runtime configuration through Render environment settings. Required
  names: `MONGODB_URI`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `GEMINI_API_KEY`,
  `EMBEDDING_MODEL`, `FRONTEND_ORIGIN`. Set `NODE_ENV` to `production`.
  `GEMINI_MODEL` is optional and retains the application default if omitted.
- Use the Atlas connection string and permit the selected Render service's
  outbound connections in Atlas during actual deployment. No database service,
  disk, or Docker volume is required; uploads are processed in memory.

No `render.yaml` is needed for this single service. Manual settings avoid choosing
a service name, region, plan, or deployment automation before hosting is created.

### Vercel frontend

- Set Root Directory to `frontend`, Framework Preset to Vite, Node.js to 24.x,
  Install Command to `npm ci`, Build Command to `npm run build`, and Output
  Directory to `dist` (relative to the frontend root).
- Set the public `VITE_API_URL` at build time. Rebuild after changing it.
  Never provide MongoDB, JWT, Gemini, or deployment secrets to the frontend;
  `VITE_` variables are visible to browsers.
- `frontend/vercel.json` provides the SPA fallback for BrowserRouter deep links
  such as `/dashboard`, `/projects/:id`, and `/notifications`. Existing static
  files are served normally. API requests use the separate configured backend
  URL; this rewrite does not proxy them.

| Setting | Local development | Future production setting |
| --- | --- | --- |
| Frontend `VITE_API_URL` | `http://localhost:5000/api` | `<Render backend HTTPS URL>/api` |
| Backend `FRONTEND_ORIGIN` | `http://localhost:5173` | `<Vercel frontend HTTPS origin>` |

The angle-bracket entries describe values to supply later, not literal settings.
CORS permits the single configured origin and requests without an Origin header;
other browser origins receive no CORS permission. Preview/custom domains are not
automatically allowed. JWTs remain in browser localStorage and travel in the
Authorization Bearer header; no session cookies or credential-mode changes are
needed for HTTPS between these two hosts.

### Proxy verification before public use

Express currently leaves `trust proxy` disabled. With Express 4.22.2 and
express-rate-limit 8.7.0, the login/register limiter uses `req.ip`; behind a proxy
this can group users under the proxy IP. The AI limiter primarily uses user IDs.
Do not treat the current proxy configuration as approved for public traffic.
During actual Render setup, verify the forwarding chain and header sanitization,
then configure the narrowest verified proxy trust before the limiters. Do not
blindly enable `trust proxy: true` or guess a hop count. Verify distinct clients
have separate limits and forged forwarding headers cannot bypass them. This
change is deferred until that topology can be verified; local behavior stays
unchanged. The existing limiter store is per process, so multiple replicas would
also need a separate rate-limit design review before scaling.

References: [Vercel Vite SPA routing](https://vercel.com/docs/frameworks/frontend/vite),
[Render web services](https://render.com/docs/web-services),
[Express proxy trust](https://expressjs.com/en/guide/behind-proxies.html), and
[rate-limit proxy guidance](https://express-rate-limit.mintlify.app/guides/troubleshooting-proxy-issues).

## Health check

`GET /api/health`

Example response:

```json
{
  "status": "ok"
}
```
