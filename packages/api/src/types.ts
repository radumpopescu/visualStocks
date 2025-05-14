import { Socket } from 'socket.io';

export enum ACTIONS_HTTP_METHODS {
  GET = 'GET',
  POST = 'POST',
}

export type Action = {
  path: string;
  httpMethod?: ACTIONS_HTTP_METHODS;
  f: ({ socket, params }: { socket?: Socket; params?: Record<string, unknown> }) => Promise<unknown>;
};
