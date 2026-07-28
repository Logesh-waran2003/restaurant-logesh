# Restaurant Logesh

Smart Restaurant Management System — real-time ordering, kitchen display, POS, and admin dashboard.

## Tech Stack

- **Frontend:** React 19, Vite, TailwindCSS 4, Zustand, React Query, Socket.IO Client, Framer Motion
- **Backend:** Express, Socket.IO, Prisma, IoRedis, Zod
- **Database:** PostgreSQL 16, Redis 7
- **Payments:** Razorpay
- **Infra:** pnpm workspaces, Turborepo, Docker Compose

## Quick Start

### Prerequisites

- Node.js 20+
- pnpm 9+
- Docker & Docker Compose

### Setup

```bash
pnpm install
cp .env.example .env          # edit with your values
docker compose up -d postgres redis
pnpm db:push
pnpm dev
```

API runs on http://localhost:4000, Web on http://localhost:5173.

## Project Structure

```
restaurant-logesh/
├── apps/
│   ├── api/          # Express + Socket.IO backend
│   └── web/          # React SPA (Vite)
├── packages/
│   ├── db/           # Prisma schema + client
│   ├── shared/       # Types, constants, validators
│   └── ui/           # Shared React components + cn utility
├── docker-compose.yml
├── turbo.json
└── package.json
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start all apps in dev mode |
| `pnpm build` | Build all packages and apps |
| `pnpm db:generate` | Generate Prisma client |
| `pnpm db:push` | Push schema to database |
| `pnpm db:migrate` | Run Prisma migrations |

## Environment Variables

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/restaurant
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret-here
RAZORPAY_KEY_ID=your-razorpay-key
RAZORPAY_KEY_SECRET=your-razorpay-secret
PORT=4000
```

## Application Surfaces

| Surface | Route | Purpose |
|---------|-------|---------|
| Customer | `/order/:tableId` | QR-based menu browsing & ordering |
| KDS | `/kds` | Kitchen Display System for cooks |
| POS | `/pos` | Point of Sale for cashiers |
| Admin | `/admin` | Restaurant management dashboard |
