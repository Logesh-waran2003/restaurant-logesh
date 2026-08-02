import { Outlet, useParams, Link, useLocation } from 'react-router-dom'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import { useCartStore } from '@/lib/store'
import { ArrowRight } from 'lucide-react'
import { api } from '@/lib/api'

interface TableInfo { id: string; number: number; name: string | null; section: string | null }

export function CustomerLayout() {
  const { tableId } = useParams()
  const [lang, setLang] = useState<'EN' | 'TA'>('EN')

  const { data: tableInfo } = useQuery<TableInfo>({
    queryKey: ['table-info', tableId],
    queryFn: () => api.get<TableInfo>(`/tables/public/${tableId}`),
    enabled: !!tableId,
  })

  const tableLabel = tableInfo ? `Table ${tableInfo.number}` : 'Table'
  const items = useCartStore((s) => s.items)
  const total = useCartStore((s) => s.total)
  const location = useLocation()
  const isCartPage = location.pathname.includes('/cart')
  const itemCount = items.reduce((s, i) => s + i.quantity, 0)

  return (
    <div className="min-h-screen bg-gray-50 font-['Inter',sans-serif]">
      <div className="mx-auto max-w-lg min-h-screen bg-white shadow-sm flex flex-col">
        {/* ─── Header ─────────────────────────────────────────────── */}
        <header className="sticky top-0 z-40 h-14 bg-white flex items-center justify-between px-4 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          {/* Left: Logo + Name */}
          <Link to={`/order/${tableId}`} className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-[#FF8A00] flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-bold leading-none">LK</span>
            </div>
            <span className="text-[15px] font-bold text-gray-900 truncate">
              Saravana Bhavan
            </span>
          </Link>

          {/* Center: Table pill */}
          <div className="absolute left-1/2 -translate-x-1/2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-600 border border-gray-200/60">
              {tableLabel}
            </span>
          </div>

          {/* Right: Language toggle */}
          <button
            onClick={() => setLang(lang === 'EN' ? 'TA' : 'EN')}
            className="text-[13px] font-semibold text-gray-600 hover:text-gray-900 transition-colors px-1"
            aria-label="Toggle language"
          >
            {lang === 'EN' ? 'EN' : 'தமி'}
          </button>
        </header>

        {/* ─── Content ────────────────────────────────────────────── */}
        <main className="flex-1 overflow-y-auto pb-28">
          <Outlet context={{ lang, tableId }} />
        </main>

        {/* ─── Cart Bar ───────────────────────────────────────────── */}
        <AnimatePresence>
          {itemCount > 0 && !isCartPage && (
            <motion.div
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 80, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 26 }}
              className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-lg z-50"
            >
              <Link
                to={`/order/${tableId}/cart`}
                className="flex items-center justify-between mx-3 mb-3 px-5 py-3.5 bg-[#111827] rounded-2xl shadow-[0_-4px_20px_rgba(0,0,0,0.1)] active:scale-[0.98] transition-transform"
              >
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-full bg-[#FF8A00] flex items-center justify-center text-white text-xs font-bold">
                    {itemCount}
                  </span>
                  <span className="text-white text-sm font-semibold">
                    View Cart
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-white text-base font-bold">
                    ₹{total().toFixed(0)}
                  </span>
                  <ArrowRight className="w-4 h-4 text-white/70" />
                </div>
              </Link>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
