import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { RoomManager } from './rooms';
import { DrawingOperation, CursorPosition, UndoRedoOperation } from './types';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const roomManager = new RoomManager();

app.use(express.static(path.join(__dirname, '../../client')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../../client/index.html'));
});

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);
  
  let currentRoom: string | null = null;
  let currentUser: { id: string; name: string; color: string } | null = null;

  socket.on('join-room', ({ roomId, userName }) => {
    currentRoom = roomId;
    socket.join(roomId);
    
    const user = roomManager.addUser(roomId, socket.id, userName);
    currentUser = user;
    
    const canvasState = roomManager.getCanvasState(roomId);
    
    socket.emit('room-joined', {
      user,
      users: roomManager.getUsers(roomId),
      operations: canvasState.operations,
      currentOperationIndex: canvasState.currentOperationIndex
    });
    
    socket.to(roomId).emit('user-joined', user);
    
    console.log(`User ${userName} (${socket.id}) joined room ${roomId}`);
  });

  socket.on('draw-operation', (operation: DrawingOperation) => {
    if (!currentRoom || !currentUser) return;
    
    roomManager.addOperation(currentRoom, {
      ...operation,
      userId: currentUser.id,
      userName: currentUser.name
    });
    
    socket.to(currentRoom).emit('draw-operation', {
      ...operation,
      userId: currentUser.id,
      userName: currentUser.name
    });
  });

  socket.on('draw-stroke', (strokeData: {
    points: Array<{ x: number; y: number }>;
    color: string;
    width: number;
    tool: 'brush' | 'eraser';
  }) => {
    if (!currentRoom || !currentUser) return;
    
    socket.to(currentRoom).emit('draw-stroke', {
      ...strokeData,
      userId: currentUser.id,
      userName: currentUser.name
    });
  });

  socket.on('cursor-position', (position: CursorPosition) => {
    if (!currentRoom || !currentUser) return;
    
    socket.to(currentRoom).emit('cursor-position', {
      ...position,
      userId: currentUser.id,
      userName: currentUser.name,
      userColor: currentUser.color
    });
  });

  socket.on('undo', () => {
    if (!currentRoom) return;
    
    console.log(`🔙 Undo requested by ${currentUser?.name} in room ${currentRoom}`);
    
    const result = roomManager.undo(currentRoom);
    if (result.success) {
      console.log(`✅ Undo successful - New index: ${result.currentOperationIndex}`);
      io.to(currentRoom).emit('undo-applied', {
        currentOperationIndex: result.currentOperationIndex
      });
    } else {
      console.log('❌ Undo failed - Already at beginning');
    }
  });

  socket.on('redo', () => {
    if (!currentRoom) return;
    
    console.log(`🔜 Redo requested by ${currentUser?.name} in room ${currentRoom}`);
    
    const result = roomManager.redo(currentRoom);
    if (result.success) {
      console.log(`✅ Redo successful - New index: ${result.currentOperationIndex}`);
      io.to(currentRoom).emit('redo-applied', {
        currentOperationIndex: result.currentOperationIndex
      });
    } else {
      console.log('❌ Redo failed - Already at end or no operations to redo');
    }
  });

  socket.on('clear-canvas', () => {
    if (!currentRoom || !currentUser) return;
    
    roomManager.clearCanvas(currentRoom);
    
    io.to(currentRoom).emit('canvas-cleared');
  });

  socket.on('disconnect', () => {
    if (currentRoom && currentUser) {
      roomManager.removeUser(currentRoom, socket.id);
      
      socket.to(currentRoom).emit('user-left', {
        userId: currentUser.id,
        userName: currentUser.name
      });
      
      console.log(`User ${currentUser.name} (${socket.id}) left room ${currentRoom}`);
    }
    
    console.log(`User disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 3000;

httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
