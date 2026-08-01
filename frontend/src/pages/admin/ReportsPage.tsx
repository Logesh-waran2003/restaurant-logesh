import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Download } from 'lucide-react'

type DateRange = 'today' | 'yesterday' | 'this_week' | 'this_month' | 'custom'

interface DashboardData {
  totalOrders: number
  totalRevenue: number
  avgOrderValue: number
}

interface TopItem {
  name: string
  quantity: number
  revenue: number
}

interface ReportData {
  peakHour: string
  categories: { name: string; revenue: number }[]
  hourlyOrders: { hour: number; count: number }[]
}

function getDateRange(range: DateRange, customFrom?: string, customTo?: string) {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  switch (range) {
    case 'today':
      return { from: today.toISOString(), to: now.toISOString() }
    case 'yesterday': {
      const yStart = new Date(today)
      yStart.setDate(yStart.getDate() - 1)
      return { from: yStart.toISOString(), to: today.toISOString() }
    }
    case 'this_week': {
      const wStart = new Date(today)
      wStart.setDate(wStart.getDate() - wStart.getDay())
      return { from: wStart.toISOString(), to: now.toISOString() }
    }
    case 'this_month': {
      const mStart = new Date(today.getFullYear(), today.getMonth(), 1)
      return { from: mStart.toISOString(), to: now.toISOString() }
    }
    case 'custom':
      return { from: customFrom || today.toISOString(), to: customTo || now.toISOString() }
  }
}

export function ReportsPage() {
  const [range, setRange] = useState<DateRange>('today')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')

  const { from, to } = useMemo(() => getDateRange(range, customFrom, customTo), [range, customFrom, customTo])

  const { data: dashboard } = useQuery({
    queryKey: ['admin-dashboard', from, to],
    queryFn: () => api.get<DashboardData>('/admin/dashboard'),
    refetchInterval: 60_000,
  })

  const { data: report } = useQuery({
    queryKey: ['admin-reports', from, to],
    queryFn: () => api.get<ReportData>(`/admin/reports?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`),
  })

  const { data: topItems } = useQuery({
    queryKey: ['admin-top-items', from, to],
    queryFn: () => api.get<TopItem[]>('/admin/top-items'),
  })

  const maxCategoryRevenue = useMemo(
    () => Math.max(...(report?.categories?.map((c) => c.revenue) ?? [1])),
    [report?.categories],
  )
  const maxHourlyCount = useMemo(
    () => Math.max(...(report?.hourlyOrders?.map((h) => h.count) ?? [1])),
    [report?.hourlyOrders],
  )

  const ranges: { key: DateRange; label: string }[] = [
    { key: 'today', label: 'Today' },
    { key: 'yesterday', label: 'Yesterday' },
    { key: 'this_week', label: 'This Week' },
    { key: 'this_month', label: 'This Month' },
    { key: 'custom', label: 'Custom' },
  ]

  function handleExport(type: 'pdf' | 'excel') {
    alert(`Export ${type.toUpperCase()} — coming soon!`)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-white">Reports</h1>
        <div className="flex gap-2">
          <button
            onClick={() => handleExport('pdf')}
            className="px-3 py-1.5 text-sm bg-[#FF8A00] text-white rounded-lg hover:bg-orange-600 transition-colors flex items-center gap-1.5"
          >
            <Download size={14} /> Export PDF
          </button>
          <button
            onClick={() => handleExport('excel')}
            className="px-3 py-1.5 text-sm bg-[#FF8A00] text-white rounded-lg hover:bg-orange-600 transition-colors flex items-center gap-1.5"
          >
            <Download size={14} /> Export Excel
          </button>
        </div>
      </div>

      {/* Date Range Selector */}
      <div className="flex flex-wrap items-center gap-2">
        {ranges.map((r) => (
          <button
            key={r.key}
            onClick={() => setRange(r.key)}
            className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
              range === r.key
                ? 'bg-[#FF8A00] text-white border-[#FF8A00]'
                : 'bg-white/5 text-gray-300 border-white/10 hover:border-orange-400'
            }`}
          >
            {r.label}
          </button>
        ))}
        {range === 'custom' && (
          <div className="flex items-center gap-2 ml-2">
            <input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="px-2 py-1 text-sm border border-white/10 bg-white/5 text-white rounded-lg"
            />
            <span className="text-gray-500 text-sm">to</span>
            <input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="px-2 py-1 text-sm border border-white/10 bg-white/5 text-white rounded-lg"
            />
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#1A1F2E] rounded-[20px] p-5 border border-white/5">
          <span className="text-sm text-gray-400">Total Revenue</span>
          <p className="text-2xl font-bold text-white mt-1">₹{dashboard?.totalRevenue?.toLocaleString('en-IN') ?? '—'}</p>
        </div>
        <div className="bg-[#1A1F2E] rounded-[20px] p-5 border border-white/5">
          <span className="text-sm text-gray-400">Total Orders</span>
          <p className="text-2xl font-bold text-white mt-1">{dashboard?.totalOrders ?? '—'}</p>
        </div>
        <div className="bg-[#1A1F2E] rounded-[20px] p-5 border border-white/5">
          <span className="text-sm text-gray-400">Avg Order Value</span>
          <p className="text-2xl font-bold text-white mt-1">₹{dashboard?.avgOrderValue?.toLocaleString('en-IN') ?? '—'}</p>
        </div>
        <div className="bg-[#1A1F2E] rounded-[20px] p-5 border border-white/5">
          <span className="text-sm text-gray-400">Peak Hour</span>
          <p className="text-2xl font-bold text-white mt-1">{report?.peakHour ?? '—'}</p>
        </div>
      </div>

      {/* Top Selling Items */}
      <div className="bg-[#1A1F2E] rounded-[20px] p-6 border border-white/5">
        <h2 className="text-lg font-semibold text-white mb-4">Top Selling Items</h2>
        {topItems?.length ? (
          <ol className="space-y-3">
            {topItems.map((item, i) => (
              <li key={item.name} className="flex items-center gap-3">
                <span className="w-6 h-6 flex items-center justify-center rounded-full bg-[#FF8A00]/10 text-orange-400 text-xs font-bold">
                  {i + 1}
                </span>
                <span className="flex-1 font-medium text-white">{item.name}</span>
                <span className="text-sm text-gray-400">{item.quantity} sold</span>
                <span className="text-sm font-semibold text-orange-400">₹{item.revenue.toLocaleString('en-IN')}</span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-gray-400 text-sm">No data available</p>
        )}
      </div>

      {/* Revenue by Category */}
      <div className="bg-[#1A1F2E] rounded-[20px] p-6 border border-white/5">
        <h2 className="text-lg font-semibold text-white mb-4">Revenue by Category</h2>
        {report?.categories?.length ? (
          <div className="space-y-3">
            {report.categories.map((cat) => (
              <div key={cat.name} className="flex items-center gap-3">
                <span className="w-28 text-sm text-gray-300 truncate">{cat.name}</span>
                <div className="flex-1 h-6 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#FF8A00] rounded-full transition-all duration-500"
                    style={{ width: `${(cat.revenue / maxCategoryRevenue) * 100}%` }}
                  />
                </div>
                <span className="text-sm font-medium text-white w-20 text-right">₹{cat.revenue.toLocaleString('en-IN')}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-400 text-sm">No data available</p>
        )}
      </div>

      {/* Hourly Distribution */}
      <div className="bg-[#1A1F2E] rounded-[20px] p-6 border border-white/5">
        <h2 className="text-lg font-semibold text-white mb-4">Hourly Order Distribution</h2>
        {report?.hourlyOrders?.length ? (
          <div className="flex items-end gap-1 h-40">
            {report.hourlyOrders.map((h) => (
              <div key={h.hour} className="flex-1 flex flex-col items-center justify-end h-full group">
                <span className="text-[10px] text-gray-400 opacity-0 group-hover:opacity-100 mb-1">
                  {h.count}
                </span>
                <div
                  className="w-full bg-[#FF8A00] rounded-t transition-all duration-500 min-h-[2px]"
                  style={{ height: `${(h.count / maxHourlyCount) * 100}%` }}
                />
                <span className="text-[10px] text-gray-500 mt-1">
                  {h.hour % 3 === 0 ? `${h.hour}` : ''}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-400 text-sm">No data available</p>
        )}
      </div>
    </div>
  )
}
