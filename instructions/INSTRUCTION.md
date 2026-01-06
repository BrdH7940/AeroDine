# AeroDine - Quick Start

## Setup

```bash
# Prerequisites: Node.js 20+

# Clone & Install
git pull origin main
cd AeroDine
npm install -g pnpm # Sử dụng pnpm thay cho npm
pnpm install

# Build shared-types (if error)
pnpm --filter shared-types build
```

## Environment Variables

**Backend** - Tạo `backend/.env` (copy từ `backend/.env.example`):

```env
PORT=3000
NODE_ENV=development
DATABASE_URL=postgresql://user:password@host:port/db?sslmode=require
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:5173
```

**Frontend** - Tạo `frontend/.env.local`:

```env
VITE_API_BASE_URL=http://localhost:3000/api
VITE_SOCKET_URL=http://localhost:3000
```

## Prisma Setup

```bash
cd backend
pnpm install
npx prisma generate
```

## Run

```bash
pnpm --filter backend run start:dev  # Terminal 1
pnpm --filter frontend run dev       # Terminal 2
```

**URLs:**

-   Backend: `http://localhost:3000/api`
-   Frontend: `http://localhost:5173`
