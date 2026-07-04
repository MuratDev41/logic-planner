import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io();
  }
  return socket;
}

export function joinSection(sectionId: string) {
  getSocket().emit('join-section', sectionId);
}

export function leaveSection() {
  getSocket().emit('leave-section');
}
