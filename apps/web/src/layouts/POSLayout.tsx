import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { ShoppingBag, TableProperties, UtensilsCrossed, LogOut, User } from 'lucide-react'
import { useAuthStore } from '@/lib/store'

const navItems = [
  { to: '/pos/orders', label: 'Orders', icon: ShoppingBag },
  { to: '/pos/tables', label: 'Tables', icon: TableProperties },
  { to: '/pos/menu', label: 'Menu', icon: UtensilsCrossed },
]

export function POSLayout() {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="h-screen flex flex-col" style={{ backgroundColor: '#09090B' }}>
      {/* Top nav — horizontal, large touch targets for cashier */}
      <header
        className="flex items-center justify-between px-6 shrink-0"
        style={{ backgroundColor: '#111827', borderBottom: '1px solid rgba(255,255,255,0.05)', height: '64px' }}
      >
        {/* Logo */}
        <span className="text-lg font-bold" style={{ color: '#F9FAFB', fontFamily: 'Inter, sans-serif' }}>
          POS
        </span>

        {/* Nav tabs — centered */}
        <nav className="flex items-center gap-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className="relative flex items-center gap-2 px-5 font-medium text-sm transition-colors"
              style={({ isActive }) => ({
                minHeight: '48px',
                color: isActive ? '#FF8A00' : '#9CA3AF',
                fontFamily: 'Inter, sans-serif',
              })}
            >
              {({ isActive }) => (
                <>
                  <item.icon className="w-4.5 h-4.5" />
                  <span>{item.label}</span>
                  {isActive && (
                    <span
                      className="absolute bottom-0 left-3 right-3"
                      style={{ height: '2px', backgroundColor: '#FF8A00', borderRadius: '1px' }}
                    />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User + logout */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4" style={{ color: '#9CA3AF' }} />
            <span className="text-sm" style={{ color: '#9CA3AF' }}>
              {user?.name}
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 text-sm font-medium transition-colors hover:opacity-80"
            style={{ minHeight: '48px', color: '#EF4444' }}
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-auto p-6">
        <Outlet />
      </main>
    </div>
  )
}
