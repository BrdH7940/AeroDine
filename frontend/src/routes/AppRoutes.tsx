import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { MenuPage, CartPage, OrderTrackingPage, PaymentSuccessPage, PaymentCancelPage } from '../pages/customer';
import { LoginPage, RegisterPage } from '../pages/auth';

export const AppRoutes: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Auth Routes */}
        <Route path="/auth/login" element={<LoginPage />} />
        <Route path="/auth/register" element={<RegisterPage />} />
        
        {/* Customer Routes */}
        <Route path="/customer/menu" element={<MenuPage />} />
        <Route path="/customer/cart" element={<CartPage />} />
        <Route path="/customer/orders/:orderId" element={<OrderTrackingPage />} />
        <Route path="/customer/payment/success" element={<PaymentSuccessPage />} />
        <Route path="/customer/payment/cancel" element={<PaymentCancelPage />} />
        
        {/* Default redirect to menu */}
        <Route path="/" element={<Navigate to="/customer/menu" replace />} />
        <Route path="/customer" element={<Navigate to="/customer/menu" replace />} />
        
        {/* 404 fallback */}
        <Route path="*" element={<Navigate to="/customer/menu" replace />} />
      </Routes>
    </BrowserRouter>
  );
};
