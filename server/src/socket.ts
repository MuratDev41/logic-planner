import { Server as HTTPServer } from 'http';
import { Server } from 'socket.io';

let io: Server;

export function getIO(): Server {
  return io;
}

export function setupSocket(httpServer: HTTPServer) {
  io = new Server(httpServer, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
  });

  io.on('connection', (socket) => {
    let currentSection: string | null = null;

    socket.on('join-section', (sectionId: string) => {
      if (currentSection) socket.leave(currentSection);
      currentSection = sectionId;
      socket.join(sectionId);
      socket.to(sectionId).emit('user-joined', { id: socket.id });
    });

    socket.on('leave-section', () => {
      if (currentSection) {
        socket.to(currentSection).emit('user-left', { id: socket.id });
        socket.leave(currentSection);
        currentSection = null;
      }
    });

    socket.on('cursor-move', (data) => {
      if (currentSection) {
        socket.to(currentSection).emit('cursor-move', { id: socket.id, ...data });
      }
    });

    socket.on('disconnect', () => {
      if (currentSection) {
        socket.to(currentSection).emit('user-left', { id: socket.id });
      }
    });
  });

  return io;
}
