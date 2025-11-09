export class WebSocketClient {
  constructor() {
    this.socket = null;
    this.connected = false;
    this.roomId = null;
    this.currentUser = null;
    
    this.onConnectionChange = null;
    this.onRoomJoined = null;
    this.onUserJoined = null;
    this.onUserLeft = null;
    this.onDrawOperation = null;
    this.onDrawStroke = null;
    this.onCursorPosition = null;
    this.onUndoApplied = null;
    this.onRedoApplied = null;
    this.onCanvasCleared = null;
    
    this.strokeBuffer = [];
    this.strokeBufferTimer = null;
    this.strokeBufferInterval = 16;
  }

  connect() {
    this.socket = io();
    
    this.socket.on('connect', () => {
      this.connected = true;
      console.log('Connected to server');
      if (this.onConnectionChange) {
        this.onConnectionChange(true);
      }
    });
    
    this.socket.on('disconnect', () => {
      this.connected = false;
      console.log('Disconnected from server');
      if (this.onConnectionChange) {
        this.onConnectionChange(false);
      }
    });
    
    this.socket.on('room-joined', (data) => {
      console.log('Joined room:', data);
      this.currentUser = data.user;
      if (this.onRoomJoined) {
        this.onRoomJoined(data);
      }
    });
    
    this.socket.on('user-joined', (user) => {
      console.log('User joined:', user);
      if (this.onUserJoined) {
        this.onUserJoined(user);
      }
    });
    
    this.socket.on('user-left', (data) => {
      console.log('User left:', data);
      if (this.onUserLeft) {
        this.onUserLeft(data);
      }
    });
    
    this.socket.on('draw-operation', (operation) => {
      if (this.onDrawOperation) {
        this.onDrawOperation(operation);
      }
    });
    
    this.socket.on('draw-stroke', (strokeData) => {
      if (this.onDrawStroke) {
        this.onDrawStroke(strokeData);
      }
    });
    
    this.socket.on('cursor-position', (position) => {
      if (this.onCursorPosition) {
        this.onCursorPosition(position);
      }
    });
    
    this.socket.on('undo-applied', (data) => {
      if (this.onUndoApplied) {
        this.onUndoApplied(data);
      }
    });
    
    this.socket.on('redo-applied', (data) => {
      if (this.onRedoApplied) {
        this.onRedoApplied(data);
      }
    });
    
    this.socket.on('canvas-cleared', () => {
      if (this.onCanvasCleared) {
        this.onCanvasCleared();
      }
    });
  }

  joinRoom(roomId, userName) {
    if (!this.socket) return;
    
    this.roomId = roomId;
    this.socket.emit('join-room', { roomId, userName });
  }

  sendDrawOperation(operation) {
    if (!this.socket || !this.connected) return;
    
    this.socket.emit('draw-operation', operation);
  }

  sendDrawStroke(strokeData) {
    if (!this.socket || !this.connected) return;
    
    this.strokeBuffer.push(strokeData);
    
    if (!this.strokeBufferTimer) {
      this.strokeBufferTimer = setTimeout(() => {
        if (this.strokeBuffer.length > 0) {
          this.socket.emit('draw-stroke', {
            points: this.strokeBuffer,
            color: strokeData.color,
            width: strokeData.width,
            tool: strokeData.tool
          });
          this.strokeBuffer = [];
        }
        this.strokeBufferTimer = null;
      }, this.strokeBufferInterval);
    }
  }

  sendCursorPosition(x, y, isDrawing) {
    if (!this.socket || !this.connected) return;
    
    this.socket.emit('cursor-position', { x, y, isDrawing });
  }

  undo() {
    if (!this.socket || !this.connected) {
      console.error('❌ Cannot undo - not connected to server');
      return;
    }
    
    console.log('📤 Sending UNDO request to server');
    this.socket.emit('undo');
  }

  redo() {
    if (!this.socket || !this.connected) {
      console.error('❌ Cannot redo - not connected to server');
      return;
    }
    
    console.log('📤 Sending REDO request to server');
    this.socket.emit('redo');
  }

  clearCanvas() {
    if (!this.socket || !this.connected) return;
    
    this.socket.emit('clear-canvas');
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
    }
  }
}
