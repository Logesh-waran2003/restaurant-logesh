import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/lib/store'
import {
  LayoutDashboard,
  UtensilsCrossed,
  TableProperties,
  ShoppingBag,
  Users,
  BarChart3,
  Settings,
  Search,
  Bell,
  LogOut,
  ChevronLeft,
} from 'lucide-react'
import { useState } from 'react'

const navItems = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/menu', label: 'Menu', icon: UtensilsCrossed },
  { to: '/admin/tables', label: 'Tables', icon: TableProperties },
  { to: '/admin/orders', label: 'Orders', icon: ShoppingBag, badge: true },
  { to: '/admin/staff', label: 'Staff', icon: Users },
  { to: '/admin/reports', label: 'Reports', icon: BarChart3 },
  { to: '/admin/settings', label: 'Settings', icon: Settings },
]

export function AdminLayout() {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(false)

  const pageTitle =
    location.pathname === '/admin'
      ? 'Dashboard'
      : location.pathname.split('/').pop()?.replace(/-/g, ' ') || 'Admin'

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((w) => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '?'

  return (
    <div className="h-screen flex overflow-hidden bg-[#09090B]">
      {/* Sidebar */}
      <aside
        className={[
          'shrink-0 flex flex-col bg-[#111827] border-r border-white/5',
          'transition-all duration-300 ease-in-out',
          collapsed ? 'w-[72px]' : 'w-[260px]',
        ].join(' ')}
      >
        {/* Brand */}
        <div className="px-5 py-5 flex items-center justify-between min-h-[64px]">
          {!collapsed && (
            <div className="flex items-center gap-2.5">
              <span className="text-lg font-bold text-white tracking-tight">
                Logesh Kitchen
              </span>
              <span className="text-[10px] font-semibold text-[#FF8A00] bg-[#FF8A00]/10 px-1.5 py-0.5 rounded">
                ERP
              </span>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={[
              'w-7 h-7 rounded-md flex items-center justify-center',
              'text-gray-400 hover:text-white hover:bg-white/5 transition-colors',
              collapsed ? 'mx-auto' : '',
            ].join(' ')}
          >
            <ChevronLeft
              size={16}
              className={`transition-transform duration-300 ${collapsed ? 'rotate-180' : ''}`}
            />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                [
                  'group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium',
                  'transition-all duration-150 relative',
                  isActive
                    ? 'bg-white/5 text-white'
                    : 'text-gray-400 hover:bg-white/5 hover:text-gray-200',
                  collapsed ? 'justify-center px-0' : '',
                ].join(' ')
              }
            >
              {({ isActive }) => (
                <>
                  {/* Orange left border for active */}
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-[#FF8A00]" />
                  )}
                  <div className="relative shrink-0">
                    <item.icon size={20} strokeWidth={1.8} />
                    {/* Notification dot on Orders */}
                    {item.badge && (
                      <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#FF8A00]" />
                    )}
                  </div>
                  {!collapsed && <span>{item.label}</span>}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User profile section */}
        <div className="px-3 py-4 border-t border-white/5">
          <div
            className={[
              'flex items-center gap-3',
              collapsed ? 'justify-center' : 'px-3',
            ].join(' ')}
          >
            <div className="w-8 h-8 rounded-full bg-[#FF8A00]/15 flex items-center justify-center text-xs font-bold text-[#FF8A00] shrink-0">
              {initials}
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white font-medium truncate">{user?.name}</p>
                <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
              </div>
            )}
            {!collapsed && (
              <button
                onClick={logout}
                className="text-gray-500 hover:text-white transition-colors p-1"
                title="Logout"
              >
                <LogOut size={16} />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar — glassmorphism */}
        <header className="h-14 shrink-0 bg-[#111827]/80 backdrop-blur-xl border-b border-white/5 flex items-center justify-between px-6">
          <h2 className="text-sm font-semibold text-[#F9FAFB] capitalize">
            {pageTitle}
          </h2>

          <div className="flex items-center gap-3">
            {/* Search with Ctrl+K hint */}
            <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-gray-400 hover:text-gray-200">
              <Search size={15} />
              <span className="text-xs hidden sm:inline">Search</span>
              <kbd className="hidden sm:inline text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-gray-500 font-mono">
                Ctrl+K
              </kbd>
            </button>

            {/* Notifications */}
            <button className="relative w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/5 transition-colors">
              <Bell size={18} />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[#FF8A00]" />
            </button>

            {/* User avatar */}
            <div className="w-8 h-8 rounded-full bg-[#FF8A00]/15 flex items-center justify-center text-xs font-bold text-[#FF8A00]">
              {initials}
            </div>
          </div>
        </header>

        {/* Content area */}
        <main className="flex-1 overflow-auto p-6 lg:p-8 bg-[#09090B]">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
