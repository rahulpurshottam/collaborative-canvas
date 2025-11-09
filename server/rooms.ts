import { v4 as uuidv4 } from 'uuid';
import { DrawingState } from './drawing-state';
import { User } from './types';

export class RoomManager {
  private rooms: Map<string, Room> = new Map();
  private userColors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
    '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B739', '#52B788'
  ];
  private colorIndex = 0;

  private getRoom(roomId: string): Room {
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, new Room(roomId));
    }
    return this.rooms.get(roomId)!;
  }

  addUser(roomId: string, socketId: string, userName: string): User {
    const room = this.getRoom(roomId);
    
    const userColor = this.userColors[this.colorIndex % this.userColors.length];
    this.colorIndex++;
    
    const user: User = {
      id: socketId,
      name: userName || `User ${room.users.size + 1}`,
      color: userColor,
      isActive: true
    };
    
    room.users.set(socketId, user);
    return user;
  }

  removeUser(roomId: string, socketId: string): void {
    const room = this.rooms.get(roomId);
    if (room) {
      room.users.delete(socketId);
      
      if (room.users.size === 0) {
        this.rooms.delete(roomId);
      }
    }
  }

  getUsers(roomId: string): User[] {
    const room = this.rooms.get(roomId);
    return room ? Array.from(room.users.values()) : [];
  }

  getCanvasState(roomId: string) {
    const room = this.getRoom(roomId);
    return room.drawingState.getState();
  }

  addOperation(roomId: string, operation: any): void {
    const room = this.getRoom(roomId);
    room.drawingState.addOperation(operation);
  }

  undo(roomId: string) {
    const room = this.rooms.get(roomId);
    if (room) {
      return room.drawingState.undo();
    }
    return { success: false, currentOperationIndex: -1 };
  }

  redo(roomId: string) {
    const room = this.rooms.get(roomId);
    if (room) {
      return room.drawingState.redo();
    }
    return { success: false, currentOperationIndex: -1 };
  }

  clearCanvas(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (room) {
      room.drawingState.clear();
    }
  }
}

class Room {
  roomId: string;
  users: Map<string, User> = new Map();
  drawingState: DrawingState;
  createdAt: Date;

  constructor(roomId: string) {
    this.roomId = roomId;
    this.drawingState = new DrawingState();
    this.createdAt = new Date();
  }
}
