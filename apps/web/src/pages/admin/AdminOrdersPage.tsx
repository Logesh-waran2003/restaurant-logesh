import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { ChevronDown } from 'lucide-react'

// --- Types ---

type OrderStatus = 'PLACED' | 'CONFIRMED' | 'PREPARING' | 'READY' | 'SERVED' | 'COMPLETED' | 'CANCELLED'
type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED'
type DateFilter = 'today' | 'yesterday' | 'week' | 'custom'

interface OrderItem {
  id: string
  name: string
  quantity: number
  price: number
  specialInstructions?: string
}

interface Order {
  id: string
  orderNumber: string
  tableNumber: number
  items: OrderItem[]
  itemsCount: number
  total: number
  status: OrderStatus
  paymentStatus: PaymentStatus
  createdAt: string
  paymentMethod?: string
}

// --- Constants ---

const STATUSES: ('ALL' | OrderStatus)[] = ['ALL', 'PLACED', 'CONFIRMED', 'PREPARING', 'READY', 'SERVED', 'COMPLETED', 'CANCELLED']

const STATUS_COLORS: Record<OrderStatus, string> = {
  PLACED: 'bg-blue-500/15 text-blue-400',
  CONFIRMED: 'bg-blue-500/15 text-blue-400',
  PREPARING: 'bg-amber-500/15 text-amber-400',
  READY: 'bg-green-500/15 text-green-400',
  SERVED: 'bg-white/10 text-gray-400',
  COMPLETED: 'bg-green-500/10 text-green-400',
  CANCELLED: 'bg-red-500/15 text-red-400',
}

const PAYMENT_COLORS: Record<PaymentStatus, string> = {
  PENDING: 'bg-yellow-500/15 text-yellow-400',
  PAID: 'bg-green-500/15 text-green-400',
  FAILED: 'bg-red-500/15 text-red-400',
  REFUNDED: 'bg-purple-500/15 text-purple-400',
}

function getDateParam(filter: DateFilter, custom?: string): string | undefined {
  if (filter === 'custom') return custom || undefined
  const now = new Date()
  if (filter === 'today') return now.toISOString().slice(0, 10)
  if (filter === 'yesterday') {
    now.setDate(now.getDate() - 1)
    return now.toISOString().slice(0, 10)
  }
  // week: 7 days ago
  now.setDate(now.getDate() - 7)
  return now.toISOString().slice(0, 10)
}

// --- Component ---

export function AdminOrdersPage() {
  const queryClient = useQueryClient()

  // Filters
  const [statusFilter, setStatusFilter] = useState<'ALL' | OrderStatus>('ALL')
  const [dateFilter, setDateFilter] = useState<DateFilter>('today')
  const [customDate, setCustomDate] = useState('')
  const [search, setSearch] = useState('')

  // Expanded row
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Build query string
  const params = new URLSearchParams()
  if (statusFilter !== 'ALL') params.set('status', statusFilter)
  const dateParam = getDateParam(dateFilter, customDate)
  if (dateParam) params.set('date', dateParam)
  const qs = params.toString()

  // Fetch orders
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['admin-orders', qs],
    queryFn: () => api.get<Order[]>(`/orders${qs ? `?${qs}` : ''}`),
    refetchInterval: 10_000,
  })

  // Fetch single order details when expanded
  const { data: expandedOrder } = useQuery({
    queryKey: ['admin-order', expandedId],
    queryFn: () => api.get<Order>(`/orders/${expandedId}`),
    enabled: !!expandedId,
  })

  // Mutations
  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: OrderStatus }) =>
      api.patch(`/orders/${id}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] })
      queryClient.invalidateQueries({ queryKey: ['admin-order'] })
    },
  })

  // Filter by search (client-side on orderNumber)
  const filtered = search
    ? orders.filter((o) => o.orderNumber.toLowerCase().includes(search.toLowerCase()))
    : orders

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-white">Orders</h1>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 bg-[#1A1F2E] rounded-[20px] p-4 border border-white/5">
        {/* Status dropdown */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'ALL' | OrderStatus)}
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-orange-400"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        {/* Date filter */}
        <select
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value as DateFilter)}
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-orange-400"
        >
          <option value="today">Today</option>
          <option value="yesterday">Yesterday</option>
          <option value="week">This Week</option>
          <option value="custom">Custom Date</option>
        </select>

        {dateFilter === 'custom' && (
          <input
            type="date"
            value={customDate}
            onChange={(e) => setCustomDate(e.target.value)}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
        )}

        {/* Search */}
        <input
          type="text"
          placeholder="Search order #..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-gray-500 flex-1 min-w-[160px] focus:outline-none focus:ring-2 focus:ring-orange-400"
        />
      </div>

      {/* Orders List */}
      <div className="bg-[#1A1F2E] rounded-[20px] border border-white/5 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400">Loading orders...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-gray-400">No orders found</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-white/5 border-b border-white/5">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-400">Order #</th>
                <th className="text-left px-4 py-3 font-medium text-gray-400">Table</th>
                <th className="text-left px-4 py-3 font-medium text-gray-400">Items</th>
                <th className="text-left px-4 py-3 font-medium text-gray-400">Total</th>
                <th className="text-left px-4 py-3 font-medium text-gray-400">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-400">Payment</th>
                <th className="text-left px-4 py-3 font-medium text-gray-400">Time</th>
                <th className="text-left px-4 py-3 font-medium text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((order) => (
                <OrderRow
                  key={order.id}
                  order={order}
                  isExpanded={expandedId === order.id}
                  expandedOrder={expandedId === order.id ? expandedOrder : undefined}
                  onToggle={() => setExpandedId(expandedId === order.id ? null : order.id)}
                  onStatusChange={(status) => statusMutation.mutate({ id: order.id, status })}
                  isMutating={statusMutation.isPending}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

// --- Order Row ---

function OrderRow({
  order,
  isExpanded,
  expandedOrder,
  onToggle,
  onStatusChange,
  isMutating,
}: {
  order: Order
  isExpanded: boolean
  expandedOrder?: Order
  onToggle: () => void
  onStatusChange: (status: OrderStatus) => void
  isMutating: boolean
}) {
  const time = new Date(order.createdAt).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <>
      <tr
        onClick={onToggle}
        className="border-b border-white/5 hover:bg-white/[0.02] cursor-pointer transition-colors"
      >
        <td className="px-4 py-3 font-medium text-white">{order.orderNumber}</td>
        <td className="px-4 py-3 text-gray-300">T{order.tableNumber}</td>
        <td className="px-4 py-3 text-gray-300">{order.itemsCount}</td>
        <td className="px-4 py-3 font-medium text-white">₹{order.total}</td>
        <td className="px-4 py-3">
          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[order.status]}`}>
            {order.status}
          </span>
        </td>
        <td className="px-4 py-3">
          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${PAYMENT_COLORS[order.paymentStatus]}`}>
            {order.paymentStatus}
          </span>
        </td>
        <td className="px-4 py-3 text-gray-400">{time}</td>
        <td className="px-4 py-3">
          <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
            {order.status !== 'COMPLETED' && order.status !== 'CANCELLED' && (
              <button
                onClick={() => onStatusChange('COMPLETED')}
                disabled={isMutating}
                className="px-2 py-1 text-xs rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
              >
                Complete
              </button>
            )}
            {order.status !== 'CANCELLED' && order.status !== 'COMPLETED' && (
              <button
                onClick={() => onStatusChange('CANCELLED')}
                disabled={isMutating}
                className="px-2 py-1 text-xs rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
              >
                Cancel
              </button>
            )}
          </div>
        </td>
      </tr>

      {/* Expanded Details */}
      {isExpanded && (
        <tr className="bg-white/[0.02]">
          <td colSpan={8} className="px-4 py-4">
            {!expandedOrder ? (
              <p className="text-gray-400 text-sm">Loading details...</p>
            ) : (
              <div className="space-y-3">
                {/* Items */}
                <div>
                  <h4 className="text-sm font-semibold text-white mb-2 flex items-center gap-1">
                    <ChevronDown size={14} className="text-orange-400" /> Items
                  </h4>
                  <div className="space-y-1">
                    {expandedOrder.items.map((item) => (
                      <div key={item.id} className="flex items-start justify-between text-sm">
                        <div>
                          <span className="font-medium text-gray-200">{item.quantity}× {item.name}</span>
                          {item.specialInstructions && (
                            <p className="text-xs text-gray-400 ml-4 italic">"{item.specialInstructions}"</p>
                          )}
                        </div>
                        <span className="text-gray-400">₹{item.price * item.quantity}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Payment Info */}
                <div className="flex gap-6 text-sm border-t border-white/5 pt-2 text-gray-300">
                  <span><strong className="text-white">Total:</strong> ₹{expandedOrder.total}</span>
                  <span><strong className="text-white">Payment:</strong> {expandedOrder.paymentStatus}</span>
                  {expandedOrder.paymentMethod && (
                    <span><strong className="text-white">Method:</strong> {expandedOrder.paymentMethod}</span>
                  )}
                </div>
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  )
}
