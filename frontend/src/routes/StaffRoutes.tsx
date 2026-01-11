import { Routes, Route, Navigate } from 'react-router-dom'
import WaiterOrdersPage from '../pages/staff/waiter/OrdersPage'
import KDSPage from '../pages/staff/kitchen/KDSPage'

/**
 * Staff Routes - Routes for Waiter and Kitchen staff
 *
 * @author Dev 2 - Operations Team
 */

export default function StaffRoutes() {
    return (
        <Routes>
            {/* Waiter Routes */}
            <Route path="waiter">
                <Route index element={<Navigate to="orders" replace />} />
                <Route path="orders" element={<WaiterOrdersPage />} />
            </Route>

            {/* Kitchen Routes */}
            <Route path="kitchen">
                <Route index element={<Navigate to="kds" replace />} />
                <Route path="kds" element={<KDSPage />} />
            </Route>

            {/* Default redirect */}
            <Route index element={<Navigate to="waiter/orders" replace />} />
        </Routes>
    )
}
