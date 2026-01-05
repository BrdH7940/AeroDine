# AeroDine - Hướng Dẫn Phát Triển

## Chạy Dự Án Trên Môi Trường Development

### 1. Cài Đặt Prerequisites

-   **Node.js** (phiên bản 20 trở lên): https://nodejs.org/
-   **PNPM**: `npm install -g pnpm`
-   **Git**: Để clone repository

### 2. Clone và Cài Đặt Dependencies

```bash
git clone <repository-url>
cd AeroDine
pnpm install
```

**Lưu ý:** Nếu gặp lỗi về shared-types, chạy:

```bash
pnpm --filter shared-types build
```

### 3. Setup Environment Variables

#### Backend (`backend/.env`)

Tạo file `backend/.env`:

```env
PORT=3000
NODE_ENV=development
DATABASE_URL=postgresql://aerodine:aerodine_password@localhost:5432/aerodine
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:5173
```

#### Frontend (`frontend/.env.local`)

Tạo file `frontend/.env.local`:

```env
VITE_API_BASE_URL=http://localhost:3000/api
VITE_SOCKET_URL=http://localhost:3000
```

### 4. Setup Database

Cài đặt PostgreSQL/MySQL trên máy hoặc sử dụng managed database service (Render, Supabase, etc.), sau đó cập nhật `DATABASE_URL` trong `backend/.env`.

### 5. Chạy Dự Án

Mở 2 terminal riêng biệt:

**Terminal 1 - Backend:**

```bash
pnpm --filter backend run start:dev
```

Backend chạy tại: `http://localhost:3000/api`

**Terminal 2 - Frontend:**

```bash
pnpm --filter frontend run dev
```

Frontend chạy tại: `http://localhost:5173`

**Hoặc chạy song song:**

```bash
pnpm dev
```

### 6. Xác Thực

-   Backend: Mở `http://localhost:3000/api` trong browser
-   Frontend: Mở `http://localhost:5173` trong browser
-   Kiểm tra console không có lỗi

### Troubleshooting

-   **Port conflicts:** Thay đổi port trong `backend/src/main.ts` hoặc Vite config
-   **Module errors:** Chạy `pnpm --filter shared-types build` rồi restart
-   **CORS errors:** Kiểm tra `CORS_ORIGIN` trong `backend/.env` khớp với frontend URL

---

## Deployment (To be continued)

⚠️ **Lưu ý:** Phần này sẽ được cập nhật khi code hoàn thiện.

Khi deploy lên public hosting services (Render, Vercel, DigitalOcean, AWS, etc.), bạn cần chỉnh sửa/cấu hình các file sau:

### Files Cần Chỉnh Sửa:

1. **`backend/.env`** - Cấu hình biến môi trường production:

    - `DATABASE_URL` - Connection string đến production database
    - `JWT_SECRET` - Secret key mạnh cho production
    - `CORS_ORIGIN` - Domain frontend production
    - `NODE_ENV=production`

2. **`frontend/.env.local`** (hoặc biến môi trường trên hosting):

    - `VITE_API_BASE_URL` - URL backend production
    - `VITE_SOCKET_URL` - URL WebSocket production

3. **`backend/src/main.ts`** - Cấu hình CORS cho production domain

4. **`frontend/vite.config.ts`** - Cấu hình proxy/build cho production (nếu cần)

5. **`docker-compose.yml`** - Cấu hình Docker services (nếu deploy bằng Docker)

6. **Build scripts** - Đảm bảo build order đúng:
    ```bash
    pnpm --filter shared-types build
    pnpm --filter backend build
    pnpm --filter frontend build
    ```

Chi tiết về cách deploy sẽ được cập nhật sau khi code hoàn thiện.
