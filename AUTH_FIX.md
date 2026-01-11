# Authentication Fix - Auto-login trong Development Mode

## Vấn đề

Các pages (Dashboard, Menu, KDS, Reports, Tables) hiển thị "Unable to load data" vì các API endpoints yêu cầu JWT authentication, nhưng frontend chưa có token.

## Giải pháp

Đã thêm **auto-login trong development mode** để tự động login với admin credentials khi app start.

### Thay đổi

1. **Tạo Auth Service** (`frontend/src/services/auth.ts`)

    - `login()` - Login và lưu token
    - `autoLoginDev()` - Tự động login với admin credentials (dev only)
    - `isAuthenticated()` - Kiểm tra có token không
    - `logout()` - Xóa token

2. **Update các pages** để auto-login khi chưa có token:
    - `DashboardPage.tsx`
    - `MenuPage.tsx`
    - `KDSPage.tsx`
    - `ReportsPage.tsx`
    - `TablesPage.tsx`

### Cách hoạt động

1. Khi page load, kiểm tra xem có token chưa
2. Nếu chưa có token VÀ đang ở development mode:

    - Tự động login với: `admin@aerodine.com` / `password123`
    - Lưu token vào localStorage
    - Sau đó fetch data bình thường

3. Nếu có token hoặc ở production mode:
    - Sử dụng token hiện có
    - Không auto-login

### Lưu ý

-   **Development only**: Auto-login chỉ hoạt động trong development mode (`import.meta.env.DEV`)
-   **Production**: Ở production, user cần login thủ công
-   **Credentials**: Sử dụng default admin credentials từ seed file:
    -   Email: `admin@aerodine.com`
    -   Password: `password123`

### Error Handling

Các pages đã được cải thiện error handling:

-   401 Unauthorized: "Authentication required. Please login."
-   404 Not Found: "Backend endpoint not found. Please check if backend is running."
-   Other errors: Hiển thị message từ backend hoặc generic error

### Testing

1. **Đảm bảo backend đang chạy**:

    ```bash
    cd backend
    pnpm run start:dev
    ```

2. **Đảm bảo database đã được seed**:

    ```bash
    cd backend
    pnpm run seed
    ```

3. **Clear localStorage** (nếu cần):

    ```javascript
    localStorage.clear()
    ```

4. **Reload frontend** - Auto-login sẽ tự động chạy

### Troubleshooting

Nếu vẫn gặp lỗi "Unable to load data":

1. **Kiểm tra backend có chạy không**:

    - Mở http://localhost:3000/api/docs (Swagger)
    - Kiểm tra có thể truy cập được không

2. **Kiểm tra database có data không**:

    - Chạy `pnpm run seed` trong backend
    - Kiểm tra có restaurant với ID = 1 không

3. **Kiểm tra console errors**:

    - Mở DevTools (F12)
    - Xem Network tab để check API calls
    - Xem Console để check errors

4. **Kiểm tra token**:

    ```javascript
    localStorage.getItem('token')
    ```

    - Nếu null, auto-login có thể đã fail
    - Kiểm tra Network tab để xem login request

5. **Manual login** (nếu auto-login fail):
    ```javascript
    // Trong browser console
    fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            email: 'admin@aerodine.com',
            password: 'password123',
        }),
    })
        .then((r) => r.json())
        .then((data) => {
            localStorage.setItem('token', data.access_token)
            console.log('Token saved:', data.access_token)
        })
    ```

## Production

Trong production, cần:

1. **Tạo login page** để user login
2. **Lưu token** sau khi login thành công
3. **Không sử dụng auto-login**
4. **Redirect** đến login page nếu 401

## Files Changed

-   `frontend/src/services/auth.ts` - NEW: Auth service
-   `frontend/src/pages/admin/DashboardPage.tsx` - Updated: Auto-login
-   `frontend/src/pages/admin/MenuPage.tsx` - Updated: Auto-login
-   `frontend/src/pages/admin/ReportsPage.tsx` - Updated: Auto-login
-   `frontend/src/pages/admin/TablesPage.tsx` - Updated: Auto-login
-   `frontend/src/pages/staff/KDSPage.tsx` - Updated: Auto-login
