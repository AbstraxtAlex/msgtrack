import { Server } from 'socket.io';

let io: Server;

export function setSocketIO(socketIO: Server) {
  io = socketIO;
}

export function getSocketIO(): Server {
  return io;
}

export function emitToAll(event: string, data: unknown) {
  if (io) {
    io.emit(event, data);
  }
}
