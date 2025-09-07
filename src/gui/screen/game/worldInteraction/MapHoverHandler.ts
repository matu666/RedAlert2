/**
 * Handles mouse hover events over the game map
 */
export class MapHoverHandler {
  private currentHoverTarget?: any;

  constructor(private game: any, private tooltip: any) {}

  handleHover(x: number, y: number, target?: any): void {
    if (target !== this.currentHoverTarget) {
      this.currentHoverTarget = target;
      
      if (target) {
        this.showTooltip(target, x, y);
      } else {
        this.hideTooltip();
      }
    }
  }

  private showTooltip(target: any, x: number, y: number): void {
    // Show tooltip for hovered object
    this.tooltip.show(target.getDisplayName?.() || 'Unknown', x, y);
  }

  private hideTooltip(): void {
    this.tooltip.hide();
  }

  dispose(): void {
    this.hideTooltip();
  }
}
