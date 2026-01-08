import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import StaffRoutes from './StaffRoutes'

/**
 * Main Application Routes
 * Organized by user role: customer, staff, admin
 */
export default function AppRoutes() {
    return (
        <BrowserRouter>
            <Routes>
                {/* Staff Routes (Waiter & Kitchen) - Dev 2 */}
                <Route path="/staff/*" element={<StaffRoutes />} />

                {/* Customer Routes - Dev 1 */}
                <Route path="/menu/*" element={<div>Menu Page (Dev 1)</div>} />
                <Route path="/cart" element={<div>Cart Page (Dev 1)</div>} />
                <Route path="/order/*" element={<div>Order Page (Dev 1)</div>} />

                {/* Admin Routes - Dev 3 */}
                <Route path="/admin/*" element={<div>Admin Dashboard (Dev 3)</div>} />

                {/* Auth Routes - Dev 3 */}
                <Route path="/login" element={<div>Login Page (Dev 3)</div>} />
                <Route path="/register" element={<div>Register Page (Dev 3)</div>} />

                {/* Default redirect */}
                <Route path="/" element={<Navigate to="/menu" replace />} />
            </Routes>
        </BrowserRouter>
    )
}