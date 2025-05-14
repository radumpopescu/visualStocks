import { io, Socket } from 'socket.io-client';

let socket: Socket;

export default function getSocket(): Socket {
  if (socket === undefined) {
    // In development, we need to connect to the backend on port 6969
    // In production, connect to the same host
    const isDev = import.meta.env.DEV;

    if (isDev) {
      const { host } = window.location;
      const hostWithoutPort = host.split(':')[0];
      socket = io(`ws://${hostWithoutPort}:6969`);
    } else {
      socket = io(window.location.origin);
    }
  }
  return socket;
}
