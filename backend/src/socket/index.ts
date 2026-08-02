import { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import type { ServerToClientEvents, ClientToServerEvents, JoinRoomPayload, LeaveRoomPayload, UpdateOrderStatusPayload, UpdateKotStatusPayload } from '../shared';

// ponytail: Redis adapter not wired yet — add `createAdapter` from @socket.io/redis-adapter when scaling horizontally

export function initSocket(httpServer: HttpServer) {
  const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
    cors: { origin: process.env.CORS_ORIGIN?.split(',') ?? '*', credentials: true },
  } as any);

  io.on('connection', (socket) => {
    socket.on('joinRoom', (payload: JoinRoomPayload) => {
      socket.join(payload.room);
    });

    socket.on('leaveRoom', (payload: LeaveRoomPayload) => {
      socket.leave(payload.room);
    });

    socket.on('updateOrderStatus', (payload: UpdateOrderStatusPayload) => {
      io.to('kitchen').to('admin').emit('orderStatusChanged', {
        orderId: payload.orderId,
        status: payload.status,
        updatedBy: 'socket',
      });
    });

    socket.on('updateKotStatus', (payload: UpdateKotStatusPayload) => {
      io.to('kitchen').emit('kotUpdate', {
        kotId: payload.kotId,
        orderId: '',
        department: '',
        items: [{ name: '', quantity: 0, status: payload.status }],
      });
    });

    socket.on('disconnect', () => {});
  });

  return io;
}
