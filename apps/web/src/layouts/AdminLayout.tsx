import { Outlet, NavLink } from 'react-router-dom'
import { useAuthStore } from '@/lib/store'

const navItems = [
  { to: '/admin', label: 'Dashboard', icon: '📊', end: true },
  { to: '/admin/menu', label: 'Menu', icon: '🍽️' },
  { to: '/admin/tables', label: 'Tables', icon: '🪑' },
  { to: '/admin/orders', label: 'Orders', icon: '📋' },
  { to: '/admin/staff', label: 'Staff', icon: '👥' },
  { to: '/admin/reports', label: 'Reports', icon: '📈' },
  { to: '/admin/settings', label: 'Settings', icon: '⚙️' },
]

export function AdminLayout() {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Top bar */}
      <header className="h-14 bg-white border-b border-gray-200 px-6 flex items-center justify-between shrink-0">
        <h1 className="font-bold text-lg text-ink">🏪 Admin</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted">{user?.name}</span>
          <button onClick={logout} className="text-sm text-red-500 hover:underline">
            Logout
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-56 bg-white border-r border-gray-200 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? 'bg-amber-50 text-accent' : 'text-muted hover:bg-gray-50'
                }`
              }
            >
              <span>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
