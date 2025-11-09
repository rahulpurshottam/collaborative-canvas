export interface User {
  id: string;
  name: string;
  color: string;
  isActive: boolean;
}

export interface Point {
  x: number;
  y: number;
}

export interface DrawingOperation {
  id?: string;
  userId?: string;
  userName?: string;
  type: 'draw' | 'erase';
  points: Point[];
  color: string;
  width: number;
  timestamp?: number;
}

export interface CursorPosition {
  x: number;
  y: number;
  isDrawing: boolean;
}

export interface UndoRedoOperation {
  currentOperationIndex: number;
}

export interface CanvasState {
  operations: DrawingOperation[];
  currentOperationIndex: number;
}
