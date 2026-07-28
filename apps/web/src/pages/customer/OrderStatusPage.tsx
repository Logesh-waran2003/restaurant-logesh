import { useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { api } from '@/lib/api'
import { socket } from '@/lib/socket'
import { useOrderStore } from '@/lib/store'

const STEPS = ['PLACED', 'PREPARING', 'READY', 'PICKED_UP']
const STEP_LABELS = ['Placed', 'Preparing', 'Ready', 'Picked Up']

export function OrderStatusPage() {
  const { orderId, tableId } = useParams()
  const updateStatus = useOrderStore((s) => s.updateStatus)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const { data: order } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => api.get<{ id: string; status: string; orderNumber: string; items: unknown[] }>(`/orders/${orderId}`),
    refetchInterval: 10_000,
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
    <div className="p-6 flex flex-col items-center">
      {/* Hidden audio for pickup notification */}
      <audio ref={audioRef} src="/notification.mp3" preload="auto" />

      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="text-center mb-8"
      >
        <h2 className="text-xl font-bold text-ink">Order #{order?.orderNumber || '...'}</h2>
        <p className="text-sm text-muted mt-1">Track your order status below</p>
      </motion.div>

      {/* Status stepper */}
      <div className="w-full max-w-sm space-y-0">
        {STEPS.map((step, i) => {
          const isActive = i <= currentStep
          const isCurrent = i === currentStep
          return (
            <div key={step} className="flex items-start gap-4">
              <div className="flex flex-col items-center">
                <motion.div
                  animate={{ scale: isCurrent ? [1, 1.2, 1] : 1 }}
                  transition={{ repeat: isCurrent ? Infinity : 0, duration: 1.5 }}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    isActive ? 'bg-accent text-white' : 'bg-gray-200 text-muted'
                  }`}
                >
                  {isActive ? '✓' : i + 1}
                </motion.div>
                {i < STEPS.length - 1 && (
                  <div className={`w-0.5 h-10 ${isActive ? 'bg-accent' : 'bg-gray-200'}`} />
                )}
              </div>
              <div className="pt-1">
                <p className={`font-medium ${isActive ? 'text-ink' : 'text-muted'}`}>
                  {STEP_LABELS[i]}
                </p>
                {isCurrent && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-xs text-accent mt-0.5"
                  >
                    Current status
                  </motion.p>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {order?.status === 'READY' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-8 p-4 bg-green-50 border border-green-200 rounded-xl text-center"
        >
          <p className="text-lg font-bold text-green-700">🎉 Your order is ready!</p>
          <p className="text-sm text-green-600 mt-1">Please pick up at the counter</p>
        </motion.div>
      )}
    </div>
  )
}
