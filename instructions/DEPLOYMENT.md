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
    ```

5. Click **Create Web Service** → Lưu lại URL backend

---

## Bước 2: Setup Database

### Option A: Render PostgreSQL

1. Render dashboard → **New +** → **PostgreSQL**
2. Chọn **Free** plan → **Create Database**
3. Copy **Internal Database URL** hoặc **External Database URL**
4. Quay lại Backend Service → **Environment** → Cập nhật `DATABASE_URL`

### Option B: Supabase

1. Đăng ký tại [supabase.com](https://supabase.com)
2. Tạo project → **Settings** → **Database** → Copy Connection String
3. Thêm vào `DATABASE_URL` trong Render Backend Service

---

## Bước 3: Deploy Frontend trên Vercel

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

## Bước 4: Cập Nhật CORS

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
-   **Build order**: `shared-types` → `backend` → `frontend`
-   **Frontend env vars**: Phải rebuild nếu thay đổi `VITE_*` variables
-   **CORS**: Đảm bảo `CORS_ORIGIN` không có trailing slash

---

**Cần hỗ trợ?** Xem logs trong Render và Vercel dashboards.
