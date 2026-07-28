import { useState, useMemo } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Search, Plus, Minus, Trash2, CheckCircle } from 'lucide-react'
import { api } from '@/lib/api'

type OrderType = 'DINE_IN' | 'PARCEL' | 'DELIVERY'

interface MenuItem {
  id: string
  name: string
  price: number
  categoryId: string
  category?: { id: string; name: string }
  isAvailable?: boolean
}

interface Category {
  id: string
  name: string
}

interface CartItem {
  menuItemId: string
  name: string
  price: number
  quantity: number
}

interface MenuResponse {
  categories: Category[]
  items: MenuItem[]
}

interface Table {
  id: string
  number: number
  status: string
}

const ORDER_TYPES: { value: OrderType; label: string }[] = [
  { value: 'DINE_IN', label: 'Dine-In' },
  { value: 'PARCEL', label: 'Parcel' },
  { value: 'DELIVERY', label: 'Delivery' },
]

const PACKING_CHARGE_DEFAULT = 20

export function NewOrderPage() {
  const [orderType, setOrderType] = useState<OrderType>('PARCEL')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [cart, setCart] = useState<CartItem[]>([])
  const [tableId, setTableId] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')
  const [tokenConfirm, setTokenConfirm] = useState<string | null>(null)

  const { data: menuData } = useQuery({
    queryKey: ['pos-menu'],
    queryFn: () => api.get<MenuResponse>('/menu'),
  })

  const { data: tables = [] } = useQuery({
    queryKey: ['pos-tables'],
    queryFn: () => api.get<Table[]>('/tables'),
    enabled: orderType === 'DINE_IN',
  })

  const placeOrder = useMutation({
    mutationFn: (payload: Record<string, unknown>) => api.post<{ id: string; tokenNumber?: string; orderNumber: string }>('/orders', payload),
    onSuccess: (data) => {
      if (orderType !== 'DINE_IN' && data.tokenNumber) {
        setTokenConfirm(data.tokenNumber)
        setTimeout(() => setTokenConfirm(null), 4000)
      }
      // Reset form
      setCart([])
      setCustomerName('')
      setCustomerPhone('')
      setScheduledAt('')
      setTableId('')
    },
  })

  const categories = menuData?.categories || []
  const allItems = menuData?.items || []

  const filteredItems = useMemo(() => {
    let items = allItems.filter((i) => i.isAvailable !== false)
    if (selectedCategory !== 'all') {
      items = items.filter((i) => i.categoryId === selectedCategory)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      items = items.filter((i) => i.name.toLowerCase().includes(q))
    }
    return items
  }, [allItems, selectedCategory, search])

  const addToCart = (item: MenuItem) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.menuItemId === item.id)
      if (existing) {
        return prev.map((c) => c.menuItemId === item.id ? { ...c, quantity: c.quantity + 1 } : c)
      }
      return [...prev, { menuItemId: item.id, name: item.name, price: item.price, quantity: 1 }]
    })
  }

  const updateQty = (menuItemId: string, delta: number) => {
    setCart((prev) => {
      return prev
        .map((c) => c.menuItemId === menuItemId ? { ...c, quantity: c.quantity + delta } : c)
        .filter((c) => c.quantity > 0)
    })
  }

  const subtotal = cart.reduce((sum, c) => sum + c.price * c.quantity, 0)
  const packingCharge = orderType !== 'DINE_IN' ? PACKING_CHARGE_DEFAULT : 0
  // ponytail: GST hardcoded 5% — upgrade to restaurant settings config later
  const gst = Math.round(subtotal * 0.05 * 100) / 100
  const total = subtotal + gst + packingCharge

  const handlePlaceOrder = () => {
    if (cart.length === 0) return
    if (orderType === 'DINE_IN' && !tableId) return

    const payload: Record<string, unknown> = {
      orderType,
      items: cart.map((c) => ({ menuItemId: c.menuItemId, quantity: c.quantity })),
      packingCharge,
      paymentMethod: 'CASH',
    }
    if (orderType === 'DINE_IN') {
      payload.tableId = tableId
    } else {
      if (customerName.trim()) payload.customerName = customerName.trim()
      if (customerPhone.trim()) payload.customerPhone = customerPhone.trim()
      if (scheduledAt) payload.scheduledAt = new Date(scheduledAt).toISOString()
    }
    placeOrder.mutate(payload)
  }

  return (
    <div className="flex gap-6 h-[calc(100vh-64px-48px)]">
      {/* Token confirmation overlay */}
      {tokenConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
          <div className="text-center p-10" style={{ backgroundColor: '#1A1F2E', borderRadius: '24px' }}>
            <CheckCircle className="w-16 h-16 mx-auto mb-4" style={{ color: '#22C55E' }} />
            <p className="text-lg mb-2" style={{ color: '#9CA3AF' }}>Order Placed! Token:</p>
            <p className="text-5xl font-bold" style={{ color: '#FF8A00', fontFamily: 'Inter, sans-serif' }}>
              {tokenConfirm}
            </p>
          </div>
        </div>
      )}

      {/* Left: Menu browser (60%) */}
      <div className="w-[60%] flex flex-col gap-4 overflow-hidden">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#9CA3AF' }} />
          <input
            type="text"
            placeholder="Search menu..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 text-sm outline-none"
            style={{
              backgroundColor: '#111827',
              borderRadius: '12px',
              border: '1px solid rgba(255,255,255,0.08)',
              color: '#F9FAFB',
            }}
          />
        </div>

        {/* Category tabs */}
        <div className="flex gap-2 overflow-x-auto shrink-0 pb-1">
          <button
            onClick={() => setSelectedCategory('all')}
            className="px-4 py-2 text-xs font-semibold whitespace-nowrap transition-all"
            style={{
              borderRadius: '16px',
              backgroundColor: selectedCategory === 'all' ? '#FF8A00' : '#111827',
              color: selectedCategory === 'all' ? '#F9FAFB' : '#9CA3AF',
              border: selectedCategory === 'all' ? 'none' : '1px solid rgba(255,255,255,0.08)',
            }}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className="px-4 py-2 text-xs font-semibold whitespace-nowrap transition-all"
              style={{
                borderRadius: '16px',
                backgroundColor: selectedCategory === cat.id ? '#FF8A00' : '#111827',
                color: selectedCategory === cat.id ? '#F9FAFB' : '#9CA3AF',
                border: selectedCategory === cat.id ? 'none' : '1px solid rgba(255,255,255,0.08)',
              }}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Menu grid */}
        <div className="flex-1 overflow-y-auto grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 content-start">
          {filteredItems.map((item) => (
            <button
              key={item.id}
              onClick={() => addToCart(item)}
              className="p-4 text-left border transition-all hover:border-[rgba(255,138,0,0.3)]"
              style={{
                backgroundColor: '#1A1F2E',
                borderRadius: '16px',
                borderColor: 'rgba(255,255,255,0.05)',
              }}
            >
              <p className="text-sm font-medium mb-1 line-clamp-2" style={{ color: '#F9FAFB' }}>
                {item.name}
              </p>
              <div className="flex items-center justify-between mt-2">
                <span className="text-sm font-bold" style={{ color: '#FF8A00' }}>₹{item.price}</span>
                <Plus className="w-4 h-4" style={{ color: '#9CA3AF' }} />
              </div>
            </button>
          ))}
          {filteredItems.length === 0 && (
            <div className="col-span-full text-center py-12">
              <p style={{ color: '#9CA3AF' }}>No items found</p>
            </div>
          )}
        </div>
      </div>

      {/* Right: Order cart (40%) */}
      <div
        className="w-[40%] flex flex-col overflow-hidden"
        style={{ backgroundColor: '#1A1F2E', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)' }}
      >
        {/* Order type selector */}
        <div className="p-4 shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <div className="flex gap-1 p-1" style={{ backgroundColor: '#111827', borderRadius: '12px' }}>
            {ORDER_TYPES.map((t) => (
              <button
                key={t.value}
                onClick={() => setOrderType(t.value)}
                className="flex-1 py-2 text-xs font-semibold transition-all"
                style={{
                  borderRadius: '8px',
                  backgroundColor: orderType === t.value ? '#FF8A00' : 'transparent',
                  color: orderType === t.value ? '#F9FAFB' : '#9CA3AF',
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Conditional fields */}
          <div className="mt-3 space-y-2">
            {orderType === 'DINE_IN' && (
              <select
                value={tableId}
                onChange={(e) => setTableId(e.target.value)}
                className="w-full px-3 py-2.5 text-sm outline-none"
                style={{
                  backgroundColor: '#09090B',
                  borderRadius: '10px',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: '#F9FAFB',
                }}
              >
                <option value="">Select Table</option>
                {tables.map((t) => (
                  <option key={t.id} value={t.id}>Table {t.number}</option>
                ))}
              </select>
            )}
            {orderType !== 'DINE_IN' && (
              <>
                <input
                  type="text"
                  placeholder="Customer name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm outline-none"
                  style={{
                    backgroundColor: '#09090B',
                    borderRadius: '10px',
                    border: '1px solid rgba(255,255,255,0.08)',
                    color: '#F9FAFB',
                  }}
                />
                <input
                  type="tel"
                  placeholder="Phone number"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm outline-none"
                  style={{
                    backgroundColor: '#09090B',
                    borderRadius: '10px',
                    border: '1px solid rgba(255,255,255,0.08)',
                    color: '#F9FAFB',
                  }}
                />
                <input
                  type="datetime-local"
                  placeholder="Scheduled pickup (optional)"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm outline-none"
                  style={{
                    backgroundColor: '#09090B',
                    borderRadius: '10px',
                    border: '1px solid rgba(255,255,255,0.08)',
                    color: '#9CA3AF',
                  }}
                />
              </>
            )}
          </div>
        </div>

        {/* Cart items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {cart.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-sm" style={{ color: '#9CA3AF' }}>Add items from the menu</p>
            </div>
          ) : (
            cart.map((item) => (
              <div
                key={item.menuItemId}
                className="flex items-center justify-between p-3"
                style={{ backgroundColor: '#09090B', borderRadius: '12px' }}
              >
                <div className="flex-1 min-w-0 mr-3">
                  <p className="text-sm truncate" style={{ color: '#F9FAFB' }}>{item.name}</p>
                  <p className="text-xs" style={{ color: '#9CA3AF' }}>₹{item.price} each</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => updateQty(item.menuItemId, -1)}
                    className="p-1 transition-colors hover:opacity-80"
                    style={{ backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: '6px' }}
                  >
                    {item.quantity === 1 ? (
                      <Trash2 className="w-3.5 h-3.5" style={{ color: '#EF4444' }} />
                    ) : (
                      <Minus className="w-3.5 h-3.5" style={{ color: '#9CA3AF' }} />
                    )}
                  </button>
                  <span className="text-sm font-semibold w-6 text-center" style={{ color: '#F9FAFB' }}>
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => updateQty(item.menuItemId, 1)}
                    className="p-1 transition-colors hover:opacity-80"
                    style={{ backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: '6px' }}
                  >
                    <Plus className="w-3.5 h-3.5" style={{ color: '#9CA3AF' }} />
                  </button>
                </div>
                <span className="ml-3 text-sm font-semibold whitespace-nowrap" style={{ color: '#F9FAFB' }}>
                  ₹{item.price * item.quantity}
                </span>
              </div>
            ))
          )}
        </div>

        {/* Totals + action */}
        <div className="p-4 shrink-0 space-y-2" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <div className="flex justify-between text-sm">
            <span style={{ color: '#9CA3AF' }}>Subtotal</span>
            <span style={{ color: '#F9FAFB' }}>₹{subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span style={{ color: '#9CA3AF' }}>GST (5%)</span>
            <span style={{ color: '#F9FAFB' }}>₹{gst.toFixed(2)}</span>
          </div>
          {packingCharge > 0 && (
            <div className="flex justify-between text-sm">
              <span style={{ color: '#9CA3AF' }}>Packing Charge</span>
              <span style={{ color: '#F9FAFB' }}>₹{packingCharge}</span>
            </div>
          )}
          <div className="flex justify-between text-base font-bold pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <span style={{ color: '#F9FAFB' }}>Total</span>
            <span style={{ color: '#FF8A00' }}>₹{total.toFixed(2)}</span>
          </div>

          <button
            onClick={handlePlaceOrder}
            disabled={cart.length === 0 || placeOrder.isPending}
            className="w-full py-3.5 text-sm font-bold transition-all disabled:opacity-50"
            style={{ backgroundColor: '#FF8A00', color: '#F9FAFB', borderRadius: '12px' }}
          >
            {placeOrder.isPending
              ? 'Placing...'
              : orderType === 'DINE_IN'
                ? 'Send to Kitchen'
                : 'Place Order & Print Token'}
          </button>
        </div>
      </div>
    </div>
  )
}
