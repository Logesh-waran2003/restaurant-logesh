import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

interface Order {
  id: string
  orderNumber: string
  tableId: string
  status: string
  total: number
  paymentMethod: string
  paymentStatus: string
  createdAt: string
  items: { name: string; quantity: number }[]
}

const STATUSES = ['ALL', 'PLACED', 'PREPARING', 'READY', 'PICKED_UP', 'CANCELLED']

export function OrdersPage() {
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [tableFilter, setTableFilter] = useState('')
  const queryClient = useQueryClient()

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['pos-orders'],
    queryFn: () => api.get<Order[]>('/orders'),
    refetchInterval: 10_000,
  })

  const markPaid = useMutation({
    mutationFn: (orderId: string) => api.patch(`/orders/${orderId}/payment`, { status: 'PAID' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pos-orders'] }),
  })

  const cancelOrder = useMutation({
    mutationFn: (orderId: string) => api.patch(`/orders/${orderId}/status`, { status: 'CANCELLED' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pos-orders'] }),
  })

  const filtered = orders.filter((o) => {
    if (statusFilter !== 'ALL' && o.status !== statusFilter) return false
    if (tableFilter && !o.tableId.includes(tableFilter)) return false
    return true
  })

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-ink">Orders</h1>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-1">
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                statusFilter === s ? 'bg-accent text-white' : 'bg-gray-100 text-muted'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <input
          type="text"
          placeholder="Filter by table..."
          value={tableFilter}
          onChange={(e) => setTableFilter(e.target.value)}
          className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
        />
      </div>

      {/* Table */}
      {isLoading ? (
        <p className="text-muted">Loading orders...</p>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 font-medium text-muted">Order</th>
                <th className="text-left px-4 py-3 font-medium text-muted">Table</th>
                <th className="text-left px-4 py-3 font-medium text-muted">Items</th>
                <th className="text-left px-4 py-3 font-medium text-muted">Total</th>
                <th className="text-left px-4 py-3 font-medium text-muted">Status</th>
                <th className="text-left px-4 py-3 font-medium text-muted">Payment</th>
                <th className="text-right px-4 py-3 font-medium text-muted">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((order) => (
                <tr key={order.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                  <td className="px-4 py-3 font-semibold">#{order.orderNumber}</td>
                  <td className="px-4 py-3">T{order.tableId}</td>
                  <td className="px-4 py-3 text-muted">
                    {order.items.map((i) => `${i.quantity}× ${i.name}`).join(', ')}
                  </td>
                  <td className="px-4 py-3 font-semibold">₹{order.total}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        order.status === 'READY'
                          ? 'bg-green-100 text-green-700'
                          : order.status === 'CANCELLED'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {order.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={order.paymentStatus === 'PAID' ? 'text-green-600' : 'text-muted'}>
                      {order.paymentStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    {order.paymentStatus !== 'PAID' && (
                      <button
                        onClick={() => markPaid.mutate(order.id)}
                        className="text-xs font-medium text-green-600 hover:underline"
                      >
                        Mark Paid
                      </button>
                    )}
                    {!['CANCELLED', 'PICKED_UP'].includes(order.status) && (
                      <button
                        onClick={() => cancelOrder.mutate(order.id)}
                        className="text-xs font-medium text-red-500 hover:underline"
                      >
                        Cancel
                      </button>
                    )}
                    <button className="text-xs font-medium text-muted hover:underline">
                      Print
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <p className="text-center text-muted py-8">No orders found</p>
          )}
        </div>
      )}
    </div>
  )
}
