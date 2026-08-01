import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

// ─── Types ───────────────────────────────────────────────────

interface KDSItem {
  id: string
  itemName: string
  totalQuantity: number
  status: 'NEW' | 'PREPARING' | 'READY'
  tables: { tableNumber: number; quantity: number; orderId: string; orderItemIds: string[]; isParcel?: boolean; customerName?: string }[]
  oldestOrderTime: string
  specialInstructions: string[]
}

type Column = 'NEW' | 'PREPARING' | 'READY'
type Department = 'All' | 'Kitchen' | 'Bar' | 'Dessert'

// ─── Helpers ─────────────────────────────────────────────────

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
  const prevItemNamesRef = useRef<Set<string>>(new Set())
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

  // Fetch grouped items
  const { data: items = [] } = useQuery({
    queryKey: ['kds-orders', department],
    queryFn: () =>
      api.get<KDSItem[]>(
        `/kds/orders${department !== 'All' ? `?department=${department.toUpperCase()}` : ''}`
      ),
    refetchInterval: 5000,
  })

  // Move items status
  const updateStatus = useMutation({
    mutationFn: ({ itemName, status }: { itemName: string; status: 'PREPARING' | 'READY' }) =>
      api.patch('/kds/items/status', { itemName, status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['kds-orders'] }),
  })

  // Beep on new items appearing
  useEffect(() => {
    const currentNames = new Set(items.filter((i) => i.status === 'NEW').map((i) => i.itemName))
    const hasNew = [...currentNames].some((name) => !prevItemNamesRef.current.has(name))
    if (hasNew && prevItemNamesRef.current.size > 0) {
      const audio = new Audio(BEEP_URI)
      audio.play().catch(() => {})
    }
    prevItemNamesRef.current = currentNames
  }, [items])

  // Split items into columns
  const columns: { key: Column; label: string; items: KDSItem[] }[] = [
    { key: 'NEW', label: 'To Make', items: items.filter((i) => i.status === 'NEW') },
    { key: 'PREPARING', label: 'Cooking', items: items.filter((i) => i.status === 'PREPARING') },
    { key: 'READY', label: 'Ready', items: items.filter((i) => i.status === 'READY') },
  ]

  const departments: Department[] = ['All', 'Kitchen', 'Bar', 'Dessert']

  return (
    <div className="h-screen w-screen flex flex-col" style={{ backgroundColor: '#09090B' }}>
      {/* ─── Top Bar ─── */}
      <header
        className="flex items-center justify-between px-4 shrink-0"
        style={{ height: 64, backgroundColor: '#18181B', borderBottom: '1px solid #27272A' }}
      >
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
                {col.items.length}
              </span>
            </div>

            {/* Scrollable cards */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1" style={{ scrollbarWidth: 'thin' }}>
              {col.items.map((item) => (
                <ItemCard
                  key={item.id}
                  item={item}
                  column={col.key}
                  now={now}
                  onAction={() => {
                    if (col.key === 'NEW') updateStatus.mutate({ itemName: item.itemName, status: 'PREPARING' })
                    if (col.key === 'PREPARING') updateStatus.mutate({ itemName: item.itemName, status: 'READY' })
                  }}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}

// ─── Item Card ───────────────────────────────────────────────

function ItemCard({
  item,
  column,
  now,
  onAction,
}: {
  item: KDSItem
  column: Column
  now: number
  onAction: () => void
}) {
  const elapsed = Math.floor((now - new Date(item.oldestOrderTime).getTime()) / 60_000)
  const isLate = elapsed >= 15

  // Build table breakdown string
  const tableBreakdown = item.tables.map((t) => {
    if (t.isParcel) {
      return `P-${t.customerName || 'Parcel'}(${t.quantity})`
    }
    return `T${t.tableNumber}(${t.quantity})`
  })

  return (
    <article
      className="rounded-xl p-4"
      style={{ backgroundColor: '#18181B', border: '1px solid #27272A' }}
    >
      {/* Dish name */}
      <h3 className="text-3xl font-bold text-white leading-tight">{item.itemName}</h3>

      {/* Total quantity — biggest element */}
      <p className="text-5xl font-black leading-none mt-2" style={{ color: '#FF8A00' }}>
        {item.totalQuantity}
      </p>

      {/* Table breakdown */}
      <p className="text-sm text-gray-400 mt-2">
        {tableBreakdown.map((t, i) => {
          const isParcel = item.tables[i].isParcel
          return (
            <span key={i} className={isParcel ? 'text-orange-400' : ''}>
              {i > 0 ? ' ' : ''}{t}
            </span>
          )
        })}
      </p>

      {/* Time since oldest order */}
      <div className="flex items-center justify-between mt-3">
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

      {/* Special instructions */}
      {item.specialInstructions.length > 0 && (
        <p className="italic text-sm text-gray-500 mt-2">
          {item.specialInstructions.join(' • ')}
        </p>
      )}

      {/* Action button */}
      {column === 'NEW' && (
        <button
          onClick={onAction}
          className="w-full mt-4 font-bold text-white text-base rounded-xl"
          style={{ height: 64, backgroundColor: '#FF8A00' }}
        >
          Start Cooking
        </button>
      )}
      {column === 'PREPARING' && (
        <button
          onClick={onAction}
          className="w-full mt-4 font-bold text-white text-base rounded-xl"
          style={{ height: 64, backgroundColor: '#22C55E' }}
        >
          Done
        </button>
      )}
    </article>
  )
}
