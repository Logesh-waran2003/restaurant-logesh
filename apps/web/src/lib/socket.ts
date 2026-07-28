import { io, Socket } from 'socket.io-client'

// ponytail: typed events would come from @restaurant/shared once defined
// for now we use a loose type — upgrade path: import ServerToClientEvents from shared
interface ServerEvents {
  'order:new': (order: unknown) => void
  'order:status': (data: { orderId: string; status: string }) => void
  'order:updated': (order: unknown) => void
  'kds:ticket': (ticket: unknown) => void
}

interface ClientEvents {
  'order:subscribe': (tableId: string) => void
  'kds:subscribe': (department?: string) => void
  'kds:markReady': (orderId: string) => void
}

export const socket: Socket<ServerEvents, ClientEvents> = io('/', {
  path: '/socket.io',
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  auth: () => {
    const token = localStorage.getItem('accessToken')
    return { token }
  },
})

socket.on('connect_error', (err) => {
  console.warn('[socket] connection error:', err.message)
})
