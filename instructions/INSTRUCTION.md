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
# Server
PORT=3000
NODE_ENV=development

# Database
DATABASE_URL=postgresql://user:password@host:port/db?sslmode=require

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=7d

# Frontend
FRONTEND_URL=http://localhost:5173
CORS_ORIGIN=http://localhost:5173

# Stripe Payment (REQUIRED)
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# MoMo (Optional - Currently FROZEN)
# MOMO_PARTNER_CODE=
# MOMO_ACCESS_KEY=
# MOMO_SECRET_KEY=
```

**Lấy Stripe Keys:**
1. Đăng ký tại [https://dashboard.stripe.com](https://dashboard.stripe.com)
2. Vào **Developers** > **API keys** → Copy Secret key
3. Vào **Webhooks** → Tạo endpoint → Copy Signing secret

**Setup Ngrok cho Webhook:**
- Cài đặt: `choco install ngrok` hoặc download từ ngrok.com
- Chạy: `ngrok http 3000`
- Update Stripe Webhook URL: `https://your-ngrok-url.ngrok.io/api/payments/callback/stripe`

Xem chi tiết trong [BACKEND_SETUP_CHECKLIST.md](./BACKEND_SETUP_CHECKLIST.md)

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
