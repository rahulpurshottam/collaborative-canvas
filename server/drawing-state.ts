import { DrawingOperation } from './types';

export class DrawingState {
  private operations: DrawingOperation[] = [];
  private currentOperationIndex: number = -1;

  getState() {
    return {
      operations: this.operations.slice(0, this.currentOperationIndex + 1),
      currentOperationIndex: this.currentOperationIndex
    };
  }

  addOperation(operation: DrawingOperation): void {
    if (this.currentOperationIndex < this.operations.length - 1) {
      this.operations = this.operations.slice(0, this.currentOperationIndex + 1);
    }
    
    const op: DrawingOperation = {
      ...operation,
      timestamp: Date.now(),
      id: `${operation.userId}-${Date.now()}-${Math.random()}`
    };
    
    this.operations.push(op);
    this.currentOperationIndex++;
  }

  undo(): { success: boolean; currentOperationIndex: number } {
    if (this.currentOperationIndex >= 0) {
      this.currentOperationIndex--;
      return {
        success: true,
        currentOperationIndex: this.currentOperationIndex
      };
    }
    return {
      success: false,
      currentOperationIndex: this.currentOperationIndex
    };
  }

  redo(): { success: boolean; currentOperationIndex: number } {
    if (this.currentOperationIndex < this.operations.length - 1) {
      this.currentOperationIndex++;
      return {
        success: true,
        currentOperationIndex: this.currentOperationIndex
      };
    }
    return {
      success: false,
      currentOperationIndex: this.currentOperationIndex
    };
  }

  clear(): void {
    this.operations = [];
    this.currentOperationIndex = -1;
  }

  getOperations(): DrawingOperation[] {
    return this.operations.slice(0, this.currentOperationIndex + 1);
  }

  getOperation(index: number): DrawingOperation | null {
    return this.operations[index] || null;
  }
}
