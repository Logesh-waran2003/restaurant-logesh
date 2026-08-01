import { useQuery } from '@tanstack/react-query'
import { motion, useMotionValue, useTransform, animate } from 'framer-motion'
import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import {
  ShoppingBag,
  IndianRupee,
  TrendingUp,
  Users,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface DashboardStats {
  todayOrders: number
  revenue: number
  avgOrderValue: number
  activeTables: number
}

interface RecentOrder {
  id: string
  tableId: string
  status: string
  total: number
  createdAt: string
  items: { name: string; quantity: number }[]
}

interface TopItem {
  name: string
  quantity: number
  revenue: number
}

// ─── Mock Hourly Revenue Data ─────────────────────────────────────────────────

const hourlyRevenue = [
  0, 0, 0, 0, 0, 0,
  1200, 2800, 4500, 3200, 2100, 6800,
  9200, 8400, 5600, 3800, 4200, 7100,
  8900, 9600, 7200, 5400, 3100, 1800,
]

const peakHours = [
  { time: '12:00 PM – 1:30 PM', label: 'Lunch Rush', intensity: 95 },
  { time: '7:00 PM – 9:00 PM', label: 'Dinner Peak', intensity: 88 },
  { time: '8:00 AM – 9:30 AM', label: 'Breakfast', intensity: 52 },
  { time: '3:00 PM – 4:00 PM', label: 'Snack Hour', intensity: 35 },
]

const liveEvents = [
  { id: 1, text: 'Order #42 placed at Table 5', time: '2 min ago' },
  { id: 2, text: 'Order #41 marked ready', time: '5 min ago' },
  { id: 3, text: 'Table 3 payment received – ₹1,240', time: '8 min ago' },
]

// ─── Animated Counter ─────────────────────────────────────────────────────────

function AnimatedCounter({ value, prefix = '' }: { value: number; prefix?: string }) {
  const count = useMotionValue(0)
  const rounded = useTransform(count, (v) =>
    prefix + Math.floor(v).toLocaleString('en-IN'),
  )

  useEffect(() => {
    const controls = animate(count, value, {
      duration: 1.6,
      ease: [0.25, 0.46, 0.45, 0.94],
    })
    return controls.stop
  }, [value, count])

  return <motion.span>{rounded}</motion.span>
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

const statusColors: Record<string, string> = {
  pending: 'bg-[#FF8A00]/15 text-[#FF8A00]',
  preparing: 'bg-amber-500/15 text-amber-400',
  ready: 'bg-green-500/15 text-green-400',
  served: 'bg-gray-500/15 text-gray-400',
  completed: 'bg-green-500/15 text-green-400',
  cancelled: 'bg-red-500/15 text-red-400',
}

function StatusBadge({ status }: { status: string }) {
  const color = statusColors[status.toLowerCase()] || 'bg-white/10 text-gray-400'
  return (
    <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold capitalize ${color}`}>
      {status}
    </span>
  )
}

// ─── Time Ago ─────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

// ─── Greeting ─────────────────────────────────────────────────────────────────

function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

// ─── KPI Config ───────────────────────────────────────────────────────────────

const kpiConfig = [
  {
    key: 'todayOrders' as const,
    label: "Today's Orders",
    icon: ShoppingBag,
    prefix: '',
    trend: '+12%',
    positive: true,
    color: '#FF8A00',
    bgColor: 'bg-[#FF8A00]/10',
  },
  {
    key: 'revenue' as const,
    label: 'Revenue',
    icon: IndianRupee,
    prefix: '₹',
    trend: '+8%',
    positive: true,
    color: '#22C55E',
    bgColor: 'bg-green-500/10',
  },
  {
    key: 'avgOrderValue' as const,
    label: 'Avg Order Value',
    icon: TrendingUp,
    prefix: '₹',
    trend: '+3%',
    positive: true,
    color: '#3B82F6',
    bgColor: 'bg-blue-500/10',
  },
  {
    key: 'activeTables' as const,
    label: 'Active Tables',
    icon: Users,
    prefix: '',
    trend: '-2',
    positive: false,
    color: '#A855F7',
    bgColor: 'bg-purple-500/10',
  },
]

// ─── Revenue Bar Chart ────────────────────────────────────────────────────────

function RevenueChart() {
  const [period, setPeriod] = useState<'Today' | 'Week' | 'Month'>('Today')
  const [hoveredBar, setHoveredBar] = useState<number | null>(null)
  const maxRevenue = Math.max(...hourlyRevenue)
  const xLabels = [
    { hour: 6, label: '6am' },
    { hour: 9, label: '9am' },
    { hour: 12, label: '12pm' },
    { hour: 15, label: '3pm' },
    { hour: 18, label: '6pm' },
    { hour: 21, label: '9pm' },
  ]

  return (
    <div className="bg-[#1A1F2E] rounded-[20px] border border-white/5 p-6 h-full">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-base font-semibold text-[#F9FAFB]">Revenue Overview</h2>
        <div className="flex gap-1 bg-white/5 rounded-lg p-1">
          {(['Today', 'Week', 'Month'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                period === p
                  ? 'bg-[#FF8A00] text-white shadow-lg shadow-[#FF8A00]/20'
                  : 'text-[#9CA3AF] hover:text-white'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Bar chart */}
      <div className="relative h-[200px] flex items-end gap-[3px]">
        {hourlyRevenue.map((val, i) => {
          const height = maxRevenue > 0 ? (val / maxRevenue) * 100 : 0
          return (
            <div
              key={i}
              className="relative flex-1 flex flex-col justify-end h-full"
              onMouseEnter={() => setHoveredBar(i)}
              onMouseLeave={() => setHoveredBar(null)}
            >
              {/* Tooltip */}
              {hoveredBar === i && val > 0 && (
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-[#0F1219] border border-white/10 rounded-lg px-2.5 py-1 text-[11px] text-white whitespace-nowrap z-10 shadow-xl">
                  ₹{val.toLocaleString('en-IN')}
                </div>
              )}
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${height}%` }}
                transition={{ duration: 0.8, delay: i * 0.03, ease: [0.25, 0.46, 0.45, 0.94] }}
                className={`w-full rounded-t-sm transition-colors ${
                  hoveredBar === i ? 'bg-[#FF8A00]' : 'bg-[#FF8A00]/70'
                }`}
                style={{ minHeight: val > 0 ? '4px' : '0px' }}
              />
            </div>
          )
        })}
      </div>

      {/* X-axis */}
      <div className="relative mt-3 h-4">
        {xLabels.map(({ hour, label }) => (
          <span
            key={hour}
            className="absolute text-[10px] text-[#9CA3AF] -translate-x-1/2"
            style={{ left: `${(hour / 23) * 100}%` }}
          >
            {label}
          </span>
        ))}
      </div>
    </div>
  )
}

// ─── Peak Hours Card ──────────────────────────────────────────────────────────

function PeakHoursCard() {
  return (
    <div className="bg-[#1A1F2E] rounded-[20px] border border-white/5 p-6 h-full">
      <div className="flex items-center gap-2 mb-5">
        <Clock size={16} className="text-[#FF8A00]" />
        <h2 className="text-base font-semibold text-[#F9FAFB]">Peak Hours</h2>
      </div>

      <div className="space-y-3">
        {peakHours.map((slot, i) => (
          <motion.div
            key={slot.time}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 + i * 0.08 }}
            className={`p-3 rounded-xl border transition-all ${
              i === 0
                ? 'bg-[#FF8A00]/10 border-[#FF8A00]/30'
                : 'bg-white/[0.02] border-white/5'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className={`text-xs font-semibold ${i === 0 ? 'text-[#FF8A00]' : 'text-[#F9FAFB]'}`}>
                {slot.label}
              </span>
              <span className="text-[11px] text-[#9CA3AF]">{slot.intensity}%</span>
            </div>
            <p className="text-[11px] text-[#9CA3AF] mb-2">{slot.time}</p>
            {/* Intensity bar */}
            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${slot.intensity}%` }}
                transition={{ duration: 1, delay: 0.8 + i * 0.1 }}
                className={`h-full rounded-full ${
                  i === 0
                    ? 'bg-gradient-to-r from-[#FF8A00] to-[#FFB800]'
                    : 'bg-gradient-to-r from-[#FF8A00]/60 to-[#FFB800]/60'
                }`}
              />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export function DashboardPage() {
  const user = useAuthStore((s) => s.user)

  const { data: stats } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: () => api.get<DashboardStats>('/admin/dashboard'),
    refetchInterval: 30_000,
  })

  const { data: recentOrders } = useQuery({
    queryKey: ['admin-recent-orders'],
    queryFn: () => api.get<RecentOrder[]>('/orders?limit=5'),
    refetchInterval: 30_000,
  })

  const { data: topItems } = useQuery({
    queryKey: ['admin-top-items'],
    queryFn: () => api.get<TopItem[]>('/admin/top-items'),
    refetchInterval: 60_000,
  })

  const maxItemQty = Math.max(...(topItems ?? []).map((i) => i.quantity), 1)

  return (
    <div className="space-y-6 max-w-[1400px] pb-8">
      {/* ═══ HERO SECTION ═══ */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex items-start justify-between"
      >
        <div>
          <h1 className="text-[28px] font-bold text-[#F9FAFB] tracking-tight">
            {getGreeting()}, {user?.name?.split(' ')[0] || 'Logesh'}
          </h1>
          <p className="text-sm text-[#9CA3AF] mt-1">
            Here's what's happening at your restaurant today
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm font-medium text-[#F9FAFB]">
              {new Date().toLocaleDateString('en-IN', {
                weekday: 'long',
                day: 'numeric',
                month: 'short',
              })}
            </p>
            <p className="text-xs text-[#9CA3AF]">
              {new Date().toLocaleTimeString('en-IN', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-green-500/10 border border-green-500/20">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
            </span>
            <span className="text-xs font-medium text-green-400">Restaurant Open</span>
          </div>
        </div>
      </motion.div>

      {/* ═══ KPI CARDS ═══ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiConfig.map((kpi, i) => (
          <motion.div
            key={kpi.key}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="bg-[#1A1F2E] rounded-[20px] border border-white/5 p-6 group hover:border-white/10 transition-all"
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`w-10 h-10 rounded-xl ${kpi.bgColor} flex items-center justify-center`}>
                <kpi.icon size={20} style={{ color: kpi.color }} />
              </div>
              {kpi.trend && (
                <span className={`flex items-center gap-0.5 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                  kpi.positive
                    ? 'text-green-400 bg-green-500/10'
                    : 'text-red-400 bg-red-500/10'
                }`}>
                  {kpi.positive ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
                  {kpi.trend}
                </span>
              )}
            </div>
            <p className="text-3xl font-bold text-[#F9FAFB] tracking-tight">
              <AnimatedCounter value={stats?.[kpi.key] ?? 0} prefix={kpi.prefix} />
            </p>
            <p className="text-sm text-[#9CA3AF] mt-1">{kpi.label}</p>
          </motion.div>
        ))}
      </div>

      {/* ═══ CHARTS SECTION ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="lg:col-span-2"
        >
          <RevenueChart />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
        >
          <PeakHoursCard />
        </motion.div>
      </div>

      {/* ═══ BOTTOM SECTION: Recent Orders + Top Items ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Recent Orders — wider */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55, duration: 0.5 }}
          className="lg:col-span-3 bg-[#1A1F2E] rounded-[20px] border border-white/5 overflow-hidden"
        >
          <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
            <h2 className="text-base font-semibold text-[#F9FAFB]">Recent Orders</h2>
            <a
              href="/admin/orders"
              className="text-xs font-medium text-[#FF8A00] hover:text-[#FFB800] transition-colors"
            >
              View All →
            </a>
          </div>

          {/* Table header */}
          <div className="px-6 py-2.5 grid grid-cols-[60px_70px_1fr_90px_90px_70px] gap-2 text-[11px] font-medium text-[#9CA3AF] uppercase tracking-wider border-b border-white/5">
            <span>#</span>
            <span>Table</span>
            <span>Items</span>
            <span>Total</span>
            <span>Status</span>
            <span>Time</span>
          </div>

          <div className="divide-y divide-white/5">
            {(recentOrders ?? []).map((order, i) => (
              <motion.div
                key={order.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 + i * 0.05 }}
                className="px-6 py-3 grid grid-cols-[60px_70px_1fr_90px_90px_70px] gap-2 items-center hover:bg-white/[0.02] transition-colors"
              >
                <span className="text-sm font-mono font-semibold text-[#9CA3AF]">
                  #{order.id.slice(-4)}
                </span>
                <span className="text-sm text-[#F9FAFB]">T-{order.tableId}</span>
                <span className="text-sm text-[#9CA3AF] truncate">
                  {order.items?.map((it) => it.name).slice(0, 2).join(', ')}
                  {(order.items?.length ?? 0) > 2 && ` +${order.items.length - 2}`}
                </span>
                <span className="text-sm font-semibold text-[#F9FAFB] tabular-nums">
                  ₹{order.total.toLocaleString('en-IN')}
                </span>
                <StatusBadge status={order.status} />
                <span className="text-[11px] text-[#9CA3AF]">
                  {timeAgo(order.createdAt)}
                </span>
              </motion.div>
            ))}

            {(!recentOrders || recentOrders.length === 0) && (
              <div className="px-6 py-12 text-center text-sm text-[#9CA3AF]">
                No orders yet today
              </div>
            )}
          </div>
        </motion.div>

        {/* Top Selling Items — narrower */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="lg:col-span-2 bg-[#1A1F2E] rounded-[20px] border border-white/5 overflow-hidden"
        >
          <div className="px-6 py-4 border-b border-white/5">
            <h2 className="text-base font-semibold text-[#F9FAFB]">Popular Items</h2>
          </div>

          <div className="px-6 py-3 space-y-1">
            {(topItems ?? []).map((item, i) => {
              const barWidth = (item.quantity / maxItemQty) * 100
              return (
                <motion.div
                  key={item.name}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.65 + i * 0.06 }}
                  className="py-3 px-2 rounded-xl hover:bg-white/[0.02] transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-7 h-7 rounded-lg bg-[#FF8A00]/10 flex items-center justify-center text-xs font-bold text-[#FF8A00] shrink-0">
                        {i + 1}
                      </span>
                      <span className="text-sm text-[#F9FAFB] font-medium truncate">
                        {item.name}
                      </span>
                    </div>
                    <span className="text-xs text-[#9CA3AF] bg-white/5 px-2 py-0.5 rounded-full shrink-0 ml-2">
                      {item.quantity} orders
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden ml-10">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${barWidth}%` }}
                      transition={{ duration: 1, delay: 0.8 + i * 0.08 }}
                      className="h-full rounded-full bg-gradient-to-r from-[#FF8A00] to-[#FFD700]"
                    />
                  </div>
                </motion.div>
              )
            })}

            {(!topItems || topItems.length === 0) && (
              <div className="py-10 text-center text-sm text-[#9CA3AF]">
                No data yet
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* ═══ LIVE ACTIVITY FEED ═══ */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7, duration: 0.5 }}
        className="bg-[#1A1F2E] rounded-[20px] border border-white/5 p-6"
      >
        <div className="flex items-center gap-2 mb-4">
          <Activity size={16} className="text-[#FF8A00]" />
          <h2 className="text-base font-semibold text-[#F9FAFB]">Live Activity</h2>
        </div>
        <div className="space-y-3">
          {liveEvents.map((event, i) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.8 + i * 0.06 }}
              className="flex items-center gap-3"
            >
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
              </span>
              <span className="text-sm text-[#F9FAFB]">{event.text}</span>
              <span className="text-[11px] text-[#9CA3AF] ml-auto shrink-0">{event.time}</span>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  )
}
