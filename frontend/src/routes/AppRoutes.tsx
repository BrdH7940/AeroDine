import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { MenuPage, CartPage, OrderTrackingPage } from '../pages/customer';

export const AppRoutes: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Customer Routes */}
        <Route path="/customer/menu" element={<MenuPage />} />
        <Route path="/customer/cart" element={<CartPage />} />
        <Route path="/customer/orders/:orderId" element={<OrderTrackingPage />} />
        
        {/* Default redirect to menu */}
        <Route path="/" element={<Navigate to="/customer/menu" replace />} />
        <Route path="/customer" element={<Navigate to="/customer/menu" replace />} />
        
        {/* 404 fallback */}
        <Route path="*" element={<Navigate to="/customer/menu" replace />} />
      </Routes>
    </BrowserRouter>
  );
};
