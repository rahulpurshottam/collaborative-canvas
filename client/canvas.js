export class CanvasEngine {
  constructor(canvasElement) {
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d', { willReadFrequently: false });
    
    this.isDrawing = false;
    this.currentPath = [];
    this.operations = [];
    this.currentOperationIndex = -1;
    
    this.currentTool = 'brush';
    this.currentColor = '#000000';
    this.strokeWidth = 5;
    
    this.rafId = null;
    this.needsRedraw = false;
    
    this.resize();
    this.setupCanvas();
    
    window.addEventListener('resize', () => this.resize());
  }

  setupCanvas() {
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = 'high';
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const scale = window.devicePixelRatio || 1;
    
    const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    
    this.canvas.width = rect.width * scale;
    this.canvas.height = rect.height * scale;
    
    this.ctx.scale(scale, scale);
    this.canvas.style.width = rect.width + 'px';
    this.canvas.style.height = rect.height + 'px';
    
    this.setupCanvas();
    
    this.redrawCanvas();
    
    return { width: rect.width, height: rect.height };
  }

  getPosition(event) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    
    let clientX, clientY;
    
    if (event.touches && event.touches.length > 0) {
      clientX = event.touches[0].clientX;
      clientY = event.touches[0].clientY;
    } else {
      clientX = event.clientX;
      clientY = event.clientY;
    }
    
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  }

  startDrawing(event) {
    this.isDrawing = true;
    const pos = this.getPosition(event);
    this.currentPath = [pos];
    
    this.ctx.beginPath();
    this.ctx.arc(pos.x, pos.y, this.strokeWidth / 2, 0, Math.PI * 2);
    if (this.currentTool === 'brush') {
      this.ctx.fillStyle = this.currentColor;
      this.ctx.fill();
    } else {
      this.ctx.fillStyle = '#FFFFFF';
      this.ctx.fill();
    }
  }

  draw(event) {
    if (!this.isDrawing) return;
    
    const pos = this.getPosition(event);
    this.currentPath.push(pos);
    
    if (this.currentPath.length >= 2) {
      const lastPoint = this.currentPath[this.currentPath.length - 2];
      this.drawSegment(lastPoint, pos, this.currentColor, this.strokeWidth, this.currentTool);
    }
    
    return pos;
  }

  drawSegment(from, to, color, width, tool = 'brush') {
    this.ctx.beginPath();
    this.ctx.moveTo(from.x, from.y);
    this.ctx.lineTo(to.x, to.y);
    this.ctx.strokeStyle = tool === 'brush' ? color : '#FFFFFF';
    this.ctx.lineWidth = width;
    this.ctx.stroke();
  }

  drawSmoothPath(points, color, width, tool = 'brush') {
    if (points.length < 2) return;
    
    this.ctx.beginPath();
    this.ctx.strokeStyle = tool === 'brush' ? color : '#FFFFFF';
    this.ctx.lineWidth = width;
    
    this.ctx.moveTo(points[0].x, points[0].y);
    
    for (let i = 1; i < points.length - 1; i++) {
      const xc = (points[i].x + points[i + 1].x) / 2;
      const yc = (points[i].y + points[i + 1].y) / 2;
      this.ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
    }
    
    if (points.length > 1) {
      const lastPoint = points[points.length - 1];
      this.ctx.lineTo(lastPoint.x, lastPoint.y);
    }
    
    this.ctx.stroke();
  }

  stopDrawing() {
    if (!this.isDrawing) return null;
    
    this.isDrawing = false;
    
    const operation = {
      type: this.currentTool === 'brush' ? 'draw' : 'erase',
      points: this.currentPath,
      color: this.currentColor,
      width: this.strokeWidth
    };
    
    this.currentPath = [];
    return operation;
  }

  addOperation(operation) {
    if (this.currentOperationIndex < this.operations.length - 1) {
      this.operations = this.operations.slice(0, this.currentOperationIndex + 1);
    }
    
    this.operations.push(operation);
    this.currentOperationIndex++;
    
    this.drawOperation(operation);
  }

  drawOperation(operation) {
    if (operation.points.length === 0) return;
    
    if (operation.points.length === 1) {
      const point = operation.points[0];
      this.ctx.beginPath();
      this.ctx.arc(point.x, point.y, operation.width / 2, 0, Math.PI * 2);
      this.ctx.fillStyle = operation.type === 'draw' ? operation.color : '#FFFFFF';
      this.ctx.fill();
    } else {
      this.drawSmoothPath(operation.points, operation.color, operation.width, operation.type === 'draw' ? 'brush' : 'eraser');
    }
  }

  redrawCanvas() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    for (let i = 0; i <= this.currentOperationIndex; i++) {
      if (this.operations[i]) {
        this.drawOperation(this.operations[i]);
      }
    }
  }

  setOperations(operations, currentIndex) {
    this.operations = operations;
    this.currentOperationIndex = currentIndex;
    this.redrawCanvas();
  }

  undo() {
    if (this.currentOperationIndex >= 0) {
      this.currentOperationIndex--;
      this.redrawCanvas();
      return true;
    }
    return false;
  }

  redo() {
    if (this.currentOperationIndex < this.operations.length - 1) {
      this.currentOperationIndex++;
      this.redrawCanvas();
      return true;
    }
    return false;
  }

  setOperationIndex(index) {
    console.log('📊 Setting operation index:', index);
    console.log('   Previous index:', this.currentOperationIndex);
    console.log('   Total operations:', this.operations.length);
    
    this.currentOperationIndex = index;
    this.redrawCanvas();
  }

  clear() {
    this.operations = [];
    this.currentOperationIndex = -1;
    this.redrawCanvas();
  }

  setTool(tool) {
    this.currentTool = tool;
  }

  setColor(color) {
    this.currentColor = color;
  }

  setStrokeWidth(width) {
    this.strokeWidth = width;
  }

  getDimensions() {
    const rect = this.canvas.getBoundingClientRect();
    return {
      width: Math.floor(rect.width),
      height: Math.floor(rect.height)
    };
  }
}
