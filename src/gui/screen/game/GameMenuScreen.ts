/**
 * Base class for game menu screens
 */
export class GameMenuScreen {
  protected controller?: any;

  setController(controller: any): void {
    this.controller = controller;
  }
}
