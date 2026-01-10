import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import Layout from '../components/common/Layout';
import DashboardPage from '../pages/admin/DashboardPage';
import MenuPage from '../pages/admin/MenuPage';
import TablesPage from '../pages/admin/TablesPage';
import StaffPage from '../pages/admin/StaffPage';
import ReportsPage from '../pages/admin/ReportsPage';
import KDSPage from '../pages/staff/KDSPage';

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      {
        index: true,
        element: <DashboardPage />,
      },
      {
        path: 'dashboard',
        element: <DashboardPage />,
      },
      {
        path: 'menu',
        element: <MenuPage />,
      },
      {
        path: 'tables',
        element: <TablesPage />,
      },
      {
        path: 'staff',
        element: <StaffPage />,
      },
      {
        path: 'reports',
        element: <ReportsPage />,
      },
      {
        path: 'kds',
        element: <KDSPage />,
      },
    ],
  },
]);

export default function AppRoutes() {
  return <RouterProvider router={router} />;
}
