/**
 * Base class for all screen components in the GUI system
 */
export abstract class Screen {
  /**
   * Initialize the screen
   */
  public abstract init(): void;

  /**
   * Update the screen logic
   * @param deltaTime - Time elapsed since last update
   */
  public abstract update(deltaTime: number): void;

  /**
   * Render the screen
   */
  public abstract render(): void;

  /**
   * Clean up resources when the screen is destroyed
   */
  public abstract destroy(): void;
}
  