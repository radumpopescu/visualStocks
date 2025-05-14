import { Socket } from 'socket.io-client';

/**
 * Interface for socket response with requestId
 */
interface SocketResponse<T> {
  requestId: string;
  result?: T;
  error?: string;
  [key: string]: unknown;
}

/**
 * Makes a socket request with a unique requestId and returns a promise that resolves with the response
 *
 * @param socket The socket.io client socket
 * @param action The action name (event name)
 * @param params The parameters to send with the request
 * @param timeoutMs Timeout in milliseconds (default: 5000)
 * @returns Promise that resolves with the response or rejects with an error
 */
export function socketRequestWithId<T = unknown>(
  socket: Socket,
  action: string,
  params: Record<string, unknown> = {},
  timeoutMs: number = 5000,
): Promise<T> {
  return new Promise((resolve, reject) => {
    // Generate a unique requestId
    const requestId = Date.now().toString() + Math.random().toString(36).slice(2);

    // Set up response listener
    const responseHandler = (response: SocketResponse<T>) => {
      // Only handle responses with matching requestId
      if (response?.requestId === requestId) {
        // Clean up listener and timeout
        socket.off(action, responseHandler);
        clearTimeout(timeoutTimer);

        if (response.error) {
          reject(new Error(response.error));
        } else {
          resolve(response.result as T);
        }
      }
    };

    // Set up timeout
    const timeoutTimer = setTimeout(() => {
      socket.off(action, responseHandler);
      reject(new Error(`Request timeout for ${action} after ${timeoutMs}ms`));
    }, timeoutMs);

    // Listen for response
    socket.on(action, responseHandler);

    // Emit request with requestId
    socket.emit(action, { requestId, ...params });
  });
}
