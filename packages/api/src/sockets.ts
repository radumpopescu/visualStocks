import { Socket, Server } from 'socket.io';
import { actions } from './actions';

/**
 * Interface for socket request with requestId
 */
interface SocketRequest {
  requestId?: string;
  [key: string]: unknown;
}

/**
 * Interface for socket response with requestId
 */
interface SocketResponse<T> {
  requestId?: string;
  result?: T;
  error?: string;
  [key: string]: unknown;
}

export default function addSocketListeners(socketServer: Server) {
  socketServer.on('connection', async (socket: Socket) => {
    actions.forEach((action) => {
      const { path, f } = action;
      socket.on(path, async (params: SocketRequest) => {
        try {
          // Extract requestId if it exists
          const { requestId, ...actionParams } = params || {};

          const result = f({ params: actionParams as Record<string, unknown>, socket });
          if (result !== undefined) {
            if (result instanceof Promise) {
              // If requestId was provided, include it in the response
              if (requestId) {
                socket.emit(path, { requestId, result: await result } as SocketResponse<unknown>);
              } else {
                socket.emit(path, await result);
              }
            } else {
              // If requestId was provided, include it in the response
              if (requestId) {
                socket.emit(path, { requestId, result } as SocketResponse<unknown>);
              } else {
                socket.emit(path, result);
              }
            }
          }
        } catch (error) {
          console.error({ path, error });

          // If requestId was provided, emit the error with the requestId
          if (params?.requestId) {
            socket.emit(path, {
              requestId: params.requestId,
              error: error instanceof Error ? error.message : 'Unknown error',
            } as SocketResponse<never>);
          }
        }
      });
    });
  });
}
