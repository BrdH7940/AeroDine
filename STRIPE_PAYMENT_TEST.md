# Hướng dẫn Test Stripe Payment Integration

## 1. Setup Stripe

### 1.1. Tạo Stripe Account (nếu chưa có)
- Vào https://dashboard.stripe.com/register
- Đăng ký account (có thể dùng test mode)

### 1.2. Lấy API Keys
- Vào https://dashboard.stripe.com/test/apikeys
- Copy **Secret key** (bắt đầu bằng `sk_test_...`)
- Copy **Publishable key** (bắt đầu bằng `pk_test_...`)

### 1.3. Setup Webhook
- Vào https://dashboard.stripe.com/test/webhooks
- Click **Add endpoint**
- Endpoint URL: `http://localhost:3000/api/orders/webhook` (hoặc production URL)
- Events to send: Chọn `checkout.session.completed`
- Copy **Signing secret** (bắt đầu bằng `whsec_...`)

### 1.4. Cấu hình Environment Variables
Thêm vào `.env` file:
```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
FRONTEND_URL=http://localhost:5173
```

## 2. Test Flow

### 2.1. Start Servers
```bash
# Terminal 1: Backend
cd backend
npm run start:dev

# Terminal 2: Frontend
cd frontend
npm run dev
```

### 2.2. Test Steps

1. **Tạo Order** (từ customer dashboard hoặc table QR)
   - Đặt món, checkout
   - Order sẽ có status `IN_PROGRESS`

2. **Waiter Dashboard**
   - Login với waiter account
   - Vào tab "Active Orders"
   - Tìm order vừa tạo

3. **Test Card Payment**
   - Click button **"Pay"** trên order card
   - Click **"Card Payment"**
   - Modal QR code sẽ hiển thị
   - Copy checkout URL hoặc quét QR code

4. **Test Payment trên Stripe**
   - Mở checkout URL trong browser
   - Dùng test card: `4242 4242 4242 4242`
   - Expiry: Bất kỳ date tương lai (ví dụ: `12/34`)
   - CVC: Bất kỳ 3 số (ví dụ: `123`)
   - Click **Pay**

5. **Kiểm tra Kết quả**
   - ✅ Order biến mất khỏi Active Orders
   - ✅ Notification hiển thị "Payment Completed"
   - ✅ Sound notification phát
   - ✅ Table status = AVAILABLE (check database)

## 3. Test Webhook (nếu cần)

### 3.1. Local Testing với Stripe CLI
```bash
# Install Stripe CLI
# https://stripe.com/docs/stripe-cli

# Login
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:3000/api/orders/webhook

# Copy webhook signing secret từ output
# Update STRIPE_WEBHOOK_SECRET trong .env
```

### 3.2. Test Webhook Event
```bash
# Trigger test event
stripe trigger checkout.session.completed
```

## 4. Debug

### 4.1. Check Backend Logs
- Xem console logs khi webhook được gọi
- Tìm log: `Payment successful for order X`

### 4.2. Check Database
```sql
-- Check payment record
SELECT * FROM payments WHERE order_id = <order_id>;

-- Check order status
SELECT id, status FROM orders WHERE id = <order_id>;

-- Check table status
SELECT id, status FROM tables WHERE id = <table_id>;
```

### 4.3. Check Browser Console
- Mở DevTools (F12)
- Xem Network tab khi click "Card Payment"
- Xem Console tab cho socket events

## 5. Common Issues

### Issue: "Stripe is not configured"
- ✅ Check `STRIPE_SECRET_KEY` trong `.env`
- ✅ Restart backend server

### Issue: Webhook không nhận được
- ✅ Check webhook URL đúng chưa
- ✅ Check `STRIPE_WEBHOOK_SECRET` trong `.env`
- ✅ Dùng Stripe CLI để test local

### Issue: Order không biến mất sau payment
- ✅ Check socket connection (xem console)
- ✅ Check socket events trong Network tab
- ✅ Refresh page để kiểm tra

### Issue: QR code không hiển thị
- ✅ Check checkout URL có được tạo không
- ✅ Check browser console cho errors
- ✅ Thử copy URL trực tiếp

## 6. Test Cards

Stripe Test Cards:
- **Success**: `4242 4242 4242 4242`
- **Decline**: `4000 0000 0000 0002`
- **3D Secure**: `4000 0025 0000 3155`

Expiry: Bất kỳ date tương lai
CVC: Bất kỳ 3 số
ZIP: Bất kỳ 5 số
