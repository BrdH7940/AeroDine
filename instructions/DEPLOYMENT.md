# Hướng Dẫn Deploy AeroDine

Deploy AeroDine lên các dịch vụ hosting miễn phí (không cần Docker).

## Tổng Quan

-   **Backend**: Render (free tier) - ⚠️ Sleep sau 15 phút không dùng
-   **Frontend**: Vercel (free tier) - ✅ Không sleep
-   **Database**: Render PostgreSQL hoặc Supabase (free tier)

---

## Bước 1: Deploy Backend trên Render

1. Đăng ký tại [render.com](https://render.com)
2. **New +** → **Web Service** → Connect GitHub repository
3. **Cấu hình:**

    - **Root Directory**: `.`
    - **Build Command**: `pnpm install && pnpm --filter shared-types build && pnpm --filter backend build`
    - **Start Command**: `cd backend && pnpm start:prod`
    - **Node Version**: `20`

4. **Environment Variables:**

    ```env
    NODE_ENV=production
    PORT=10000
    DATABASE_URL=<sẽ thêm sau>
    JWT_SECRET=<tạo secret key mạnh>
    JWT_EXPIRES_IN=7d
    CORS_ORIGIN=https://your-frontend.vercel.app
    # Cloudinary Configuration
    CLOUDINARY_CLOUD_NAME=<your-cloud-name>
    CLOUDINARY_API_KEY=<your-api-key>
    CLOUDINARY_API_SECRET=<your-api-secret>
    ```

5. Click **Create Web Service** → Lưu lại URL backend

---

## Bước 2: Setup Cloudinary

1. Đăng ký tại [cloudinary.com](https://cloudinary.com)
2. Tạo account miễn phí → Dashboard
3. Copy các thông tin sau:
   - **Cloud Name**: Tìm trong Dashboard
   - **API Key**: Settings → API Keys
   - **API Secret**: Settings → API Keys (click "Reveal")
4. Quay lại Render Backend Service → **Environment** → Thêm các biến:
   - `CLOUDINARY_CLOUD_NAME`
   - `CLOUDINARY_API_KEY`
   - `CLOUDINARY_API_SECRET`

**Lưu ý**: Cloudinary free tier cung cấp 25GB storage và 25GB bandwidth/tháng.

---

## Bước 3: Setup Database

### Option A: Neon (Recommended) ⭐

1. Đăng ký tại [neon.tech](https://neon.tech)
2. Tạo project → Chọn region và PostgreSQL version
3. Copy **Connection String** (sử dụng pooled connection cho production)
   - Format: `postgresql://user:pass@ep-xxx.region.aws.neon.tech/db?sslmode=require&pgbouncer=true`
4. Quay lại Render Backend Service → **Environment** → Cập nhật `DATABASE_URL`
5. Xem chi tiết tại [NEON_SETUP.md](./NEON_SETUP.md)

**Ưu điểm Neon:**
- ✅ Free tier tốt (3GB storage, auto-scaling)
- ✅ Serverless, không sleep như Render PostgreSQL
- ✅ Connection pooling built-in
- ✅ Dễ quản lý và monitor

### Option B: Render PostgreSQL

1. Render dashboard → **New +** → **PostgreSQL**
2. Chọn **Free** plan → **Create Database**
3. Copy **Internal Database URL** hoặc **External Database URL**
4. Quay lại Backend Service → **Environment** → Cập nhật `DATABASE_URL`

### Option C: Supabase

1. Đăng ký tại [supabase.com](https://supabase.com)
2. Tạo project → **Settings** → **Database** → Copy Connection String
3. Thêm vào `DATABASE_URL` trong Render Backend Service

---

## Bước 4: Deploy Frontend trên Vercel

1. Đăng ký tại [vercel.com](https://vercel.com)
2. **Add New** → **Project** → Import GitHub repository
3. **Cấu hình:**

    - **Framework Preset**: `Vite`
    - **Root Directory**: `.`
    - **Build Command**: `pnpm install && pnpm --filter shared-types build && pnpm --filter frontend build`
    - **Output Directory**: `frontend/dist`

4. **Environment Variables:**

    ```env
    VITE_API_BASE_URL=https://your-backend.onrender.com/api
    VITE_SOCKET_URL=https://your-backend.onrender.com
    ```

5. Click **Deploy** → Lưu lại URL frontend

---

## Bước 5: Cập Nhật CORS

1. Quay lại Render Backend Service → **Environment**
2. Cập nhật `CORS_ORIGIN` = URL frontend Vercel
3. **Save Changes** → Render tự động redeploy

---

## Kiểm Tra

-   Backend: `https://your-backend.onrender.com/api`
-   Frontend: `https://your-frontend.vercel.app`
-   Kiểm tra console (F12) không có lỗi

---

## Lưu Ý

-   **Render free tier**: Service sleep sau 15 phút → Dùng [UptimeRobot](https://uptimerobot.com) để ping mỗi 5 phút
-   **Neon database**: Auto-suspend sau 5 giờ không dùng (tự động wake khi có request)
-   **Build order**: `shared-types` → `backend` → `frontend`
-   **Frontend env vars**: Phải rebuild nếu thay đổi `VITE_*` variables
-   **CORS**: Đảm bảo `CORS_ORIGIN` không có trailing slash
-   **Database connection**: Sử dụng pooled connection (`&pgbouncer=true`) cho production

---

**Cần hỗ trợ?** Xem logs trong Render và Vercel dashboards.
