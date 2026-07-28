import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useCartStore, useOrderStore } from '@/lib/store'
import { api } from '@/lib/api'

const SPICE_LEVELS = ['Mild', 'Medium', 'Spicy', 'Extra Spicy']
const GST_RATE = 0.05

export function CartPage() {
  const { tableId } = useParams()
  const navigate = useNavigate()
  const { items, updateQuantity, updateItem, clear, total } = useCartStore()
  const addOrder = useOrderStore((s) => s.addOrder)
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'UPI' | 'CARD'>('CASH')
  const [placing, setPlacing] = useState(false)

  const subtotal = total()
  const gst = subtotal * GST_RATE
  const grandTotal = subtotal + gst

  const placeOrder = async () => {
    if (items.length === 0) return
    setPlacing(true)
    try {
      const order = await api.post<{ id: string; status: string; total: number; createdAt: string }>('/orders', {
        tableId,
        items: items.map((i) => ({
          menuItemId: i.id,
          quantity: i.quantity,
          spiceLevel: i.spiceLevel,
          instructions: i.instructions,
        })),
        paymentMethod,
      })
      addOrder({ ...order, tableId: tableId!, items, total: grandTotal })
      clear()
      navigate(`/order/${tableId}/status/${order.id}`)
    } catch (err) {
      console.error('Failed to place order:', err)
    } finally {
      setPlacing(false)
    }
  }

  if (items.length === 0) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted">Your cart is empty</p>
        <button
          onClick={() => navigate(`/order/${tableId}`)}
          className="mt-4 px-4 py-2 bg-accent text-white rounded-lg font-medium"
        >
          Browse Menu
        </button>
      </div>
    )
  }

  return (
    <div className="p-4 pb-24 space-y-4">
      <h2 className="text-lg font-bold text-ink">Your Order</h2>

      {/* Items */}
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-semibold text-ink">{item.name}</h3>
                <p className="text-sm text-muted">₹{item.price} each</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => updateQuantity(item.id, item.quantity - 1)}
                  className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center font-bold text-ink"
                >
                  −
                </button>
                <span className="w-6 text-center font-semibold">{item.quantity}</span>
                <button
                  onClick={() => updateQuantity(item.id, item.quantity + 1)}
                  className="w-7 h-7 rounded-full bg-accent/10 flex items-center justify-center font-bold text-accent"
                >
                  +
                </button>
              </div>
            </div>

            {/* Spice level */}
            <div className="mt-3 flex gap-1">
              {SPICE_LEVELS.map((level, i) => (
                <button
                  key={level}
                  onClick={() => updateItem(item.id, { spiceLevel: i })}
                  className={`px-2 py-0.5 rounded text-xs font-medium ${
                    item.spiceLevel === i ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-muted'
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>

            {/* Instructions */}
            <input
              type="text"
              placeholder="Special instructions..."
              value={item.instructions || ''}
              onChange={(e) => updateItem(item.id, { instructions: e.target.value })}
              className="mt-2 w-full text-sm px-3 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/30"
            />
          </div>
        ))}
      </div>

      {/* Totals */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted">Subtotal</span>
          <span>₹{subtotal.toFixed(0)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted">GST (5%)</span>
          <span>₹{gst.toFixed(0)}</span>
        </div>
        <div className="flex justify-between font-bold text-ink pt-2 border-t">
          <span>Total</span>
          <span>₹{grandTotal.toFixed(0)}</span>
        </div>
      </div>

      {/* Payment method */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <p className="text-sm font-medium text-ink mb-2">Payment Method</p>
        <div className="flex gap-2">
          {(['CASH', 'UPI', 'CARD'] as const).map((method) => (
            <button
              key={method}
              onClick={() => setPaymentMethod(method)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                paymentMethod === method
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'border-gray-200 text-muted'
              }`}
            >
              {method}
            </button>
          ))}
        </div>
      </div>

      {/* Place order button */}
      <button
        onClick={placeOrder}
        disabled={placing}
        className="w-full py-3 bg-accent text-white font-bold rounded-xl shadow-lg disabled:opacity-50 transition-opacity"
      >
        {placing ? 'Placing Order...' : `Place Order — ₹${grandTotal.toFixed(0)}`}
      </button>
    </div>
  )
}
