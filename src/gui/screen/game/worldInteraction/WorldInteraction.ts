import { CompositeDisposable } from '@/util/disposable/CompositeDisposable';

/**
 * Main world interaction controller that coordinates all interaction handlers
 */
export class WorldInteraction {
  private disposables = new CompositeDisposable();
  private enabled = true;
  
  public keyboardHandler?: any;
  public arrowScrollHandler?: any;
  public chatTypingHandler?: any;
  public unitSelectionHandler?: any;

  constructor(
    private localPlayer: any,
    private game: any,
    private handlers: {
      keyboard: any;
      unitSelection: any;
      tooltip: any;
      cameraPan: any;
      mapScroll: any;
      minimap: any;
      mapHover: any;
      pendingPlacement: any;
      customScroll: any;
      arrowScroll: any;
    }
  ) {
    this.keyboardHandler = handlers.keyboard;
    this.arrowScrollHandler = handlers.arrowScroll;
    this.unitSelectionHandler = handlers.unitSelection;
  }

  init(): void {
    // Initialize all interaction handlers
    Object.values(this.handlers).forEach(handler => {
      if (handler.init) {
        handler.init();
        this.disposables.add(handler);
      }
    });
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    // Enable/disable all handlers
  }

  setShroud(shroud: any): void {
    // Update shroud for visibility calculations
  }

  registerKeyCommand(type: any, command: any): this {
    this.keyboardHandler?.registerKeyCommand(type, command);
    return this;
  }

  dispose(): void {
    this.disposables.dispose();
  }
}
