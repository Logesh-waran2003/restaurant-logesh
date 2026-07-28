import { useState } from 'react'
import { useOutletContext, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { api } from '@/lib/api'
import { useCartStore } from '@/lib/store'

interface MenuItem {
  id: string
  name: string
  nameTA?: string
  category: string
  price: number
  image?: string
  isVeg: boolean
  available: boolean
}

export function MenuPage() {
  const { lang } = useOutletContext<{ lang: 'EN' | 'TA'; tableId: string }>()
  const { tableId } = useParams()
  const [activeCategory, setActiveCategory] = useState<string>('ALL')
  const addItem = useCartStore((s) => s.addItem)

  const { data: menuItems = [], isLoading } = useQuery({
    queryKey: ['menu', tableId],
    queryFn: () => api.get<MenuItem[]>('/menu'),
  })

  const categories = ['ALL', ...new Set(menuItems.map((i) => i.category))]
  const filtered = activeCategory === 'ALL' ? menuItems : menuItems.filter((i) => i.category === activeCategory)

  if (isLoading) {
    return <div className="p-4 text-center text-muted">Loading menu...</div>
  }

  return (
    <div className="flex flex-col">
      {/* Category tabs */}
      <div className="sticky top-14 z-30 bg-white border-b border-gray-100 px-4 py-2 flex gap-2 overflow-x-auto">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              activeCategory === cat ? 'bg-accent text-white' : 'bg-gray-100 text-muted'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Menu grid */}
      <div className="p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {filtered.map((item, i) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100"
          >
            {item.image && (
              <img src={item.image} alt={item.name} className="w-full h-28 object-cover" />
            )}
            <div className="p-3">
              <div className="flex items-start justify-between gap-1">
                <h3 className="text-sm font-semibold text-ink leading-tight">
                  {lang === 'TA' && item.nameTA ? item.nameTA : item.name}
                </h3>
                <span
                  className={`shrink-0 w-4 h-4 rounded-sm border-2 ${
                    item.isVeg ? 'border-green-600' : 'border-red-600'
                  } flex items-center justify-center`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${item.isVeg ? 'bg-green-600' : 'bg-red-600'}`}
                  />
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="font-bold text-accent">₹{item.price}</span>
                <button
                  onClick={() => addItem({ id: item.id, name: item.name, nameTA: item.nameTA, price: item.price, image: item.image })}
                  className="px-2 py-1 bg-accent/10 text-accent text-xs font-semibold rounded hover:bg-accent/20 transition-colors"
                >
                  ADD
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="text-center text-muted py-12">No items in this category</p>
      )}
    </div>
  )
}
