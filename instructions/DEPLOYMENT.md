# AeroDine - Hướng Dẫn Deploy

## Tổng Quan

- **Backend**: Render (free tier)
- **Frontend**: Vercel (free tier)
- **Database**: Neon PostgreSQL (free tier)

## Bước 1: Setup Database (Neon)

1. Đăng ký tại [neon.tech](https://neon.tech)
2. Tạo project → Copy connection string
3. Format: `postgresql://user:pass@ep-xxx.region.aws.neon.tech/db?sslmode=require&pgbouncer=true`

## Bước 2: Deploy Backend (Render)

1. Đăng ký tại [render.com](https://render.com)
2. **New +** → **Web Service** → Connect GitHub repository
3. Cấu hình:
   - **Root Directory**: `.`
   - **Build Command**: `pnpm install && pnpm --filter shared-types build && pnpm --filter backend build`
   - **Start Command**: `cd backend && pnpm start:prod`
   - **Node Version**: `20`
4. Environment Variables:

   **Bắt buộc:**
   ```env
   NODE_ENV=production
   PORT=10000
   DATABASE_URL=<connection-string-từ-neon>
   JWT_SECRET=<tạo-secret-key-mạnh>
   JWT_EXPIRES_IN=7d
   CORS_ORIGIN=https://your-frontend.vercel.app
   ```

   **Tùy chọn (đề xuất):**
   ```env
   # Cloudinary (Upload ảnh)
   CLOUDINARY_CLOUD_NAME=<your-cloud-name>
   CLOUDINARY_API_KEY=<your-api-key>
   CLOUDINARY_API_SECRET=<your-api-secret>

   # Gemini AI (Gợi ý món ăn)
   GEMINI_API_KEY=<your-gemini-api-key>

   # Stripe (Thanh toán)
   STRIPE_SECRET_KEY=<your-stripe-secret-key>
   STRIPE_WEBHOOK_SECRET=<your-stripe-webhook-secret>

   # Email (Gửi thông báo)
   MAIL_HOST=smtp.gmail.com
   MAIL_PORT=587
   MAIL_USER=<your-email>
   MAIL_PASS=<your-app-password>
   MAIL_FROM=AeroDine Support <noreply@aerodine.com>
   ```

5. Lưu URL backend sau khi deploy

## Bước 3: Deploy Frontend (Vercel)

1. Đăng ký tại [vercel.com](https://vercel.com)
2. **Add New** → **Project** → Import GitHub repository
3. Cấu hình:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `.`
   - **Build Command**: `pnpm install && pnpm --filter shared-types build && pnpm --filter frontend build`
   - **Output Directory**: `frontend/dist`
4. Environment Variables:
   ```env
   VITE_API_BASE_URL=https://your-backend.onrender.com/api
   VITE_SOCKET_URL=https://your-backend.onrender.com
   ```
5. Lưu URL frontend sau khi deploy

## Bước 4: Cập Nhật CORS

1. Quay lại Render Backend → **Environment**
2. Cập nhật `CORS_ORIGIN` = URL frontend Vercel (không có trailing slash)
3. **Save Changes** → Render tự động redeploy

## Kiểm Tra

- Backend: `https://your-backend.onrender.com/api/health`
- Frontend: `https://your-frontend.vercel.app`
- Kiểm tra console (F12) không có lỗi

## Lưu Ý

- **Render free tier**: Sleep sau 15 phút → Dùng [UptimeRobot](https://uptimerobot.com) ping mỗi 5 phút.
- **Database connection**: Dùng pooled connection (`&pgbouncer=true`) cho production.
- **Frontend env vars**: Phải rebuild frontend nếu thay đổi `VITE_*` variables.
- **Build order**: `shared-types` → `backend` → `frontend`.
