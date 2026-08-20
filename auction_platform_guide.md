# Real-time Auction & Flash Sale Platform
> **Architecture & 7-Day Implementation Guide**  
> Tech Stack: Node.js (Express + TypeScript), React (TypeScript + Vite), PostgreSQL (Prisma/Drizzle), Redis (BullMQ + Caching + Locks), Nginx (Reverse Proxy & WebSockets).

---

## 1. Project Overview & Architecture

### System Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React + TS)                    │
└──────────────────────────────┬──────────────────────────────┘
                               │ (HTTP / WebSocket)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                    Nginx (Reverse Proxy)                    │
│   • Serves static build files                               │
│   • Proxies /api/ requests to Express                       │
│   • Proxies /socket.io/ with WebSocket upgrade headers      │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│            Backend Monolith (Express + TS)                  │
│   • REST API + Zod Validation                               │
│   • Socket.IO Server (Real-time bid streaming)              │
│   • BullMQ Queue & Worker (Delayed auction expiration)      │
│   • Redis Lock / Atomic Bid Resolution                      │
└───┬─────────────────────────────────────────────────────┬───┘
    │                                                     │
    ▼                                                     ▼
┌────────────────────────┐              ┌────────────────────────┐
│  PostgreSQL (Database) │              │      Redis (Cache)     │
│  • Users & Balances    │              │  • Hot Price Cache     │
│  • Auctions / Items    │              │  • Mutex / Redis Locks │
│  • Bids History (Audit)│              │  • BullMQ Tasks        │
│  • Transactions        │              │  • Rate Limiting       │
└────────────────────────┘              └────────────────────────┘
```

---

## 2. Database Schema (PostgreSQL via Prisma ORM)

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum AuctionStatus {
  DRAFT
  ACTIVE
  FINISHED
  CANCELLED
}

model User {
  id           String        @id @default(uuid())
  email        String        @unique
  passwordHash String
  name         String
  balance      Decimal       @default(1000.00) @db.Decimal(12, 2)
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt

  bids         Bid[]
  wonAuctions  Auction[]     @relation("AuctionWinner")
  auctions     Auction[]     @relation("AuctionCreator")
}

model Auction {
  id           String        @id @default(uuid())
  title        String
  description  String
  imageUrl     String?
  startPrice   Decimal       @db.Decimal(12, 2)
  currentPrice Decimal       @db.Decimal(12, 2)
  minStep      Decimal       @default(5.00) @db.Decimal(12, 2)
  status       AuctionStatus @default(ACTIVE)
  expiresAt    DateTime
  createdAt    DateTime      @default(now())

  creatorId    String
  creator      User          @relation("AuctionCreator", fields: [creatorId], references: [id])

  winnerId     String?
  winner       User?         @relation("AuctionWinner", fields: [winnerId], references: [id])

  bids         Bid[]

  @@index([status, expiresAt])
}

model Bid {
  id        String   @id @default(uuid())
  amount    Decimal  @db.Decimal(12, 2)
  createdAt DateTime @default(now())

  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  auctionId String
  auction   Auction  @relation(fields: [auctionId], references: [id], onDelete: Cascade)

  @@index([auctionId, createdAt])
}
```

---

## 3. Infrastructure & Setup

### `docker-compose.yml`
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    container_name: auction_postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
      POSTGRES_DB: auction_db
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    container_name: auction_redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    volumes:
      - redisdata:/data

volumes:
  pgdata:
  redisdata:
```

### `nginx.conf` (Single Server Reverse Proxy)
```nginx
server {
    listen 80;
    server_name localhost;

    # Static Frontend
    location / {
        root /usr/share/nginx/html;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # REST API
    location /api/ {
        proxy_pass http://localhost:5000/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # WebSockets (Socket.IO)
    location /socket.io/ {
        proxy_pass http://localhost:5000/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

---

## 4. Step-by-Step 7-Day Implementation Plan

### Day 1: Project Setup, Database & Auth
- [ ] Initialize mono-repo structure: `/client` and `/server`.
- [ ] Spin up `postgres` and `redis` via `docker-compose.yml`.
- [ ] Setup Express + TypeScript boilerplate with `dotenv`, `cors`, and `helmet`.
- [ ] Configure Prisma ORM with PostgreSQL, create migrations and seed data.
- [ ] Implement Auth Module:
  - `POST /api/auth/register` (Password hashing with `bcrypt` or `argon2`).
  - `POST /api/auth/login` (Returns JWT token).
  - `GET /api/auth/me` (Protected middleware).

### Day 2: Core REST API & Validation
- [ ] Setup `Zod` schemas for request body validations.
- [ ] Implement Auction endpoints:
  - `GET /api/auctions` (Pagination, filtering by `status = ACTIVE`).
  - `GET /api/auctions/:id` (Auction details + top 10 latest bids).
  - `POST /api/auctions` (Create a new lot with start price, duration, min step).
- [ ] Implement centralized error handling middleware in Express.

### Day 3: Race Condition Prevention & Redis Integration
- [ ] Connect `ioredis` to the backend.
- [ ] Implement `POST /api/auctions/:id/bid` endpoint:
  - **Redis Mutex / Lock:** Acquire lock using `SET lock:auction:<id> <token> NX PX 2000`.
  - Check if `bidAmount >= currentPrice + minStep`.
  - Validate user balance (`user.balance >= bidAmount`).
  - Update cached price in Redis: `SET auction:<id>:price <bidAmount>`.
  - Release the lock.
  - Asynchronously/transactionally persist bid to PostgreSQL (`prisma.$transaction`).
- [ ] Implement IP / User rate-limiting via Redis (`express-rate-limit` + `rate-limit-redis`).

### Day 4: Real-time WebSockets & BullMQ Worker
- [ ] Integrate `Socket.IO` on Express server.
- [ ] Create socket rooms based on auction ID (`socket.join('auction:' + id)`).
- [ ] Broadcast event `auction:new_bid` whenever a valid bid is processed.
- [ ] Configure **BullMQ**:
  - When auction is created, schedule a delayed job: `auctionQueue.add('expire', { auctionId }, { delay: remainingTimeMs })`.
  - Worker processes expiration:
    1. Mark auction as `FINISHED` in PostgreSQL.
    2. Set winner and deduct balance.
    3. Emit `auction:ended` event via Socket.IO to the room.
    4. Invalidate Redis cache for this auction.

### Day 5: Frontend UI (React + TS + Tailwind)
- [ ] Bootstrap frontend with Vite + React + TypeScript + Tailwind CSS.
- [ ] Add state management (Zustand) & server queries (TanStack Query).
- [ ] Build **Auctions Feed**: Grid of auction cards with live countdown timers.
- [ ] Build **Auction Detail Page**:
  - Live price counter with visual pulse animation on price change.
  - Interactive quick-bid buttons (`+10₴`, `+50₴`, `+100₴`).
  - Live scrolling feed of recent bids with user avatars/timestamps.
  - Integrate `socket.io-client` with auto-reconnection and optimistic UI updates.

### Day 6: Nginx Integration & End-to-End Testing
- [ ] Configure local Nginx reverse proxy.
- [ ] Test WebSocket sticky sessions & upgrade headers through Nginx.
- [ ] Run concurrency testing: simulate 10 simultaneous bids hitting the same auction at the exact same millisecond to ensure no duplicate or lost updates occur.

### Day 7: Polish, Seed Scripts & Portfolio README
- [ ] Create demo seed script (`npm run seed`) creating live 5-minute auctions.
- [ ] Write a clean, high-impact `README.md`:
  - Architecture diagram (Mermaid.js).
  - List of problems solved (Race conditions, Distributed Locking, Delayed Queue Workers).
  - Quick-start guide (`docker-compose up` + single command dev start).
