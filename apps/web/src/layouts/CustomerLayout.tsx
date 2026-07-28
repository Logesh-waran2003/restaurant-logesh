import { Outlet, useParams, Link } from 'react-router-dom'
import { useState } from 'react'
import { useCartStore } from '@/lib/store'

export function CustomerLayout() {
  const { tableId } = useParams()
  const [lang, setLang] = useState<'EN' | 'TA'>('EN')
  const items = useCartStore((s) => s.items)
  const total = useCartStore((s) => s.total)

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <Link to={`/order/${tableId}`} className="font-bold text-lg text-ink">
          🍽️ Restaurant
        </Link>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted">Table {tableId}</span>
          <button
            onClick={() => setLang(lang === 'EN' ? 'TA' : 'EN')}
            className="text-xs font-medium px-2 py-1 rounded bg-amber-100 text-amber-800"
          >
            {lang === 'EN' ? 'தமிழ்' : 'ENG'}
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 pb-20">
        <Outlet context={{ lang, tableId }} />
      </main>

      {/* Sticky cart footer */}
      {items.length > 0 && (
        <Link
          to={`/order/${tableId}/cart`}
          className="fixed bottom-0 inset-x-0 bg-accent text-white px-4 py-3 flex items-center justify-between z-50 shadow-lg"
        >
          <span className="font-semibold">
            {items.reduce((s, i) => s + i.quantity, 0)} items
          </span>
          <span className="font-bold">₹{total().toFixed(0)} →</span>
        </Link>
      )}
    </div>
  )
}
