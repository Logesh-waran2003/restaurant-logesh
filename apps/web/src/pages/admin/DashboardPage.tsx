import { useQuery } from '@tanstack/react-query'
import { motion, useMotionValue, useTransform, animate } from 'framer-motion'
import { useEffect } from 'react'
import { api } from '@/lib/api'

interface DashboardStats {
  todayOrders: number
  revenue: number
  avgOrderValue: number
  activeTables: number
}

function AnimatedCounter({ value }: { value: number }) {
  const count = useMotionValue(0)
  const rounded = useTransform(count, (v) => Math.floor(v))

  useEffect(() => {
    const controls = animate(count, value, { duration: 1.5 })
    return controls.stop
  }, [value, count])

  return <motion.span>{rounded}</motion.span>
}

export function DashboardPage() {
  const { data: stats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => api.get<DashboardStats>('/admin/stats'),
    refetchInterval: 30_000,
  })

  const kpis = [
    { label: "Today's Orders", value: stats?.todayOrders ?? 0, prefix: '', icon: '📦' },
    { label: 'Revenue', value: stats?.revenue ?? 0, prefix: '₹', icon: '💰' },
    { label: 'Avg Order Value', value: stats?.avgOrderValue ?? 0, prefix: '₹', icon: '📊' },
    { label: 'Active Tables', value: stats?.activeTables ?? 0, prefix: '', icon: '🪑' },
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-ink">Dashboard</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, i) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-muted">{kpi.label}</span>
              <span className="text-2xl">{kpi.icon}</span>
            </div>
            <p className="text-3xl font-bold text-ink">
              {kpi.prefix}
              <AnimatedCounter value={kpi.value} />
            </p>
          </motion.div>
        ))}
      </div>

      {/* Hourly orders chart placeholder */}
      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
        <h2 className="text-lg font-semibold text-ink mb-4">Hourly Orders</h2>
        <div className="h-48 flex items-end gap-2 px-4">
          {Array.from({ length: 12 }, (_, i) => {
            const height = Math.random() * 100 + 20
            return (
              <motion.div
                key={i}
                initial={{ height: 0 }}
                animate={{ height: `${height}%` }}
                transition={{ delay: i * 0.05, duration: 0.5 }}
                className="flex-1 bg-accent/20 rounded-t-md relative group"
              >
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] text-muted opacity-0 group-hover:opacity-100">
                  {i + 9}:00
                </div>
              </motion.div>
            )
          })}
        </div>
        <div className="flex justify-between px-4 mt-2">
          <span className="text-xs text-muted">9 AM</span>
          <span className="text-xs text-muted">9 PM</span>
        </div>
      </div>
    </div>
  )
}
