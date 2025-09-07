/**
 * Base class for world interaction modes
 */
export abstract class InteractionMode {
  protected active = false;

  abstract enter(): void;
  abstract exit(): void;
  abstract handleClick(x: number, y: number, target?: any): void;

  isActive(): boolean {
    return this.active;
  }

  dispose(): void {
    if (this.active) {
      this.exit();
    }
  }
}
