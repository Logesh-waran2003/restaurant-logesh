import { useEffect, useRef } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { api } from '@/lib/api'
import { socket } from '@/lib/socket'

interface KDSOrder {
  id: string
  orderNumber: string
  tableId: string
  status: 'NEW' | 'PREPARING' | 'READY'
  items: { name: string; quantity: number; spiceLevel?: number; instructions?: string }[]
  createdAt: string
}

const COLUMNS = ['NEW', 'PREPARING', 'READY'] as const

function getElapsedMinutes(createdAt: string): number {
  return Math.floor((Date.now() - new Date(createdAt).getTime()) / 60_000)
}

export function KDSPage() {
  const { department } = useOutletContext<{ department: string }>()
  const queryClient = useQueryClient()
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const { data: orders = [] } = useQuery({
    queryKey: ['kds-orders', department],
    queryFn: () => api.get<KDSOrder[]>(`/orders/kds${department !== 'ALL' ? `?department=${department}` : ''}`),
    refetchInterval: 15_000,
  })

  const markReady = useMutation({
    mutationFn: (orderId: string) => api.patch(`/orders/${orderId}/status`, { status: 'READY' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['kds-orders'] }),
  })

  const markPreparing = useMutation({
    mutationFn: (orderId: string) => api.patch(`/orders/${orderId}/status`, { status: 'PREPARING' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['kds-orders'] }),
  })

  useEffect(() => {
    socket.emit('kds:subscribe', department === 'ALL' ? undefined : department)

    const handleNewTicket = () => {
      audioRef.current?.play().catch(() => {})
      queryClient.invalidateQueries({ queryKey: ['kds-orders'] })
    }

    socket.on('kds:ticket', handleNewTicket)
    return () => { socket.off('kds:ticket', handleNewTicket) }
  }, [department, queryClient])

  return (
    <div className="h-full flex gap-4 p-4 overflow-hidden">
      {/* Audio beep */}
      <audio ref={audioRef} src="/beep.mp3" preload="auto" />

      {COLUMNS.map((col) => {
        const colOrders = orders.filter((o) => o.status === col)
        return (
          <div key={col} className="flex-1 flex flex-col min-w-0">
            <div className="flex items-center justify-between mb-3 px-2">
              <h2 className="font-bold text-white/80 uppercase text-sm tracking-wide">{col}</h2>
              <span className="text-xs bg-white/10 px-2 py-0.5 rounded-full text-white/60">
                {colOrders.length}
              </span>
            </div>
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              <AnimatePresence>
                {colOrders.map((order) => {
                  const elapsed = getElapsedMinutes(order.createdAt)
                  const isRush = elapsed > 15
                  return (
                    <motion.div
                      key={order.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, x: 100 }}
                      className={`rounded-xl p-4 border ${
                        isRush ? 'bg-red-900/30 border-red-500/50' : 'bg-white/5 border-white/10'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-white">#{order.orderNumber}</span>
                        <div className="flex items-center gap-2">
                          {isRush && (
                            <span className="text-[10px] font-bold bg-red-500 text-white px-1.5 py-0.5 rounded animate-pulse">
                              RUSH
                            </span>
                          )}
                          <span className="text-xs text-white/50">T{order.tableId}</span>
                          <span className="text-xs text-white/40">{elapsed}m</span>
                        </div>
                      </div>
                      <ul className="space-y-1">
                        {order.items.map((item, i) => (
                          <li key={i} className="text-sm text-white/80 flex gap-2">
                            <span className="text-accent font-semibold">{item.quantity}×</span>
                            <span>{item.name}</span>
                            {item.instructions && (
                              <span className="text-white/40 text-xs italic">({item.instructions})</span>
                            )}
                          </li>
                        ))}
                      </ul>
                      <div className="mt-3 flex gap-2">
                        {col === 'NEW' && (
                          <button
                            onClick={() => markPreparing.mutate(order.id)}
                            className="flex-1 py-1.5 bg-blue-500/20 text-blue-300 text-xs font-semibold rounded-lg hover:bg-blue-500/30"
                          >
                            Start
                          </button>
                        )}
                        {(col === 'NEW' || col === 'PREPARING') && (
                          <button
                            onClick={() => markReady.mutate(order.id)}
                            className="flex-1 py-1.5 bg-green-500/20 text-green-300 text-xs font-semibold rounded-lg hover:bg-green-500/30"
                          >
                            Ready
                          </button>
                        )}
                      </div>
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            </div>
          </div>
        )
      })}
    </div>
  )
}
