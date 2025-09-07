/**
 * Manages tooltip display and interactions
 */
export class TooltipHandler {
  constructor(private tooltip: any, private strings: any) {}

  showObjectTooltip(object: any, x: number, y: number): void {
    // Show tooltip for game object
    const text = this.getObjectTooltipText(object);
    this.tooltip.show(text, x, y);
  }

  showUITooltip(element: any, x: number, y: number): void {
    // Show tooltip for UI element
    const text = this.getUITooltipText(element);
    this.tooltip.show(text, x, y);
  }

  hide(): void {
    this.tooltip.hide();
  }

  private getObjectTooltipText(object: any): string {
    // Generate tooltip text for game object
    return object.getDisplayName?.() || 'Unknown Object';
  }

  private getUITooltipText(element: any): string {
    // Generate tooltip text for UI element
    return element.tooltipKey ? this.strings.get(element.tooltipKey) : '';
  }

  dispose(): void {
    this.hide();
  }
}
