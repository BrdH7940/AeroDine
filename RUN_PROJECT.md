# Hướng Dẫn Chạy Project AeroDine

## Yêu Cầu

-   Node.js >= 18.x
-   pnpm >= 8.x
-   PostgreSQL >= 14.x

## Quick Start

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Setup Database

```bash
# Tạo database PostgreSQL
createdb aerodine

# Tạo file .env trong backend/
cd backend
```

Tạo file `backend/.env`:

```env
DATABASE_URL="postgresql://username:password@localhost:5432/aerodine?schema=public"
JWT_SECRET="your-secret-key-change-this"
PORT=3000
NODE_ENV=development
```

```bash
# Generate Prisma Client & Run migrations
npx prisma generate
npx prisma migrate dev

# (Optional) Seed data
pnpm run seed
```

### 3. Chạy Backend (Terminal 1)

```bash
cd backend
pnpm run start:dev
```

→ http://localhost:3000/api  
→ Swagger: http://localhost:3000/api/docs

### 4. Chạy Frontend (Terminal 2)

```bash
cd frontend
pnpm run dev
```

→ http://localhost:5173

## Scripts Chính

### Backend

```bash
cd backend

pnpm run start:dev          # Development
pnpm run build              # Build production
pnpm run start:prod         # Production
pnpm run seed               # Seed database
npx prisma studio           # Database GUI
pnpm run lint               # Lint code
pnpm run kill:port          # Kill port 3000 (Windows)
```

### Frontend

```bash
cd frontend

pnpm run dev                # Development
pnpm run build              # Build production
pnpm run preview            # Preview build
pnpm run lint               # Lint code
```

## Troubleshooting

### Port 3000 đang được sử dụng

```bash
cd backend
pnpm run kill:port
# Hoặc manual:
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### Database connection error

```bash
# Test connection
psql -U username -d aerodine -h localhost

# Reset migrations (nếu cần)
npx prisma migrate reset
npx prisma migrate dev
```

### Module not found

```bash
# Reinstall
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

### Prisma Client not generated

```bash
cd backend
npx prisma generate
```

## URLs

-   Frontend: http://localhost:5173
-   Backend API: http://localhost:3000/api
-   Swagger Docs: http://localhost:3000/api/docs
-   Prisma Studio: `npx prisma studio` (từ backend/)
