# AeroDine - Hướng Dẫn Setup

## Yêu Cầu

- Node.js 20+
- PostgreSQL database (Neon, Supabase, hoặc local)
- pnpm

## Cài Đặt

```bash
# Cài đặt pnpm (nếu chưa có)
npm install -g pnpm

# Clone và cài đặt dependencies
git clone <repository-url>
cd AeroDine
pnpm install

# Build shared-types
pnpm --filter shared-types build
```

## Cấu Hình Backend

1. Tạo file `backend/.env`:

```env
# Server
PORT=3000
NODE_ENV=development

# Database (bắt buộc)
DATABASE_URL=postgresql://user:password@host:port/db?sslmode=require

# JWT (bắt buộc)
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=7d

# Frontend
FRONTEND_URL=http://localhost:5173
CORS_ORIGIN=http://localhost:5173

# Stripe (tùy chọn)
STRIPE_SECRET_KEY=sk_test_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx

# Cloudinary (tùy chọn)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Google OAuth (tùy chọn)
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback

# Email (tùy chọn)
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=your-email@gmail.com
MAIL_PASS=your-app-password
MAIL_FROM=AeroDine Support <noreply@aerodine.com>

# Gemini AI (tùy chọn)
GEMINI_API_KEY=your-gemini-api-key
```

2. Setup database:

```bash
cd backend
npx prisma generate
npx prisma migrate dev
```

3. Seed dữ liệu (tùy chọn):

```bash
pnpm seed
```

## Cấu Hình Frontend

1. Tạo file `frontend/.env.local`:

```env
VITE_API_BASE_URL=http://localhost:3000/api
VITE_SOCKET_URL=http://localhost:3000
```

## Chạy Project

```bash
# Backend (Terminal 1)
cd backend
pnpm run start:dev

# Frontend (Terminal 2)
cd frontend
pnpm run dev
```

**URLs:**
- Backend: `http://localhost:3000/api`
- Frontend: `http://localhost:5173`

## Lưu Ý

- Database URL phải có `sslmode=require` cho Neon/Supabase
- Nếu dùng Stripe webhook local, cần dùng ngrok: `ngrok http 3000`
- Build order: `shared-types` → `backend` → `frontend`
