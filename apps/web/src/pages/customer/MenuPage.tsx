import { useState, useMemo, useRef } from 'react'
import { useOutletContext, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Clock, Plus, Minus, Flame } from 'lucide-react'
import { api } from '@/lib/api'
import { useCartStore } from '@/lib/store'

// ─── Types ──────────────────────────────────────────────────────────────────

interface MenuItem {
  id: string
  name: string
  nameTamil: string | null
  price: string
  image: string | null
  isVeg: boolean
  isAvailable: boolean
  prepTimeMinutes: number
}

interface Category {
  id: string
  name: string
  nameTamil: string | null
  menuItems: MenuItem[]
}

// ─── Image Map ──────────────────────────────────────────────────────────────

const FOOD_IMAGES = {
  chicken: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=400&h=300&fit=crop',
  biryani: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=400&h=300&fit=crop',
  veg: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400&h=300&fit=crop',
  drinks: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=400&h=300&fit=crop',
  desserts: 'https://images.unsplash.com/photo-1551024506-0bccd828d307?w=400&h=300&fit=crop',
  starters: 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=400&h=300&fit=crop',
  default: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop',
} as const

const CATEGORY_ICONS: Record<string, string> = {
  chicken: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=64&h=64&fit=crop',
  biryani: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=64&h=64&fit=crop',
  veg: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=64&h=64&fit=crop',
  drinks: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=64&h=64&fit=crop',
  beverages: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=64&h=64&fit=crop',
  desserts: 'https://images.unsplash.com/photo-1551024506-0bccd828d307?w=64&h=64&fit=crop',
  starters: 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=64&h=64&fit=crop',
  default: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=64&h=64&fit=crop',
}

function getItemImage(item: MenuItem, categoryName: string): string {
  if (item.image) return item.image
  const name = item.name.toLowerCase()
  const cat = categoryName.toLowerCase()

  if (name.includes('biryani') || cat.includes('biryani')) return FOOD_IMAGES.biryani
  if (name.includes('chicken') || name.includes('mutton') || cat.includes('chicken') || cat.includes('non-veg'))
    return FOOD_IMAGES.chicken
  if (cat.includes('starter') || cat.includes('appetizer') || name.includes('samosa'))
    return FOOD_IMAGES.starters
  if (cat.includes('drink') || cat.includes('beverage') || name.includes('chai') || name.includes('juice'))
    return FOOD_IMAGES.drinks
  if (cat.includes('dessert') || cat.includes('sweet') || name.includes('gulab'))
    return FOOD_IMAGES.desserts
  if (item.isVeg) return FOOD_IMAGES.veg
  return FOOD_IMAGES.default
}

function getCategoryIcon(name: string): string {
  const n = name.toLowerCase()
  if (n.includes('biryani')) return CATEGORY_ICONS.biryani
  if (n.includes('chicken') || n.includes('non-veg')) return CATEGORY_ICONS.chicken
  if (n.includes('starter') || n.includes('appetizer')) return CATEGORY_ICONS.starters
  if (n.includes('drink') || n.includes('beverage')) return CATEGORY_ICONS.drinks
  if (n.includes('dessert') || n.includes('sweet')) return CATEGORY_ICONS.desserts
  if (n.includes('veg')) return CATEGORY_ICONS.veg
  return CATEGORY_ICONS.default
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function MenuPage() {
  const { lang } = useOutletContext<{ lang: 'EN' | 'TA'; tableId: string }>()
  const { tableId } = useParams()
  const [activeCategoryId, setActiveCategoryId] = useState<string>('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [vegOnly, setVegOnly] = useState<'ALL' | 'VEG' | 'NONVEG'>('ALL')
  const tabsRef = useRef<HTMLDivElement>(null)

  const addItem = useCartStore((s) => s.addItem)
  const updateQuantity = useCartStore((s) => s.updateQuantity)
  const cartItems = useCartStore((s) => s.items)

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['menu', tableId],
    queryFn: () => api.get<Category[]>('/menu'),
  })

  const allItems = useMemo(
    () => categories.flatMap((c) => c.menuItems.map((item) => ({ ...item, categoryName: c.name }))),
    [categories],
  )

  const displayItems = useMemo(() => {
    let items =
      activeCategoryId === 'ALL'
        ? allItems
        : allItems.filter(
            (item) =>
              categories.find((c) => c.id === activeCategoryId)?.menuItems.some((mi) => mi.id === item.id),
          )

    if (vegOnly === 'VEG') {
      items = items.filter((item) => item.isVeg)
    } else if (vegOnly === 'NONVEG') {
      items = items.filter((item) => !item.isVeg)
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      items = items.filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          (item.nameTamil && item.nameTamil.toLowerCase().includes(q)),
      )
    }

    return items
  }, [activeCategoryId, allItems, categories, searchQuery, vegOnly])

  const getCartQty = (itemId: string) => cartItems.find((i) => i.id === itemId)?.quantity || 0

  if (isLoading) return <SkeletonLoader />

  return (
    <div className="flex flex-col min-h-full" style={{ background: '#F8F9FA', fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* ─── Hero Banner ─── */}
      <div
        className="relative overflow-hidden"
        style={{
          height: 160,
          background: 'linear-gradient(135deg, #FF8A00 0%, #E85D04 50%, #DC2626 100%)',
        }}
      >
        {/* Pattern overlay */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)',
            backgroundSize: '20px 20px',
          }}
        />
        <div className="relative z-10 flex flex-col items-center justify-center h-full px-6 text-center">
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-2xl font-bold text-white tracking-tight"
          >
            🍽️ Logesh Kitchen
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-white/80 text-sm mt-1 font-medium"
          >
            Order fresh, served fast
          </motion.p>
        </div>
      </div>

      {/* ─── Search Bar ─── */}
      <div className="sticky top-[57px] z-40 px-4 py-3 bg-[#F8F9FA]">
        <div className="flex gap-3 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={lang === 'TA' ? 'தேடு: பிரியாணி, சாய்...' : 'Search biryani, chai...'}
              className="w-full pl-11 pr-4 py-3 bg-white rounded-full shadow-sm border border-gray-100 text-sm text-[#111827] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF8A00]/30 focus:border-[#FF8A00] transition-all"
            />
          </div>
          <button
            onClick={() => setVegOnly(vegOnly === 'VEG' ? 'ALL' : 'VEG')}
            className={`flex items-center gap-1.5 px-3 py-2.5 rounded-full text-xs font-semibold border transition-all whitespace-nowrap ${
              vegOnly === 'VEG'
                ? 'bg-green-50 border-green-500 text-green-700'
                : 'bg-white border-gray-200 text-gray-500'
            }`}
          >
            <span className={`w-3 h-3 rounded-sm border-2 flex items-center justify-center ${vegOnly === 'VEG' ? 'border-green-600' : 'border-gray-400'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${vegOnly === 'VEG' ? 'bg-green-600' : 'bg-gray-400'}`} />
            </span>
            VEG
          </button>
          <button
            onClick={() => setVegOnly(vegOnly === 'NONVEG' ? 'ALL' : 'NONVEG')}
            className={`flex items-center gap-1.5 px-3 py-2.5 rounded-full text-xs font-semibold border transition-all whitespace-nowrap ${
              vegOnly === 'NONVEG'
                ? 'bg-red-50 border-red-500 text-red-700'
                : 'bg-white border-gray-200 text-gray-500'
            }`}
          >
            <span className={`w-3 h-3 rounded-sm border-2 flex items-center justify-center ${vegOnly === 'NONVEG' ? 'border-red-600' : 'border-gray-400'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${vegOnly === 'NONVEG' ? 'bg-red-600' : 'bg-gray-400'}`} />
            </span>
            NON-VEG
          </button>
        </div>
      </div>

      {/* ─── Category Tabs ─── */}
      <div className="px-4 pb-2">
        <div
          ref={tabsRef}
          className="flex gap-3 overflow-x-auto pb-2 scrollbar-none"
          style={{ scrollSnapType: 'x mandatory' }}
        >
          <CategoryTab
            active={activeCategoryId === 'ALL'}
            onClick={() => setActiveCategoryId('ALL')}
            label={lang === 'TA' ? 'அனைத்தும்' : 'All'}
            icon={CATEGORY_ICONS.default}
          />
          {categories.map((cat) => (
            <CategoryTab
              key={cat.id}
              active={activeCategoryId === cat.id}
              onClick={() => setActiveCategoryId(cat.id)}
              label={lang === 'TA' && cat.nameTamil ? cat.nameTamil : cat.name}
              icon={getCategoryIcon(cat.name)}
            />
          ))}
        </div>
      </div>

      {/* ─── Menu Grid ─── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeCategoryId + searchQuery}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="px-4 pb-24 grid grid-cols-2 md:grid-cols-3 gap-3"
        >
          {displayItems.map((item, i) => {
            const qty = getCartQty(item.id)
            const isPopular = i < 3
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04, duration: 0.35, ease: 'easeOut' }}
                className={`group relative bg-white rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 ${
                  !item.isAvailable ? 'opacity-50 pointer-events-none' : ''
                }`}
                style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
              >
                {/* Food Image */}
                <div className="relative h-[140px] sm:h-[160px] overflow-hidden">
                  <img
                    src={getItemImage(item, item.categoryName)}
                    alt={item.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                  {/* Gradient overlay at bottom of image */}
                  <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/20 to-transparent" />

                  {/* Veg/Non-veg badge */}
                  <div className="absolute top-2 right-2">
                    <span
                      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold backdrop-blur-sm ${
                        item.isVeg
                          ? 'bg-green-50/90 text-green-700 border border-green-200'
                          : 'bg-red-50/90 text-red-700 border border-red-200'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${item.isVeg ? 'bg-green-600' : 'bg-red-600'}`} />
                      {item.isVeg ? 'VEG' : 'NON-VEG'}
                    </span>
                  </div>

                  {/* Popular badge */}
                  {isPopular && (
                    <div className="absolute top-2 left-2">
                      <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-[#FF8A00] text-white text-[10px] font-bold shadow-sm">
                        <Flame className="w-2.5 h-2.5" />
                        Popular
                      </span>
                    </div>
                  )}

                  {/* Unavailable overlay */}
                  {!item.isAvailable && (
                    <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
                      <span className="px-3 py-1 bg-gray-800 text-white text-xs font-bold rounded-full">
                        Unavailable
                      </span>
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-3">
                  {/* Item name */}
                  <h3
                    className="font-semibold text-[15px] leading-snug line-clamp-2"
                    style={{ color: '#111827' }}
                  >
                    {lang === 'TA' && item.nameTamil ? item.nameTamil : item.name}
                  </h3>

                  {/* Tamil/English secondary name */}
                  {item.nameTamil && lang === 'EN' && (
                    <p className="text-xs mt-0.5 line-clamp-1" style={{ color: '#6B7280' }}>
                      {item.nameTamil}
                    </p>
                  )}
                  {lang === 'TA' && (
                    <p className="text-xs mt-0.5 line-clamp-1" style={{ color: '#6B7280' }}>
                      {item.name}
                    </p>
                  )}

                  {/* Prep time */}
                  <div className="flex items-center gap-1 mt-1.5">
                    <Clock className="w-3 h-3 text-gray-400" />
                    <span className="text-[11px] text-gray-400 font-medium">{item.prepTimeMinutes} min</span>
                  </div>

                  {/* Price + Add button */}
                  <div className="flex items-center justify-between mt-2.5 pt-2.5 border-t border-gray-50">
                    <span className="font-bold text-base" style={{ color: '#111827' }}>
                      ₹{item.price}
                    </span>

                    {qty > 0 ? (
                      <motion.div
                        initial={{ scale: 0.9 }}
                        animate={{ scale: 1 }}
                        className="flex items-center gap-1.5"
                      >
                        <button
                          onClick={() => updateQuantity(item.id, qty - 1)}
                          className="w-7 h-7 rounded-full border-2 border-[#FF8A00] flex items-center justify-center text-[#FF8A00] hover:bg-[#FF8A00]/10 transition-colors active:scale-90"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-sm font-bold w-5 text-center" style={{ color: '#111827' }}>
                          {qty}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.id, qty + 1)}
                          className="w-7 h-7 rounded-full bg-[#FF8A00] flex items-center justify-center text-white hover:bg-[#E67A00] transition-colors active:scale-90"
                          aria-label="Increase quantity"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </motion.div>
                    ) : (
                      <motion.button
                        whileTap={{ scale: 0.92 }}
                        onClick={() =>
                          addItem({
                            id: item.id,
                            name: item.name,
                            nameTA: item.nameTamil ?? undefined,
                            price: Number(item.price),
                          })
                        }
                        className="px-5 py-1.5 bg-[#FF8A00] text-white text-xs font-bold rounded-full hover:bg-[#E67A00] transition-colors shadow-sm hover:shadow-md active:scale-95"
                        aria-label={`Add ${item.name} to cart`}
                      >
                        ADD
                      </motion.button>
                    )}
                  </div>
                </div>
              </motion.div>
            )
          })}
        </motion.div>
      </AnimatePresence>

      {/* ─── Empty State ─── */}
      {displayItems.length === 0 && !isLoading && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-20 px-6"
        >
          <div className="w-20 h-20 rounded-full bg-orange-50 flex items-center justify-center mb-4">
            <Search className="w-8 h-8 text-[#FF8A00]" />
          </div>
          <h3 className="text-base font-semibold text-[#111827] mb-1">
            {searchQuery ? 'No results found' : 'No items here'}
          </h3>
          <p className="text-sm text-center" style={{ color: '#6B7280' }}>
            {searchQuery
              ? `We couldn't find anything for "${searchQuery}"`
              : lang === 'TA'
                ? 'இந்த வகையில் உணவு இல்லை'
                : 'This category is empty right now'}
          </p>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="mt-4 px-5 py-2 bg-[#FF8A00] text-white text-sm font-semibold rounded-full hover:bg-[#E67A00] transition-colors"
            >
              Clear search
            </button>
          )}
        </motion.div>
      )}
    </div>
  )
}

// ─── Category Tab ───────────────────────────────────────────────────────────

function CategoryTab({
  active,
  onClick,
  label,
  icon,
}: {
  active: boolean
  onClick: () => void
  label: string
  icon: string
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 min-w-[72px] py-2 transition-all"
      style={{ scrollSnapAlign: 'start' }}
    >
      <div
        className={`w-[44px] h-[44px] rounded-full overflow-hidden border-2 transition-all duration-200 ${
          active ? 'border-[#FF8A00] shadow-md shadow-orange-200' : 'border-gray-200'
        }`}
      >
        <img src={icon} alt={label} className="w-full h-full object-cover" loading="lazy" />
      </div>
      <span
        className={`text-[11px] whitespace-nowrap transition-all ${
          active ? 'text-[#FF8A00] font-bold' : 'text-[#6B7280] font-medium'
        }`}
      >
        {label}
      </span>
      {/* Active indicator */}
      <div
        className={`h-0.5 w-5 rounded-full transition-all duration-200 ${
          active ? 'bg-[#FF8A00]' : 'bg-transparent'
        }`}
      />
    </button>
  )
}

// ─── Skeleton Loader ────────────────────────────────────────────────────────

function SkeletonLoader() {
  return (
    <div className="flex flex-col min-h-full" style={{ background: '#F8F9FA' }}>
      {/* Hero skeleton */}
      <div className="h-[160px] bg-gradient-to-r from-orange-200 to-orange-100 animate-pulse" />

      {/* Search skeleton */}
      <div className="px-4 py-3">
        <div className="h-12 bg-white rounded-full animate-pulse shadow-sm" />
      </div>

      {/* Category tabs skeleton */}
      <div className="px-4 pb-3 flex gap-3 overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-1.5 min-w-[72px]">
            <div className="w-[44px] h-[44px] rounded-full bg-gray-200 animate-pulse" />
            <div className="h-3 w-12 bg-gray-200 rounded animate-pulse" />
          </div>
        ))}
      </div>

      {/* Cards skeleton */}
      <div className="px-4 grid grid-cols-2 md:grid-cols-3 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl overflow-hidden" style={{ animationDelay: `${i * 100}ms` }}>
            <div className="h-[140px] bg-gray-200 animate-pulse" />
            <div className="p-3 space-y-2">
              <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
              <div className="h-3 bg-gray-100 rounded animate-pulse w-1/2" />
              <div className="h-3 bg-gray-100 rounded animate-pulse w-1/3" />
              <div className="flex items-center justify-between pt-2 border-t border-gray-50">
                <div className="h-5 bg-gray-200 rounded animate-pulse w-12" />
                <div className="h-7 bg-orange-100 rounded-full animate-pulse w-16" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
