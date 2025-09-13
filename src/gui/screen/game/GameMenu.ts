import { CompositeDisposable } from '@/util/disposable/CompositeDisposable';
import { GameMenuController } from '@/gui/screen/game/gameMenu/GameMenuController';
import { ScreenType } from '@/gui/screen/game/gameMenu/ScreenType';
import { EventDispatcher } from '@/util/event';

/**
 * Game menu system for in-game menus and dialogs
 */
export class GameMenu {
  private _onOpen = new EventDispatcher<GameMenu, void>();
  private _onQuit = new EventDispatcher<GameMenu, void>();
  private _onObserve = new EventDispatcher<GameMenu, void>();
  private _onCancel = new EventDispatcher<GameMenu, void>();
  private _onToggleAlliance = new EventDispatcher<GameMenu, any>();
  private _onSendMessage = new EventDispatcher<GameMenu, any>();

  private disposables = new CompositeDisposable();
  private controller?: GameMenuController;

  get onOpen() {
    return this._onOpen.asEvent();
  }

  get onQuit() {
    return this._onQuit.asEvent();
  }

  get onObserve() {
    return this._onObserve.asEvent();
  }

  get onCancel() {
    return this._onCancel.asEvent();
  }

  get onToggleAlliance() {
    return this._onToggleAlliance.asEvent();
  }

  get onSendMessage() {
    return this._onSendMessage.asEvent();
  }

  constructor(
    private screens: any,
    private game: any,
    private localPlayer: any,
    private chatHistory: any,
    private gservCon?: any,
    private isSinglePlayer: boolean = false,
    private isTournament: boolean = false
  ) {}

  init(hud: any): void {
    this.controller = new GameMenuController(
      this.screens,
      this.game,
      this.localPlayer,
      this.chatHistory,
      this.gservCon,
      this.isSinglePlayer,
      this.isTournament
    );
    
    // Wire up events
    this.controller.onOpen.subscribe(() => this._onOpen.dispatch(this));
    this.controller.onQuit.subscribe(() => this._onQuit.dispatch(this));
    this.controller.onObserve.subscribe(() => this._onObserve.dispatch(this));
    this.controller.onCancel.subscribe(() => this._onCancel.dispatch(this));
    this.controller.onToggleAlliance.subscribe((data) => 
      this._onToggleAlliance.dispatch(this, data)
    );
    this.controller.onSendMessage.subscribe((data) => 
      this._onSendMessage.dispatch(this, data)
    );

    this.disposables.add(this.controller);
  }

  open(): void {
    this.controller?.open();
  }

  close(): void {
    this.controller?.close();
  }

  openDiplo(): void {
    this.controller?.openDiplo();
  }

  openConnectionInfo(combatants: any, gservCon: any, chatNetHandler: any): void {
    this.controller?.openConnectionInfo(combatants, gservCon, chatNetHandler);
  }

  handleHudChange(hud: any): void {
    this.controller?.handleHudChange(hud);
  }

  getCurrentScreen(): any {
    return this.controller?.getCurrentScreen();
  }

  dispose(): void {
    this.disposables.dispose();
  }
}
