/**
 * Interaction mode for special unit actions and abilities
 */
export class SpecialActionMode {
  constructor(private game: any, private player: any) {}

  enter(actionType: string): void {
    // Enter special action mode
  }

  exit(): void {
    // Exit special action mode
  }

  handleClick(x: number, y: number, target?: any): void {
    // Execute special action at target
  }

  dispose(): void {
    // Cleanup
  }
}
