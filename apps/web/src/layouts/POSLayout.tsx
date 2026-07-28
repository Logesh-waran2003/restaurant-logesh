import { Outlet, NavLink } from 'react-router-dom'
import { useAuthStore } from '@/lib/store'

const navItems = [
  { to: '/pos/orders', label: 'Orders', icon: '📋' },
  { to: '/pos/tables', label: 'Tables', icon: '🪑' },
  { to: '/pos/menu', label: 'Menu', icon: '🍽️' },
  { to: '/pos/reports', label: 'Reports', icon: '📊' },
]

export function POSLayout() {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)

  return (
    <div className="h-screen flex bg-gray-50">
      {/* Sidebar */}
      <aside className="w-60 bg-navy text-white flex flex-col">
        <div className="p-4 border-b border-white/10">
          <h1 className="font-bold text-lg">💰 POS</h1>
          <p className="text-xs text-white/60 mt-1">{user?.name}</p>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? 'bg-accent text-white' : 'text-white/70 hover:bg-white/10'
                }`
              }
            >
              <span>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-white/10">
          <button onClick={logout} className="text-sm text-white/60 hover:text-white">
            Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto p-6">
        <Outlet />
      </main>
    </div>
  )
}
