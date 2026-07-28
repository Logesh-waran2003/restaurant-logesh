import { create } from 'zustand'
import { api } from './api'
import { socket } from './socket'

// ─── Auth Store ───────────────────────────────────────────────────────────────

interface User {
  id: string
  name: string
  phone: string
  role: string
}

interface AuthState {
  user: User | null
  accessToken: string | null
  login: (phone: string, password: string) => Promise<void>
  logout: () => void
  hydrate: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,

  login: async (phone, password) => {
    const data = await api.post<{ user: User; accessToken: string; refreshToken: string }>(
      '/auth/login',
      { phone, password },
    )
    localStorage.setItem('accessToken', data.accessToken)
    localStorage.setItem('refreshToken', data.refreshToken)
    set({ user: data.user, accessToken: data.accessToken })
  },

  logout: () => {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    set({ user: null, accessToken: null })
  },

  hydrate: () => {
    const token = localStorage.getItem('accessToken')
    if (!token) return
    // ponytail: decode JWT payload for user info — upgrade path: /auth/me endpoint
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      set({ user: payload, accessToken: token })
    } catch {
      localStorage.removeItem('accessToken')
    }
  },
}))

// ─── Cart Store ───────────────────────────────────────────────────────────────

interface CartItem {
  id: string
  name: string
  nameTA?: string
  price: number
  quantity: number
  spiceLevel?: number
  instructions?: string
  image?: string
}

interface CartState {
  items: CartItem[]
  addItem: (item: Omit<CartItem, 'quantity'>) => void
  removeItem: (id: string) => void
  updateQuantity: (id: string, quantity: number) => void
  updateItem: (id: string, updates: Partial<CartItem>) => void
  clear: () => void
  total: () => number
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],

  addItem: (item) =>
    set((state) => {
      const existing = state.items.find((i) => i.id === item.id)
      if (existing) {
        return { items: state.items.map((i) => (i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i)) }
      }
      return { items: [...state.items, { ...item, quantity: 1 }] }
    }),

  removeItem: (id) => set((state) => ({ items: state.items.filter((i) => i.id !== id) })),

  updateQuantity: (id, quantity) =>
    set((state) => ({
      items: quantity <= 0 ? state.items.filter((i) => i.id !== id) : state.items.map((i) => (i.id === id ? { ...i, quantity } : i)),
    })),

  updateItem: (id, updates) =>
    set((state) => ({
      items: state.items.map((i) => (i.id === id ? { ...i, ...updates } : i)),
    })),

  clear: () => set({ items: [] }),

  total: () => get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),
}))

// ─── Order Store ──────────────────────────────────────────────────────────────

interface Order {
  id: string
  tableId: string
  status: string
  items: CartItem[]
  total: number
  createdAt: string
}

interface OrderState {
  activeOrders: Order[]
  addOrder: (order: Order) => void
  updateStatus: (orderId: string, status: string) => void
}

export const useOrderStore = create<OrderState>((set) => {
  // Listen to socket for real-time updates
  socket.on('order:status', ({ orderId, status }) => {
    set((state) => ({
      activeOrders: state.activeOrders.map((o) => (o.id === orderId ? { ...o, status } : o)),
    }))
  })

  socket.on('order:new', (order) => {
    set((state) => ({ activeOrders: [order as Order, ...state.activeOrders] }))
  })

  return {
    activeOrders: [],
    addOrder: (order) => set((state) => ({ activeOrders: [order, ...state.activeOrders] })),
    updateStatus: (orderId, status) =>
      set((state) => ({
        activeOrders: state.activeOrders.map((o) => (o.id === orderId ? { ...o, status } : o)),
      })),
  }
})
