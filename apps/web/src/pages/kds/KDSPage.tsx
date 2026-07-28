import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

// ─── Types ───────────────────────────────────────────────────

interface KDSItem {
  name: string
  quantity: number
  specialInstructions?: string
}

interface KDSOrder {
  id: string
  orderNumber: number
  tableId: string
  status: 'NEW' | 'PREPARING' | 'READY'
  items: KDSItem[]
  createdAt: string
}

type Column = 'NEW' | 'PREPARING' | 'READY'
type Department = 'All' | 'Kitchen' | 'Bar' | 'Dessert'

// ─── Helpers ─────────────────────────────────────────────────

function getElapsedMinutes(createdAt: string): number {
  return Math.floor((Date.now() - new Date(createdAt).getTime()) / 60_000)
}

function formatElapsed(mins: number): string {
  if (mins < 60) return `${mins}m`
  return `${Math.floor(mins / 60)}h ${mins % 60}m`
}

function formatClock(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
}

// ponytail: base64 beep — 200ms 880Hz sine wave PCM in a WAV container, no external file needed
const BEEP_URI =
  'data:audio/wav;base64,UklGRiQBAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQABAAB/' +
  'f39/f39/f39/f39/f3d3d3d3d3d3d3d3d29vb29vb29vb29vb2dnZ2dnZ2dnZ2dnZ19fX19fX19fX19f' +
  'X1dXV1dXV1dXV1dXV09PT09PT09PT09PTz8/Pz8/Pz8/Pz8/PzMzMzMzMzMzMzMzMyMjIyMjIyMj' +
  'IyMjIxsbGxsbGxsbGxsbGw8PDw8PDw8PDw8PDwAAAAAAAAAAAAAAAAAA'

// ─── Component ───────────────────────────────────────────────

export function KDSPage() {
  const queryClient = useQueryClient()
  const prevOrderIdsRef = useRef<Set<string>>(new Set())
  const [department, setDepartment] = useState<Department>('All')
  const [clock, setClock] = useState(new Date())
  const [now, setNow] = useState(Date.now())

  // Clock + elapsed time ticker
  useEffect(() => {
    const id = setInterval(() => {
      setClock(new Date())
      setNow(Date.now())
    }, 1000)
    return () => clearInterval(id)
  }, [])

  // Fetch orders
  const { data: orders = [] } = useQuery({
    queryKey: ['kds-orders', department],
    queryFn: () =>
      api.get<KDSOrder[]>(
        `/kds/orders${department !== 'All' ? `?department=${department.toUpperCase()}` : ''}`
      ),
    refetchInterval: 5000,
  })

  // Mutations
  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/kds/orders/${id}/status`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['kds-orders'] }),
  })

  // Beep on new orders
  useEffect(() => {
    const currentIds = new Set(orders.map((o) => o.id))
    const hasNew = orders.some(
      (o) => o.status === 'NEW' && !prevOrderIdsRef.current.has(o.id)
    )
    if (hasNew && prevOrderIdsRef.current.size > 0) {
      const audio = new Audio(BEEP_URI)
      audio.play().catch(() => {})
    }
    prevOrderIdsRef.current = currentIds
  }, [orders])

  // Split orders into columns
  const columns: { key: Column; label: string; orders: KDSOrder[] }[] = [
    { key: 'NEW', label: 'New Orders', orders: orders.filter((o) => o.status === 'NEW') },
    { key: 'PREPARING', label: 'Preparing', orders: orders.filter((o) => o.status === 'PREPARING') },
    { key: 'READY', label: 'Ready', orders: orders.filter((o) => o.status === 'READY') },
  ]

  const departments: Department[] = ['All', 'Kitchen', 'Bar', 'Dessert']

  return (
    <div className="h-screen w-screen flex flex-col" style={{ backgroundColor: '#09090B' }}>
      {/* ─── Top Bar ─── */}
      <header
        className="flex items-center justify-between px-4 shrink-0"
        style={{ height: 64, backgroundColor: '#18181B', borderBottom: '1px solid #27272A' }}
      >
        {/* Department filters */}
        <div className="flex gap-2">
          {departments.map((d) => (
            <button
              key={d}
              onClick={() => setDepartment(d)}
              className="font-bold text-sm px-5"
              style={{
                height: 48,
                borderRadius: 9999,
                backgroundColor: department === d ? '#FF8A00' : '#27272A',
                color: department === d ? '#fff' : '#A1A1AA',
              }}
            >
              {d}
            </button>
          ))}
        </div>

        {/* Clock */}
        <span className="text-2xl font-mono text-white tabular-nums">
          {formatClock(clock)}
        </span>
      </header>

      {/* ─── 3-Column Grid ─── */}
      <div className="flex-1 grid grid-cols-3 gap-3 p-3 overflow-hidden min-h-0">
        {columns.map((col) => (
          <section key={col.key} className="flex flex-col min-h-0 overflow-hidden">
            {/* Column header */}
            <div className="flex items-center gap-3 px-2 py-3">
              <h2 className="text-lg font-bold text-white">{col.label}</h2>
              <span
                className="text-sm font-bold px-2.5 py-0.5 rounded-md"
                style={{ backgroundColor: '#27272A', color: '#A1A1AA' }}
              >
                {col.orders.length}
              </span>
            </div>

            {/* Scrollable cards */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1" style={{ scrollbarWidth: 'thin' }}>
              {col.orders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  column={col.key}
                  now={now}
                  onStart={() => updateStatus.mutate({ id: order.id, status: 'PREPARING' })}
                  onDone={() => updateStatus.mutate({ id: order.id, status: 'READY' })}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}

// ─── Order Card ──────────────────────────────────────────────

function OrderCard({
  order,
  column,
  now,
  onStart,
  onDone,
}: {
  order: KDSOrder
  column: Column
  now: number
  onStart: () => void
  onDone: () => void
}) {
  const elapsed = Math.floor((now - new Date(order.createdAt).getTime()) / 60_000)
  const isLate = elapsed >= 15

  return (
    <article
      className="rounded-xl p-4"
      style={{
        backgroundColor: '#18181B',
        border: '1px solid #27272A',
      }}
    >
      {/* Row 1: Table number + time */}
      <div className="flex items-start justify-between">
        <span className="text-5xl font-black text-white leading-none">
          {order.tableId}
        </span>
        <span
          className="text-sm font-bold px-2 py-1 rounded-md tabular-nums"
          style={{
            backgroundColor: isLate ? '#7F1D1D' : '#27272A',
            color: isLate ? '#FCA5A5' : '#A1A1AA',
          }}
        >
          {formatElapsed(elapsed)}
        </span>
      </div>

      {/* Row 2: Order number */}
      <p className="text-sm text-zinc-500 mt-1">Order #{order.orderNumber}</p>

      {/* Row 3: Items */}
      <ul className="mt-3 space-y-1.5">
        {order.items.map((item, i) => (
          <li key={i}>
            <span className="text-base text-gray-200">
              {item.quantity}× {item.name}
            </span>
            {item.specialInstructions && (
              <p className="text-sm italic text-gray-500 ml-5">
                {item.specialInstructions}
              </p>
            )}
          </li>
        ))}
      </ul>

      {/* Row 4: Action button */}
      {column === 'NEW' && (
        <button
          onClick={onStart}
          className="w-full mt-4 font-bold text-white text-base rounded-xl"
          style={{ height: 64, backgroundColor: '#FF8A00' }}
        >
          Start Preparing
        </button>
      )}
      {column === 'PREPARING' && (
        <button
          onClick={onDone}
          className="w-full mt-4 font-bold text-white text-base rounded-xl"
          style={{ height: 64, backgroundColor: '#22C55E' }}
        >
          Done
        </button>
      )}
    </article>
  )
}
