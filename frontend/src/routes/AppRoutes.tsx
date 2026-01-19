import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AdminLayout } from '../components/common/ProtectedRoute';
import StaffRoutes from './StaffRoutes';
import DashboardPage from '../pages/admin/DashboardPage';
import AdminMenuPage from '../pages/admin/MenuPage';
import TablesPage from '../pages/admin/TablesPage';
import StaffPage from '../pages/admin/StaffPage';
import ReportsPage from '../pages/admin/ReportsPage';
import KDSPage from '../pages/staff/kitchen/KDSPage';
import { MenuPage, CartPage, OrderTrackingPage, PaymentSuccessPage, PaymentCancelPage } from '../pages/customer';
import { LoginPage, RegisterPage, AuthSuccessPage, AuthErrorPage, ForgotPasswordPage, ResetPasswordPage } from '../pages/auth';

/**
 * Main Application Routes
 * Organized by user role: customer, staff, admin
 */
export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Auth Routes */}
        <Route path="/auth/login" element={<LoginPage />} />
        <Route path="/auth/register" element={<RegisterPage />} />
        <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/auth/verify-otp" element={<ResetPasswordPage />} />
        <Route path="/auth/reset-password" element={<ResetPasswordPage />} />
        <Route path="/auth/success" element={<AuthSuccessPage />} />
        <Route path="/auth/error" element={<AuthErrorPage />} />
        
        {/* Customer Routes */}
        <Route path="/customer/menu" element={<MenuPage />} />
        <Route path="/customer/cart" element={<CartPage />} />
        <Route path="/customer/orders/:orderId" element={<OrderTrackingPage />} />
        <Route path="/customer/payment/success" element={<PaymentSuccessPage />} />
        <Route path="/customer/payment/cancel" element={<PaymentCancelPage />} />
        <Route path="/customer" element={<Navigate to="/customer/menu" replace />} />

        {/* Admin Routes */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="menu" element={<AdminMenuPage />} />
          <Route path="tables" element={<TablesPage />} />
          <Route path="staff" element={<StaffPage />} />
          <Route path="kds" element={<KDSPage />} />
          <Route path="reports" element={<ReportsPage />} />
        </Route>

        {/* Staff Routes (Waiter & Kitchen) */}
        <Route path="/staff/*" element={<StaffRoutes />} />

        {/* Default redirect to customer menu */}
        <Route path="/" element={<Navigate to="/customer/menu" replace />} />
        
        {/* 404 fallback */}
        <Route path="*" element={<Navigate to="/customer/menu" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
