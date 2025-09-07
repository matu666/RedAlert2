/**
 * Handles arrow key scrolling for map navigation
 */
export class ArrowScrollHandler {
  private isPaused = false;

  constructor(private camera: any) {}

  handleArrowKey(direction: 'up' | 'down' | 'left' | 'right'): void {
    if (this.isPaused) return;
    
    // Handle arrow key map scrolling
    const scrollSpeed = 10;
    switch (direction) {
      case 'up': this.camera.pan(0, -scrollSpeed); break;
      case 'down': this.camera.pan(0, scrollSpeed); break;
      case 'left': this.camera.pan(-scrollSpeed, 0); break;
      case 'right': this.camera.pan(scrollSpeed, 0); break;
    }
  }

  pause(): void {
    this.isPaused = true;
  }

  unpause(): void {
    this.isPaused = false;
  }

  dispose(): void {
    // Cleanup
  }
}
