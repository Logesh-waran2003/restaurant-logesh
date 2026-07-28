import { useState } from 'react'
import { useParams, useNavigate, useOutletContext } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { useCartStore, useOrderStore } from '@/lib/store'
import { api } from '@/lib/api'
import {
  Trash2,
  Plus,
  Minus,
  ChevronDown,
  ChevronUp,
  Smartphone,
  CreditCard,
  Banknote,
  ShoppingBag,
} from 'lucide-react'

const GST_RATE = 0.05

export function CartPage() {
  const { tableId } = useParams()
  const { lang } = useOutletContext<{ lang: 'EN' | 'TA'; tableId: string }>()
  const navigate = useNavigate()
  const { items, updateQuantity, updateItem, removeItem, clear, total } = useCartStore()
  const addOrder = useOrderStore((s) => s.addOrder)
  const [paymentMethod, setPaymentMethod] = useState<'UPI' | 'CARD' | 'CASH'>('UPI')
  const [expandedInstructions, setExpandedInstructions] = useState<Set<string>>(new Set())
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')

  const subtotal = total()
  const gst = subtotal * GST_RATE
  const grandTotal = subtotal + gst

  const toggleInstructions = (id: string) => {
    setExpandedInstructions((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const { mutate: placeOrder, isPending } = useMutation({
    mutationFn: () =>
      api.post<{ id: string; status: string; total: number; createdAt: string }>('/orders', {
        tableId,
        customerName,
        customerPhone,
        items: items.map((i) => ({
          menuItemId: i.id,
          quantity: i.quantity,
          spiceLevel: i.spiceLevel,
          instructions: i.instructions,
        })),
        paymentMethod,
      }),
    onSuccess: (order) => {
      addOrder({ ...order, tableId: tableId!, items, total: grandTotal })
      clear()
      navigate(`/order/${tableId}/status/${order.id}`)
    },
  })

  if (items.length === 0) {
    return (
      <div className="p-8 text-center flex flex-col items-center gap-4 mt-12">
        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
          <ShoppingBag className="w-7 h-7 text-gray-400" />
        </div>
        <p className="text-gray-500 font-medium">
          {lang === 'TA' ? 'உங்கள் கூடை காலி' : 'Your order is empty'}
        </p>
        <button
          onClick={() => navigate(`/order/${tableId}`)}
          className="px-6 py-2.5 bg-[#FF8A00] text-white text-sm font-semibold rounded-xl hover:bg-[#E67A00] transition-colors"
        >
          {lang === 'TA' ? 'உணவு பார்க்க' : 'Browse Menu'}
        </button>
      </div>
    )
  }

  return (
    <div className="p-4 pb-6 space-y-4 max-w-lg mx-auto bg-gray-50 min-h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">
          {lang === 'TA' ? 'உங்கள் ஆர்டர்' : 'Your Order'}
        </h2>
        <span className="text-sm text-gray-500">
          {items.reduce((s, i) => s + i.quantity, 0)} items
        </span>
      </div>

      {/* Items */}
      <div className="space-y-3">
        <AnimatePresence>
          {items.map((item, i) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -100 }}
              transition={{ delay: i * 0.05 }}
              className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm"
            >
              {/* Name + price + qty + remove */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 text-[15px] truncate">
                    {lang === 'TA' && item.nameTA ? item.nameTA : item.name}
                  </h3>
                  <p className="text-sm text-gray-500 mt-0.5">
                    ₹{item.price} x {item.quantity} ={' '}
                    <span className="font-semibold text-gray-900">
                      ₹{(item.price * item.quantity).toFixed(0)}
                    </span>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {/* Qty controls */}
                  <div className="flex items-center gap-1.5 bg-gray-50 rounded-xl px-1.5 py-1">
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      className="w-7 h-7 rounded-lg border border-gray-200 bg-white flex items-center justify-center text-gray-600 hover:bg-gray-50"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-6 text-center font-bold text-sm text-gray-900">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="w-7 h-7 rounded-lg bg-[#FF8A00] text-white flex items-center justify-center hover:bg-[#E67A00]"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Remove */}
                  <button
                    onClick={() => removeItem(item.id)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Spice level */}
              <div className="mt-3">
                <p className="text-[11px] text-gray-400 uppercase tracking-wider font-medium mb-1.5">
                  {lang === 'TA' ? 'காரம்' : 'Spice Level'}
                </p>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((level) => (
                    <button
                      key={level}
                      onClick={() => updateItem(item.id, { spiceLevel: level })}
                      className={`text-xl transition-all ${
                        (item.spiceLevel || 0) >= level
                          ? 'opacity-100 scale-110'
                          : 'opacity-30 grayscale'
                      }`}
                      aria-label={`Spice level ${level}`}
                    >
                      🌶️
                    </button>
                  ))}
                </div>
              </div>

              {/* Special instructions (collapsed by default) */}
              <div className="mt-3">
                <button
                  onClick={() => toggleInstructions(item.id)}
                  className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition-colors"
                >
                  {expandedInstructions.has(item.id) ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                  <span>
                    {item.instructions
                      ? lang === 'TA' ? 'குறிப்பு திருத்த' : 'Edit note'
                      : lang === 'TA' ? 'குறிப்பு சேர்க்க' : 'Add note'}
                  </span>
                </button>
                {expandedInstructions.has(item.id) && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    transition={{ duration: 0.2 }}
                  >
                    <textarea
                      placeholder={
                        lang === 'TA' ? 'சிறப்பு குறிப்புகள்...' : 'Special instructions...'
                      }
                      value={item.instructions || ''}
                      onChange={(e) => updateItem(item.id, { instructions: e.target.value })}
                      rows={2}
                      className="mt-2 w-full text-sm border border-gray-200 rounded-xl px-3 py-2 bg-gray-50 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF8A00]/20 focus:border-[#FF8A00] resize-none"
                    />
                  </motion.div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Bill summary */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
        <h4 className="font-semibold text-gray-900 text-sm mb-3">
          {lang === 'TA' ? 'பில் விவரம்' : 'Bill Summary'}
        </h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">{lang === 'TA' ? 'உணவு மொத்தம்' : 'Subtotal'}</span>
            <span className="text-gray-900">₹{subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">GST @ 5%</span>
            <span className="text-gray-900">₹{gst.toFixed(2)}</span>
          </div>
          <div className="border-t border-gray-100 my-2" />
          <div className="flex justify-between font-bold text-base pt-1">
            <span className="text-gray-900">{lang === 'TA' ? 'மொத்தம்' : 'Total'}</span>
            <span className="text-[#FF8A00]">₹{grandTotal.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Payment selector */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
        <h4 className="font-semibold text-gray-900 text-sm mb-3">
          {lang === 'TA' ? 'பணம் செலுத்தும் முறை' : 'Pay with'}
        </h4>
        <div className="grid grid-cols-3 gap-2">
          <PaymentOption
            icon={<Smartphone className="w-5 h-5" />}
            label="UPI"
            active={paymentMethod === 'UPI'}
            onClick={() => setPaymentMethod('UPI')}
          />
          <PaymentOption
            icon={<CreditCard className="w-5 h-5" />}
            label="Card"
            active={paymentMethod === 'CARD'}
            onClick={() => setPaymentMethod('CARD')}
          />
          <PaymentOption
            icon={<Banknote className="w-5 h-5" />}
            label="Cash"
            active={paymentMethod === 'CASH'}
            onClick={() => setPaymentMethod('CASH')}
          />
        </div>
      </div>

      {/* Customer Details */}
      <div className="bg-white rounded-2xl p-4 border border-gray-100">
        <h3 className="text-sm font-semibold text-[#111827] mb-3">Your Details</h3>
        <div className="space-y-3">
          <input
            type="text"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="Your name"
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-[#111827] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF8A00]/30 focus:border-[#FF8A00]"
          />
          <input
            type="tel"
            value={customerPhone}
            onChange={(e) => setCustomerPhone(e.target.value)}
            placeholder="Phone number (for order updates)"
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-[#111827] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF8A00]/30 focus:border-[#FF8A00]"
          />
        </div>
      </div>

      {/* Place Order button */}
      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={() => placeOrder()}
        disabled={isPending || !customerName.trim() || !customerPhone.trim()}
        className="w-full bg-[#FF8A00] hover:bg-[#E67A00] text-white py-4 text-base font-bold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#FF8A00]/20"
      >
        {isPending
          ? lang === 'TA'
            ? 'ஆர்டர் செய்கிறோம்...'
            : 'Placing Order...'
          : lang === 'TA'
            ? `ஆர்டர் செய் — ₹${grandTotal.toFixed(0)}`
            : `Place Order — ₹${grandTotal.toFixed(0)}`}
      </motion.button>
    </div>
  )
}

/* ─── Sub-components ─────────────────────────────────────────── */

function PaymentOption({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${
        active
          ? 'border-[#FF8A00] bg-[#FF8A00]/5'
          : 'border-gray-200 bg-white hover:border-gray-300'
      }`}
    >
      <span className={active ? 'text-[#FF8A00]' : 'text-gray-500'}>{icon}</span>
      <span className={`text-xs font-semibold ${active ? 'text-[#FF8A00]' : 'text-gray-700'}`}>
        {label}
      </span>
    </button>
  )
}
