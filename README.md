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

## Health check

`GET /api/health`

Example response:

```json
{
  "status": "ok"
}
```
