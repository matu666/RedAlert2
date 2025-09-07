/**
 * Handles map scrolling via mouse and edge scrolling
 */
export class MapScrollHandler {
  constructor(private camera: any, private viewport: any) {}

  handleEdgeScroll(mouseX: number, mouseY: number): void {
    // Handle edge scrolling when mouse is near screen edges
    const edgeThreshold = 20;
    const scrollSpeed = 5;

    if (mouseX < edgeThreshold) {
      this.camera.pan(-scrollSpeed, 0);
    } else if (mouseX > this.viewport.width - edgeThreshold) {
      this.camera.pan(scrollSpeed, 0);
    }

    if (mouseY < edgeThreshold) {
      this.camera.pan(0, -scrollSpeed);
    } else if (mouseY > this.viewport.height - edgeThreshold) {
      this.camera.pan(0, scrollSpeed);
    }
  }

  dispose(): void {
    // Cleanup
  }
}
