import { Routes, Route, Navigate } from 'react-router-dom'
import { CustomerLayout } from './layouts/CustomerLayout'
import { KDSLayout } from './layouts/KDSLayout'
import { POSLayout } from './layouts/POSLayout'
import { AdminLayout } from './layouts/AdminLayout'
import { MenuPage } from './pages/customer/MenuPage'
import { CartPage } from './pages/customer/CartPage'
import { OrderStatusPage } from './pages/customer/OrderStatusPage'
import { KDSPage } from './pages/kds/KDSPage'
import { OrdersPage } from './pages/pos/OrdersPage'
import { DashboardPage } from './pages/admin/DashboardPage'
import { MenuManagementPage } from './pages/admin/MenuManagementPage'
import { TablesPage } from './pages/admin/TablesPage'
import { AdminOrdersPage } from './pages/admin/AdminOrdersPage'
import { StaffPage } from './pages/admin/StaffPage'
import { ReportsPage } from './pages/admin/ReportsPage'
import { SettingsPage } from './pages/admin/SettingsPage'
import { LoginPage } from './pages/LoginPage'
import { useAuthStore } from './lib/store'

function RequireRole({ roles, children }: { roles: string[]; children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user)
  if (!user) return <Navigate to="/login" replace />
  if (!roles.map(r => r.toUpperCase()).includes(user.role.toUpperCase())) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <Routes>
      {/* Customer ordering — public */}
      <Route path="/order/:tableId" element={<CustomerLayout />}>
        <Route index element={<MenuPage />} />
        <Route path="cart" element={<CartPage />} />
        <Route path="status/:orderId" element={<OrderStatusPage />} />
      </Route>

      {/* Kitchen Display */}
      <Route
        path="/kds"
        element={
          <RequireRole roles={['CHEF', 'ADMIN', 'OWNER']}>
            <KDSLayout />
          </RequireRole>
        }
      >
        <Route index element={<KDSPage />} />
      </Route>

      {/* POS / Cashier */}
      <Route
        path="/pos/*"
        element={
          <RequireRole roles={['CASHIER', 'MANAGER', 'ADMIN', 'OWNER']}>
            <POSLayout />
          </RequireRole>
        }
      >
        <Route index element={<OrdersPage />} />
        <Route path="orders" element={<OrdersPage />} />
      </Route>

      {/* Admin Dashboard */}
      <Route
        path="/admin/*"
        element={
          <RequireRole roles={['ADMIN', 'OWNER']}>
            <AdminLayout />
          </RequireRole>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="menu" element={<MenuManagementPage />} />
        <Route path="tables" element={<TablesPage />} />
        <Route path="orders" element={<AdminOrdersPage />} />
        <Route path="staff" element={<StaffPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>

      {/* Login */}
      <Route path="/login" element={<LoginPage />} />

      {/* Default redirect */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}
