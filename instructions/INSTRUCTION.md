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

**Backend** - Tạo `backend/.env`:

```env
PORT=3000
NODE_ENV=development
# Neon PostgreSQL Connection String
# Xem chi tiết tại instructions/NEON_SETUP.md để lấy connection string từ Neon Console
# Format: postgresql://user:password@ep-xxx-xxx.region.aws.neon.tech/dbname?sslmode=require&pgbouncer=true
DATABASE_URL=postgresql://user:password@ep-xxx-xxx.region.aws.neon.tech/dbname?sslmode=require&pgbouncer=true
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:5173
# Cloudinary Configuration
# Đăng ký tại https://cloudinary.com để lấy thông tin
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

**Lưu ý**: Để lấy connection string từ Neon Console, xem hướng dẫn chi tiết tại [NEON_SETUP.md](./NEON_SETUP.md).

**Frontend** - Tạo `frontend/.env.local`:

```env
VITE_API_BASE_URL=http://localhost:3000/api
VITE_SOCKET_URL=http://localhost:3000
```

## Database Setup (Neon)

1. **Tạo Neon Database**:
   - Đăng ký tại [neon.tech](https://neon.tech)
   - Tạo project mới
   - Copy connection string
   - Xem hướng dẫn chi tiết tại [NEON_SETUP.md](./NEON_SETUP.md)

2. **Cấu hình Prisma**:
```bash
cd backend
pnpm install

# Generate Prisma Client
npx prisma generate

# Run migrations (sau khi đã cấu hình DATABASE_URL trong .env)
npx prisma migrate deploy
# OR for development
npx prisma migrate dev
```

## Run

```bash
pnpm --filter backend run start:dev  # Terminal 1
pnpm --filter frontend run dev       # Terminal 2
```

**URLs:**

-   Backend: `http://localhost:3000/api`
-   Frontend: `http://localhost:5173`
