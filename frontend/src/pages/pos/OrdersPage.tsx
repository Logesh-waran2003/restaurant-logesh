import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { ShoppingBag, Clock, Check, Printer, XCircle, ChevronDown, UtensilsCrossed, Package } from 'lucide-react'
import { api } from '@/lib/api'

interface OrderItem {
  name: string
  quantity: number
  price?: number
}

interface Order {
  id: string
  orderNumber: string
  orderType: 'DINE_IN' | 'PARCEL' | 'DELIVERY'
  tokenNumber?: string
  customerName?: string
  customerPhone?: string
  tableId?: string
  status: string
  total: number
  packingCharge?: number
  paymentMethod: string
  paymentStatus: string
  createdAt: string
  items: OrderItem[]
}

type OrderTab = 'DINE_IN' | 'PARCEL'

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  PLACED: { bg: 'rgba(255, 138, 0, 0.15)', text: '#FF8A00' },
  PREPARING: { bg: 'rgba(255, 138, 0, 0.15)', text: '#FF8A00' },
  READY: { bg: 'rgba(34, 197, 94, 0.15)', text: '#22C55E' },
  SERVED: { bg: 'rgba(34, 197, 94, 0.15)', text: '#22C55E' },
  PICKED_UP: { bg: 'rgba(34, 197, 94, 0.15)', text: '#22C55E' },
  CANCELLED: { bg: 'rgba(239, 68, 68, 0.15)', text: '#EF4444' },
}

function timeAgo(dateStr: string): string {
  const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60_000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  return `${Math.floor(mins / 60)}h ${mins % 60}m ago`
}

export function OrdersPage() {
  const [tab, setTab] = useState<OrderTab>('DINE_IN')
  const [expanded, setExpanded] = useState<string | null>(null)
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
    if (tab === 'DINE_IN') return o.orderType === 'DINE_IN'
    return o.orderType === 'PARCEL' || o.orderType === 'DELIVERY'
  })

  const dineInCount = orders.filter((o) => o.orderType === 'DINE_IN').length
  const parcelCount = orders.filter((o) => o.orderType === 'PARCEL' || o.orderType === 'DELIVERY').length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold" style={{ color: '#F9FAFB', fontFamily: 'Inter, sans-serif' }}>
          Active Orders
        </h1>
        <span className="text-xs" style={{ color: '#9CA3AF' }}>
          Auto-refreshes every 10s
        </span>
      </div>

      {/* Order type tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setTab('DINE_IN')}
          className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold transition-all"
          style={{
            borderRadius: '20px',
            backgroundColor: tab === 'DINE_IN' ? 'rgba(34, 197, 94, 0.15)' : '#111827',
            color: tab === 'DINE_IN' ? '#22C55E' : '#9CA3AF',
            border: tab === 'DINE_IN' ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <UtensilsCrossed className="w-4 h-4" />
          Dine-In
          <span
            className="ml-1 px-2 py-0.5 text-xs rounded-full"
            style={{ backgroundColor: 'rgba(255,255,255,0.1)', color: 'inherit' }}
          >
            {dineInCount}
          </span>
        </button>
        <button
          onClick={() => setTab('PARCEL')}
          className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold transition-all"
          style={{
            borderRadius: '20px',
            backgroundColor: tab === 'PARCEL' ? 'rgba(255, 138, 0, 0.15)' : '#111827',
            color: tab === 'PARCEL' ? '#FF8A00' : '#9CA3AF',
            border: tab === 'PARCEL' ? '1px solid rgba(255, 138, 0, 0.3)' : '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <Package className="w-4 h-4" />
          Parcel / Takeaway
          <span
            className="ml-1 px-2 py-0.5 text-xs rounded-full"
            style={{ backgroundColor: 'rgba(255,255,255,0.1)', color: 'inherit' }}
          >
            {parcelCount}
          </span>
        </button>
      </div>

      {/* Orders grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="animate-pulse p-5" style={{ backgroundColor: '#1A1F2E', borderRadius: '20px', height: '160px' }}>
              <div className="h-5 w-20 rounded mb-3" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }} />
              <div className="h-4 w-32 rounded mb-2" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }} />
              <div className="h-4 w-24 rounded" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }} />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <ShoppingBag className="w-12 h-12 mx-auto mb-4" style={{ color: '#9CA3AF', opacity: 0.5 }} />
          <p style={{ color: '#9CA3AF' }}>No {tab === 'DINE_IN' ? 'dine-in' : 'parcel'} orders right now</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <AnimatePresence mode="popLayout">
            {filtered.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                isExpanded={expanded === order.id}
                onToggle={() => setExpanded(expanded === order.id ? null : order.id)}
                onMarkPaid={() => markPaid.mutate(order.id)}
                onCancel={() => cancelOrder.mutate(order.id)}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}

function OrderCard({
  order,
  isExpanded,
  onToggle,
  onMarkPaid,
  onCancel,
}: {
  order: Order
  isExpanded: boolean
  onToggle: () => void
  onMarkPaid: () => void
  onCancel: () => void
}) {
  const statusStyle = STATUS_COLORS[order.status] || STATUS_COLORS.PLACED
  const isParcel = order.orderType === 'PARCEL' || order.orderType === 'DELIVERY'

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      onClick={onToggle}
      className="p-5 cursor-pointer border transition-all hover:border-opacity-20"
      style={{
        backgroundColor: '#1A1F2E',
        borderRadius: '20px',
        borderColor: 'rgba(255,255,255,0.05)',
      }}
    >
      {/* Top row: order number + type badge + status */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold" style={{ color: '#F9FAFB', fontFamily: 'Inter, sans-serif' }}>
            #{order.orderNumber}
          </span>
          <span
            className="px-2 py-0.5 text-[10px] font-bold uppercase"
            style={{
              borderRadius: '6px',
              backgroundColor: isParcel ? 'rgba(255, 138, 0, 0.15)' : 'rgba(34, 197, 94, 0.15)',
              color: isParcel ? '#FF8A00' : '#22C55E',
            }}
          >
            {isParcel ? 'Parcel' : 'Dine-In'}
          </span>
        </div>
        <span
          className="px-2.5 py-1 text-xs font-semibold"
          style={{ backgroundColor: statusStyle.bg, color: statusStyle.text, borderRadius: '8px' }}
        >
          {order.status}
        </span>
      </div>

      {/* Table or customer info */}
      <div className="flex items-center gap-3 text-sm mb-2" style={{ color: '#9CA3AF' }}>
        {isParcel ? (
          <>
            {order.tokenNumber && <span className="font-mono font-semibold" style={{ color: '#FF8A00' }}>{order.tokenNumber}</span>}
            <span>{order.customerName || 'Walk-in'}</span>
          </>
        ) : (
          <span>Table {order.tableId}</span>
        )}
        <span>{order.items.length} items</span>
      </div>

      {/* Total + time */}
      <div className="flex items-center justify-between">
        <span className="text-lg font-bold" style={{ color: '#FF8A00' }}>
          ₹{order.total}
        </span>
        <span className="flex items-center gap-1 text-xs" style={{ color: '#9CA3AF' }}>
          <Clock className="w-3 h-3" />
          {timeAgo(order.createdAt)}
        </span>
      </div>

      {/* Expand indicator */}
      <div className="flex justify-center mt-3">
        <ChevronDown
          className="w-4 h-4 transition-transform"
          style={{ color: '#9CA3AF', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)' }}
        />
      </div>

      {/* Expanded details */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mt-4 pt-4 space-y-3" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
              {/* Items list */}
              <div className="space-y-1.5">
                {order.items.map((item, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span style={{ color: '#F9FAFB' }}>{item.quantity}x {item.name}</span>
                    {item.price && (
                      <span style={{ color: '#9CA3AF' }}>₹{item.price * item.quantity}</span>
                    )}
                  </div>
                ))}
              </div>

              {/* Packing charge for parcel */}
              {isParcel && order.packingCharge && Number(order.packingCharge) > 0 && (
                <div className="flex justify-between text-sm">
                  <span style={{ color: '#9CA3AF' }}>Packing Charge</span>
                  <span style={{ color: '#9CA3AF' }}>₹{order.packingCharge}</span>
                </div>
              )}

              {/* Payment status */}
              <div className="flex items-center gap-2 text-sm">
                <span style={{ color: '#9CA3AF' }}>Payment:</span>
                <span style={{ color: order.paymentStatus === 'PAID' ? '#22C55E' : '#9CA3AF', fontWeight: order.paymentStatus === 'PAID' ? 600 : 400 }}>
                  {order.paymentStatus}
                </span>
                {order.paymentMethod && (
                  <span style={{ color: '#9CA3AF' }}>({order.paymentMethod})</span>
                )}
              </div>

              {/* Customer details for parcel */}
              {isParcel && order.customerPhone && (
                <div className="text-sm" style={{ color: '#9CA3AF' }}>
                  Phone: {order.customerPhone}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                {order.paymentStatus !== 'PAID' && (
                  <button
                    onClick={onMarkPaid}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold transition-colors hover:brightness-110"
                    style={{ backgroundColor: '#22C55E', color: '#F9FAFB', borderRadius: '10px' }}
                  >
                    <Check className="w-3.5 h-3.5" />
                    Mark Paid
                  </button>
                )}
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium transition-colors border"
                  style={{ borderColor: 'rgba(255,255,255,0.1)', color: '#9CA3AF', borderRadius: '10px', backgroundColor: 'transparent' }}
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print
                </button>
                {!['CANCELLED', 'SERVED', 'PICKED_UP'].includes(order.status) && (
                  <button
                    onClick={onCancel}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold transition-colors hover:brightness-110"
                    style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#EF4444', borderRadius: '10px' }}
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
