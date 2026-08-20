# Real-time Auction Platform

Portfolio project for a real-time auction and flash sale platform.

## Project structure

- `client` - React, TypeScript and Vite frontend.
- `server` - Node.js, Express and TypeScript backend.
- `auction_platform_guide.md` - architecture and implementation plan.

## Requirements

- Node.js 22+
- npm 10+
- Docker Desktop (required for PostgreSQL and Redis in the next stage)

## Current setup

Frontend:

```powershell
cd client
npm install
npm run dev
```

Open `http://localhost:5173`.

Backend:

```powershell
cd server
npm install
npm run dev
```

Open `http://localhost:5000/api/health`.

## Environment variables

Copy `server/.env.example` to `server/.env` when local environment configuration is needed. Never commit `server/.env` or real credentials.

## Build checks

```powershell
cd client
npm run build

cd ..\server
npm run build
```

## Planned features

- PostgreSQL data model with Prisma.
- User authentication and balances.
- Auction and bid REST API.
- Redis locks, cache and rate limiting.
- Socket.IO live bid updates.
- BullMQ auction expiration jobs.
