import { useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { CheckCircle, Clock, ChefHat, Package, PartyPopper } from 'lucide-react'
import { api } from '@/lib/api'
import { socket } from '@/lib/socket'
import { useOrderStore } from '@/lib/store'

const STEPS = ['PLACED', 'PREPARING', 'READY', 'PICKED_UP']
const STEP_LABELS = ['Order Placed', 'Preparing', 'Ready for Pickup', 'Picked Up']
const STEP_ICONS = [Clock, ChefHat, Package, CheckCircle]

export function OrderStatusPage() {
  const { orderId, tableId } = useParams()
  const updateStatus = useOrderStore((s) => s.updateStatus)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const { data: order } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => api.get<{ id: string; status: string; orderNumber: string; total: string; items: { menuItem: { name: string }; quantity: number }[] }>(`/orders/${orderId}`),
    refetchInterval: 5_000,
  })

  useEffect(() => {
    socket.emit('order:subscribe', tableId!)

    const handleStatus = ({ orderId: oid, status }: { orderId: string; status: string }) => {
      if (oid === orderId) {
        updateStatus(oid, status)
        if (status === 'READY') {
          audioRef.current?.play().catch(() => {})
        }
      }
    }

    socket.on('order:status', handleStatus)
    return () => { socket.off('order:status', handleStatus) }
  }, [orderId, tableId, updateStatus])

  const currentStep = order ? STEPS.indexOf(order.status) : 0

  return (
    <div className="p-6 flex flex-col items-center min-h-[80vh]">
      <audio ref={audioRef} src="/notification.mp3" preload="auto" />

      {/* Order header */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="text-center mb-8"
      >
        <div className="w-16 h-16 bg-[#FF8A00]/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8 text-[#FF8A00]" />
        </div>
        <h2 className="text-2xl font-bold text-[#111827]">Order #{order?.orderNumber ?? '...'}</h2>
        <p className="text-sm text-[#6B7280] mt-1">Track your order status below</p>
        {order?.total && (
          <p className="text-lg font-bold text-[#111827] mt-2">₹{Number(order.total).toFixed(0)}</p>
        )}
      </motion.div>

      {/* Status stepper */}
      <div className="w-full max-w-sm">
        {STEPS.map((step, i) => {
          const isActive = i <= currentStep
          const isCurrent = i === currentStep
          const Icon = STEP_ICONS[i]
          return (
            <div key={step} className="flex items-start gap-4">
              <div className="flex flex-col items-center">
                <motion.div
                  animate={{ scale: isCurrent ? [1, 1.1, 1] : 1 }}
                  transition={{ repeat: isCurrent ? Infinity : 0, duration: 2 }}
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                    isActive
                      ? 'bg-[#FF8A00] text-white shadow-lg shadow-[#FF8A00]/30'
                      : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </motion.div>
                {i < STEPS.length - 1 && (
                  <div className={`w-0.5 h-12 transition-colors ${isActive ? 'bg-[#FF8A00]' : 'bg-gray-200'}`} />
                )}
              </div>
              <div className="pt-2">
                <p className={`font-semibold ${isActive ? 'text-[#111827]' : 'text-[#9CA3AF]'}`}>
                  {STEP_LABELS[i]}
                </p>
                {isCurrent && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-xs text-[#FF8A00] font-medium mt-0.5"
                  >
                    Current status
                  </motion.p>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Order items summary */}
      {order?.items && order.items.length > 0 && (
        <div className="mt-8 w-full max-w-sm bg-gray-50 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-[#6B7280] uppercase tracking-wider mb-2">Order Summary</h3>
          {order.items.map((item: any, i: number) => (
            <div key={i} className="flex justify-between py-1.5 text-sm">
              <span className="text-[#111827]">{item.menuItem?.name || item.name}</span>
              <span className="text-[#6B7280]">×{item.quantity}</span>
            </div>
          ))}
        </div>
      )}

      {/* Ready notification */}
      {order?.status === 'READY' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-8 p-5 bg-green-50 border border-green-200 rounded-2xl text-center w-full max-w-sm"
        >
          <PartyPopper className="w-8 h-8 text-green-600 mx-auto mb-2" />
          <p className="text-lg font-bold text-green-700">Your order is ready!</p>
          <p className="text-sm text-green-600 mt-1">Please pick up at the counter</p>
        </motion.div>
      )}
    </div>
  )
}
