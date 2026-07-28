export interface OrderPlacedPayload {
  orderId: string;
  tableId: string;
  tableNumber: number;
  items: { name: string; quantity: number }[];
  createdAt: string;
}

export interface OrderStatusChangedPayload {
  orderId: string;
  status: string;
  updatedBy: string;
}

export interface KotUpdatePayload {
  kotId: string;
  orderId: string;
  department: string;
  items: { name: string; quantity: number; status: string }[];
}

export interface TableSessionUpdatePayload {
  tableId: string;
  sessionId: string;
  status: 'active' | 'billing' | 'closed';
}

export interface MenuItemAvailabilityPayload {
  menuItemId: string;
  available: boolean;
}

export interface NotificationPayload {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
}

export interface NewOrderBeepPayload {
  orderId: string;
  tableNumber: number;
}

export interface ServerToClientEvents {
  orderPlaced: (payload: OrderPlacedPayload) => void;
  orderStatusChanged: (payload: OrderStatusChangedPayload) => void;
  kotUpdate: (payload: KotUpdatePayload) => void;
  tableSessionUpdate: (payload: TableSessionUpdatePayload) => void;
  menuItemAvailability: (payload: MenuItemAvailabilityPayload) => void;
  notification: (payload: NotificationPayload) => void;
  newOrderBeep: (payload: NewOrderBeepPayload) => void;
}

export interface JoinRoomPayload {
  room: string;
}

export interface LeaveRoomPayload {
  room: string;
}

export interface UpdateOrderStatusPayload {
  orderId: string;
  status: string;
}

export interface UpdateKotStatusPayload {
  kotId: string;
  itemId: string;
  status: string;
}

export interface MarkReadyPayload {
  orderId: string;
  itemId: string;
}

export interface ClientToServerEvents {
  joinRoom: (payload: JoinRoomPayload) => void;
  leaveRoom: (payload: LeaveRoomPayload) => void;
  updateOrderStatus: (payload: UpdateOrderStatusPayload) => void;
  updateKotStatus: (payload: UpdateKotStatusPayload) => void;
  markReady: (payload: MarkReadyPayload) => void;
}
