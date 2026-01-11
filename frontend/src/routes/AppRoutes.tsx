import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from '../components/common/Layout'
import StaffRoutes from './StaffRoutes'
import DashboardPage from '../pages/admin/DashboardPage'
import MenuPage from '../pages/admin/MenuPage'
import TablesPage from '../pages/admin/TablesPage'
import StaffPage from '../pages/admin/StaffPage'
import ReportsPage from '../pages/admin/ReportsPage'

/**
 * Main Application Routes
 * Organized by user role: customer, staff, admin
 */
export default function AppRoutes() {
    return (
        <BrowserRouter>
            <Routes>
                {/* Admin Routes - Dev 3 */}
                <Route
                    path="/admin"
                    element={<Layout />}
                >
                    <Route index element={<Navigate to="dashboard" replace />} />
                    <Route path="dashboard" element={<DashboardPage />} />
                    <Route path="menu" element={<MenuPage />} />
                    <Route path="tables" element={<TablesPage />} />
                    <Route path="staff" element={<StaffPage />} />
                    <Route path="reports" element={<ReportsPage />} />
                </Route>

                {/* Staff Routes (Waiter & Kitchen) - Dev 2 */}
                <Route path="/staff/*" element={<StaffRoutes />} />

                {/* Customer Routes - Dev 1 */}
                <Route path="/menu/*" element={<div>Menu Page (Dev 1)</div>} />
                <Route path="/cart" element={<div>Cart Page (Dev 1)</div>} />
                <Route path="/order/*" element={<div>Order Page (Dev 1)</div>} />

                {/* Auth Routes - Dev 3 */}
                <Route path="/login" element={<div>Login Page (Dev 3)</div>} />
                <Route path="/register" element={<div>Register Page (Dev 3)</div>} />

                {/* Default redirect */}
                <Route path="/" element={<Navigate to="/menu" replace />} />
            </Routes>
        </BrowserRouter>
    )
}
