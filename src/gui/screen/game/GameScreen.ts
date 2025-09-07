import { RootScreen } from '@/gui/screen/RootScreen';
import { CompositeDisposable } from '@/util/disposable/CompositeDisposable';
import { MedianPing } from './MedianPing';

/**
 * Main game screen that orchestrates the entire game UI and logic
 * This is the primary screen shown during active gameplay
 */
export class GameScreen extends RootScreen {
  private disposables = new CompositeDisposable();
  private avgPing = new MedianPing();
  private preventUnload = true;
  
  // Game state
  private game?: any;
  private replay?: any;
  private gameTurnMgr?: any;
  private gameAnimationLoop?: any;
  
  // UI components
  private hud?: any;
  private hudFactory?: any;
  private minimap?: any;
  private worldView?: any;
  private playerUi?: any;
  private menu?: any;
  private sidebarModel?: any;
  private loadingScreenApi?: any;
  
  // Network and multiplayer
  private lagState = false;
  private chatTypingHandler?: any;
  private chatNetHandler?: any;
  
  // Game settings
  private isSinglePlayer = false;
  private isTournament = false;
  private playerName = '';
  private returnTo?: any;
  private debugMapFile?: any;
  private pausedAtSpeed?: number;

  constructor(
    private workerHostApi: any,
    private gservCon: any,
    private wgameresService: any,
    private wolService: any,
    private mapTransferService: any,
    private engineVersion: string,
    private engineModHash: string,
    private errorHandler: any,
    private gameMenuSubScreens: any,
    private loadingScreenApiFactory: any,
    private gameOptsParser: any,
    private gameOptsSerializer: any,
    private config: any,
    private strings: any,
    private renderer: any,
    private uiScene: any,
    private runtimeVars: any,
    private messageBoxApi: any,
    private toastApi: any,
    private uiAnimationLoop: any,
    private viewport: any,
    private jsxRenderer: any,
    private pointer: any,
    private sound: any,
    private music: any,
    private mixer: any,
    private keyBinds: any,
    private generalOptions: any,
    private localPrefs: any,
    private actionLogger: any,
    private lockstepLogger: any,
    private replayManager: any,
    private fullScreen: any,
    private mapFileLoader: any,
    private mapDir: any,
    private mapList: any,
    private gameLoader: any,
    private vxlGeometryPool: any,
    private buildingImageDataCache: any,
    private mutedPlayers: any,
    private tauntsEnabled: any,
    private speedCheat: any,
    private sentry: any,
    private battleControlApi: any
  ) {
    super();
    
    // Setup close handler
    this.onGservClose = (error: any) => {
      if (this.replay) {
        this.replay.finish(this.game.currentTick);
        this.saveReplay(this.replay);
      }
      this.handleError(error, this.strings.get('TXT_YOURE_DISCON'));
      if (this.game) {
        this.sendGameRes(this.game, {
          disconnect: true,
          desync: false,
          quit: false,
          finished: false,
        });
      }
    };
  }

  async onEnter(params: any): Promise<void> {
    // Complex game initialization logic
    // This would handle:
    // - Network connection setup
    // - Map loading and validation
    // - Game world initialization
    // - UI setup
    // - Player initialization
    console.log('GameScreen.onEnter - Complex initialization logic would go here');
  }

  async onLeave(): Promise<void> {
    this.pointer.unlock();
    
    if (this.gameAnimationLoop) {
      this.gameAnimationLoop.destroy();
      this.gameAnimationLoop = undefined;
      this.uiAnimationLoop.start();
    }

    if (this.hud) {
      this.uiScene.remove(this.hud);
      this.hud.destroy();
      this.hud = undefined;
    }

    this.gameTurnMgr?.dispose();
    this.gameTurnMgr = undefined;
    
    this.disposables.dispose();

    if (!this.isSinglePlayer) {
      this.wolService.setAutoReconnect(false);
      this.gservCon.onClose.unsubscribe(this.onGservClose);
      this.gservCon.close();
    }
  }

  onViewportChange(): void {
    this.loadingScreenApi?.updateViewport();
    this.rerenderHud();
  }

  private rerenderHud(): void {
    if (this.hud) {
      this.uiScene.remove(this.hud);
      this.hud.destroy();
      this.hudFactory.setSidebarModel(this.sidebarModel);
      
      const newHud = this.hudFactory.create();
      this.hud = newHud;
      newHud.setMinimap(this.minimap);
      
      if (this.playerUi) {
        this.uiScene.add(newHud);
        this.menu?.handleHudChange(newHud);
        this.worldView?.handleViewportChange(this.viewport.value);
        this.playerUi.handleHudChange(newHud);
        
        if (this.chatTypingHandler) {
          this.initHudChatTypingEvents(this.chatTypingHandler, this.chatNetHandler, newHud);
        }
      }
    }
  }

  private initHudChatTypingEvents(typingHandler: any, netHandler: any, hud: any): void {
    hud.onMessageCancel.subscribe(() => {
      typingHandler.endTyping();
    });
    
    hud.onMessageSubmit.subscribe((event: any) => {
      typingHandler.endTyping();
      if (event.value.length) {
        netHandler.submitMessage(event.value, event.recipient);
      }
    });
  }

  private onGservClose: (error: any) => void;

  private handleError(error: any, message: string, skipGoToMenu?: boolean): void {
    if (this.gameTurnMgr) {
      this.gameTurnMgr.setErrorState();
    }
    this.pointer.unlock();

    const cleanup = () => {
      this.wolService.closeWolConnection();
      if (!this.isSinglePlayer && this.gservCon.isOpen()) {
        this.gservCon.onClose.unsubscribe(this.onGservClose);
        this.gservCon.close();
      }
    };

    this.errorHandler.handle(
      error,
      message,
      skipGoToMenu ? undefined : () => {
        cleanup();
        this.controller?.goToScreen('MainMenuRoot');
      }
    );

    if (skipGoToMenu) {
      cleanup();
      this.playerUi?.dispose();
    }
  }

  private saveReplay(replay: any): void {
    (async () => {
      try {
        await this.replayManager.saveReplay(replay);
      } catch (error) {
        console.error(error);
        this.toastApi.push(this.strings.get('GUI:SaveReplayError'));
      }
    })();
  }

  private sendGameRes(game: any, result: any): void {
    // Send game result to server
  }
}
