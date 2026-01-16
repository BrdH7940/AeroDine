# Hướng Dẫn Kết Nối với Neon Database

Neon là một serverless PostgreSQL database service với free tier rất tốt cho development và production.

## Bước 1: Tạo Neon Database

1. Đăng ký tại [neon.tech](https://neon.tech)
2. Click **Create Project**
3. Chọn:
   - **Project name**: `AeroDine` (hoặc tên bạn muốn)
   - **Region**: Chọn region gần nhất (ví dụ: `Southeast Asia (Singapore)`)
   - **PostgreSQL version**: `15` hoặc `16` (recommended)
4. Click **Create project**

## Bước 2: Lấy Connection String

Sau khi tạo project, bạn sẽ thấy dashboard với connection string:

1. Trong Neon dashboard, vào **Connection Details**
2. Chọn **Connection pooling** (recommended) hoặc **Direct connection**
3. Copy connection string có dạng:
   ```
   postgresql://username:password@ep-xxx-xxx.region.aws.neon.tech/dbname?sslmode=require
   ```

### Connection Pooling vs Direct Connection

- **Connection Pooling** (recommended): 
  - Tốt cho production và serverless
  - Thêm `&pgbouncer=true` vào cuối connection string
  - Format: `postgresql://...?sslmode=require&pgbouncer=true`

- **Direct Connection**:
  - Tốt cho development và migrations
  - Chỉ dùng connection string cơ bản
  - Format: `postgresql://...?sslmode=require`

## Bước 3: Cấu Hình Backend

1. Copy file `.env.example` thành `.env`:
   ```bash
   cd backend
   cp .env.example .env
   ```

2. Mở file `backend/.env` và cập nhật `DATABASE_URL`:
   ```env
   DATABASE_URL=postgresql://username:password@ep-xxx-xxx.region.aws.neon.tech/dbname?sslmode=require&pgbouncer=true
   ```

   **Lưu ý**: 
   - Thay `username`, `password`, `ep-xxx-xxx`, `region`, `dbname` bằng thông tin thực tế từ Neon
   - Sử dụng connection pooling cho production
   - Sử dụng direct connection cho migrations

## Bước 4: Chạy Migrations

Sau khi cấu hình `DATABASE_URL`, chạy migrations để tạo tables:

```bash
cd backend
npx prisma migrate deploy
```

Hoặc nếu chưa có migration, tạo migration đầu tiên:

```bash
cd backend
npx prisma migrate dev --name init
```

## Bước 5: Generate Prisma Client

```bash
cd backend
npx prisma generate
```

## Bước 6: Test Connection

Khởi động backend và kiểm tra logs:

```bash
cd backend
npm run start:dev
```

Nếu kết nối thành công, bạn sẽ không thấy lỗi database connection trong console.

## Troubleshooting

### Lỗi: "Connection timeout"
- Kiểm tra firewall/network
- Thử dùng direct connection thay vì pooling
- Kiểm tra region có đúng không

### Lỗi: "SSL connection required"
- Đảm bảo connection string có `?sslmode=require`
- Neon yêu cầu SSL cho tất cả connections

### Lỗi: "Too many connections"
- Sử dụng connection pooling (`&pgbouncer=true`)
- Kiểm tra xem có đang tạo quá nhiều PrismaClient instances không

### Lỗi: "Database does not exist"
- Kiểm tra tên database trong connection string
- Neon tự động tạo database với tên bạn chọn khi tạo project

## Neon Free Tier Limits

- **Storage**: 3 GB
- **Compute**: 0.5 vCPU
- **Active time**: 5 hours/day (sau đó database auto-suspend)
- **Connections**: Unlimited (với pooling)

## Production Recommendations

1. **Sử dụng Connection Pooling**: Luôn dùng `&pgbouncer=true` cho production
2. **Environment Variables**: Không commit `.env` file, dùng environment variables trong hosting platform
3. **Backup**: Neon tự động backup, nhưng nên test restore process
4. **Monitoring**: Sử dụng Neon dashboard để monitor database usage

## Additional Resources

- [Neon Documentation](https://neon.tech/docs)
- [Prisma with Neon](https://www.prisma.io/docs/guides/deployment/deployment-guides/deploying-to-neon)
- [Connection Pooling Guide](https://neon.tech/docs/connect/connection-pooling)
