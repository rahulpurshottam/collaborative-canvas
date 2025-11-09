import { CanvasEngine } from './canvas.js';
import { WebSocketClient } from './websocket.js';

class CollaborativeCanvas {
  constructor() {
    this.canvas = new CanvasEngine(document.getElementById('canvas'));
    this.ws = new WebSocketClient();
    
    this.elements = {
      brushTool: document.getElementById('brush-tool'),
      eraserTool: document.getElementById('eraser-tool'),
      colorPicker: document.getElementById('color-picker'),
      colorPresets: document.querySelectorAll('.color-preset'),
      strokeWidth: document.getElementById('stroke-width'),
      widthValue: document.getElementById('width-value'),
      
      undoBtn: document.getElementById('undo-btn'),
      redoBtn: document.getElementById('redo-btn'),
      clearBtn: document.getElementById('clear-btn'),
      
      usersList: document.getElementById('users-list'),
      userCount: document.getElementById('user-count'),
      
      canvasElement: document.getElementById('canvas'),
      cursorsContainer: document.getElementById('cursors-container'),
      canvasDimensions: document.getElementById('canvas-dimensions'),
      connectionStatus: document.getElementById('connection-status'),
      
      joinModal: document.getElementById('join-modal'),
      joinForm: document.getElementById('join-form'),
      usernameInput: document.getElementById('username-input'),
      roomInput: document.getElementById('room-input'),
      
      roomIdDisplay: document.getElementById('room-id-display'),
      userNameDisplay: document.getElementById('user-name-display')
    };
    
    this.users = new Map();
    this.cursors = new Map();
    this.currentUser = null;
    this.isMouseDown = false;
    
    this.lastCursorSend = 0;
    this.cursorSendInterval = 50;
    
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.setupWebSocketHandlers();
    this.ws.connect();
    this.updateCanvasDimensions();
    
    this.elements.joinModal.style.display = 'flex';
  }

  setupEventListeners() {
    this.elements.joinForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const userName = this.elements.usernameInput.value.trim();
      const roomId = this.elements.roomInput.value.trim() || 'default';
      
      if (userName) {
        this.joinRoom(roomId, userName);
      }
    });
    
    this.elements.brushTool.addEventListener('click', () => {
      this.setTool('brush');
    });
    
    this.elements.eraserTool.addEventListener('click', () => {
      this.setTool('eraser');
    });
    
    this.elements.colorPicker.addEventListener('input', (e) => {
      this.canvas.setColor(e.target.value);
    });
    
    this.elements.colorPresets.forEach(preset => {
      preset.addEventListener('click', () => {
        const color = preset.dataset.color;
        this.elements.colorPicker.value = color;
        this.canvas.setColor(color);
      });
    });
    
    this.elements.strokeWidth.addEventListener('input', (e) => {
      const width = parseInt(e.target.value);
      this.elements.widthValue.textContent = width;
      this.canvas.setStrokeWidth(width);
    });
    
    this.elements.undoBtn.addEventListener('click', () => {
      console.log('🔙 Undo button clicked');
      console.log('Current index:', this.canvas.currentOperationIndex);
      console.log('Total operations:', this.canvas.operations.length);
      this.ws.undo();
    });
    
    this.elements.redoBtn.addEventListener('click', () => {
      console.log('🔜 Redo button clicked');
      console.log('Current index:', this.canvas.currentOperationIndex);
      console.log('Total operations:', this.canvas.operations.length);
      const canRedo = this.canvas.currentOperationIndex < this.canvas.operations.length - 1;
      console.log('Can redo?', canRedo);
      this.ws.redo();
    });
    
    this.elements.clearBtn.addEventListener('click', () => {
      if (confirm('Are you sure you want to clear the canvas for everyone?')) {
        this.ws.clearCanvas();
      }
    });
    
    this.elements.canvasElement.addEventListener('mousedown', (e) => this.handleDrawStart(e));
    this.elements.canvasElement.addEventListener('mousemove', (e) => this.handleDrawMove(e));
    this.elements.canvasElement.addEventListener('mouseup', (e) => this.handleDrawEnd(e));
    this.elements.canvasElement.addEventListener('mouseleave', (e) => this.handleDrawEnd(e));
    
    this.elements.canvasElement.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.handleDrawStart(e);
    });
    this.elements.canvasElement.addEventListener('touchmove', (e) => {
      e.preventDefault();
      this.handleDrawMove(e);
    });
    this.elements.canvasElement.addEventListener('touchend', (e) => {
      e.preventDefault();
      this.handleDrawEnd(e);
    });
    
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z' && !e.shiftKey) {
          e.preventDefault();
          this.ws.undo();
        } else if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) {
          e.preventDefault();
          this.ws.redo();
        }
      }
    });
  }

  setupWebSocketHandlers() {
    this.ws.onConnectionChange = (connected) => {
      this.updateConnectionStatus(connected);
    };
    
    this.ws.onRoomJoined = (data) => {
      this.currentUser = data.user;
      this.users.clear();
      data.users.forEach(user => {
        this.users.set(user.id, user);
      });
      
      this.canvas.setOperations(data.operations, data.currentOperationIndex);
      
      this.updateUsersList();
      this.elements.joinModal.style.display = 'none';
      this.elements.roomIdDisplay.querySelector('.highlight').textContent = this.ws.roomId;
      this.elements.userNameDisplay.querySelector('.highlight').textContent = data.user.name;
    };
    
    this.ws.onUserJoined = (user) => {
      this.users.set(user.id, user);
      this.updateUsersList();
    };
    
    this.ws.onUserLeft = (data) => {
      this.users.delete(data.userId);
      this.cursors.delete(data.userId);
      this.removeCursor(data.userId);
      this.updateUsersList();
    };
    
    this.ws.onDrawOperation = (operation) => {
      this.canvas.addOperation(operation);
    };
    
    this.ws.onDrawStroke = (strokeData) => {
      if (strokeData.points && strokeData.points.length >= 2) {
        const lastPoint = strokeData.points[strokeData.points.length - 2];
        const currentPoint = strokeData.points[strokeData.points.length - 1];
        this.canvas.drawSegment(lastPoint, currentPoint, strokeData.color, strokeData.width, strokeData.tool);
      }
    };
    
    this.ws.onCursorPosition = (position) => {
      this.updateCursor(position.userId, position.userName, position.userColor, position.x, position.y, position.isDrawing);
    };
    
    this.ws.onUndoApplied = (data) => {
      console.log('✅ UNDO APPLIED - New index:', data.currentOperationIndex);
      this.canvas.setOperationIndex(data.currentOperationIndex);
    };
    
    this.ws.onRedoApplied = (data) => {
      console.log('✅ REDO APPLIED - New index:', data.currentOperationIndex);
      this.canvas.setOperationIndex(data.currentOperationIndex);
    };
    
    this.ws.onCanvasCleared = () => {
      this.canvas.clear();
    };
  }

  joinRoom(roomId, userName) {
    this.ws.joinRoom(roomId, userName);
  }

  setTool(tool) {
    this.canvas.setTool(tool);
    
    if (tool === 'brush') {
      this.elements.brushTool.classList.add('active');
      this.elements.eraserTool.classList.remove('active');
    } else {
      this.elements.brushTool.classList.remove('active');
      this.elements.eraserTool.classList.add('active');
    }
  }

  handleDrawStart(e) {
    this.isMouseDown = true;
    this.canvas.startDrawing(e);
    
    const pos = this.canvas.getPosition(e);
    this.ws.sendCursorPosition(pos.x, pos.y, true);
  }

  handleDrawMove(e) {
    const pos = this.canvas.getPosition(e);
    
    const now = Date.now();
    if (now - this.lastCursorSend > this.cursorSendInterval) {
      this.ws.sendCursorPosition(pos.x, pos.y, this.isMouseDown);
      this.lastCursorSend = now;
    }
    
    if (this.isMouseDown) {
      const point = this.canvas.draw(e);
      
      if (point) {
        this.ws.sendDrawStroke({
          points: [point],
          color: this.canvas.currentColor,
          width: this.canvas.strokeWidth,
          tool: this.canvas.currentTool
        });
      }
    }
  }

  handleDrawEnd(e) {
    if (this.isMouseDown) {
      const operation = this.canvas.stopDrawing();
      
      if (operation) {
        this.ws.sendDrawOperation(operation);
      }
      
      this.isMouseDown = false;
      
      const pos = this.canvas.getPosition(e);
      this.ws.sendCursorPosition(pos.x, pos.y, false);
    }
  }

  updateCursor(userId, userName, userColor, x, y, isDrawing) {
    let cursor = this.cursors.get(userId);
    
    if (!cursor) {
      cursor = document.createElement('div');
      cursor.className = 'user-cursor';
      cursor.innerHTML = `
        <div class="cursor-dot" style="background-color: ${userColor}"></div>
        <div class="cursor-label" style="background-color: ${userColor}">${userName}</div>
      `;
      this.elements.cursorsContainer.appendChild(cursor);
      this.cursors.set(userId, cursor);
    }
    
    const rect = this.elements.canvasElement.getBoundingClientRect();
    const scale = this.elements.canvasElement.width / rect.width;
    cursor.style.left = (x / scale) + 'px';
    cursor.style.top = (y / scale) + 'px';
    cursor.style.opacity = isDrawing ? '1' : '0.7';
  }

  removeCursor(userId) {
    const cursor = this.cursors.get(userId);
    if (cursor) {
      cursor.remove();
      this.cursors.delete(userId);
    }
  }

  updateUsersList() {
    this.elements.usersList.innerHTML = '';
    this.elements.userCount.textContent = this.users.size;
    
    this.users.forEach(user => {
      const userItem = document.createElement('div');
      userItem.className = 'user-item';
      userItem.innerHTML = `
        <div class="user-color-indicator" style="background-color: ${user.color}"></div>
        <span class="user-name">${user.name}</span>
        ${user.id === this.currentUser?.id ? '<span class="user-you">You</span>' : ''}
      `;
      this.elements.usersList.appendChild(userItem);
    });
  }

  updateConnectionStatus(connected) {
    if (connected) {
      this.elements.connectionStatus.className = 'status-indicator connected';
      this.elements.connectionStatus.innerHTML = '🟢 Connected';
    } else {
      this.elements.connectionStatus.className = 'status-indicator disconnected';
      this.elements.connectionStatus.innerHTML = '🔴 Disconnected';
    }
  }

  updateCanvasDimensions() {
    const dims = this.canvas.getDimensions();
    this.elements.canvasDimensions.textContent = `${dims.width} x ${dims.height}`;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.app = new CollaborativeCanvas();
});
