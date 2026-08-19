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

## Health check

`GET /api/health`

Example response:

```json
{
  "status": "ok"
}
```
