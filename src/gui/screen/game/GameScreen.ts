import { RootScreen } from '@/gui/screen/RootScreen';
import { CompositeDisposable } from '@/util/disposable/CompositeDisposable';
import { MedianPing } from './MedianPing';
import { ScreenType, MainMenuScreenType } from '@/gui/screen/ScreenType';
import { sleep } from '@puzzl/core/lib/async/sleep';
import { GameStatus } from '@/game/Game';
import { GameTurnManager } from '@/game/GameTurnManager';
import { ActionFactory } from '@/game/action/ActionFactory';
import { ActionQueue } from '@/game/action/ActionQueue';
import { DevToolsApi } from '@/tools/DevToolsApi';
import { GameAnimationLoop } from '@/engine/GameAnimationLoop';
import { GameResultPopup, GameResultType } from '@/gui/screen/game/component/GameResultPopup';
import { jsx } from '@/gui/jsx/jsx';
import { SoundHandler } from '@/gui/screen/game/SoundHandler';
import { StorageKey } from '@/LocalPrefs';
import { CombatantUi } from '@/gui/screen/game/CombatantUi';
import { ObserverUi } from '@/gui/screen/game/ObserverUi';
import { GameMenu } from '@/gui/screen/game/GameMenu';
import { WorldView } from '@/gui/screen/game/WorldView';
import { Eva } from '@/engine/sound/Eva';
import { EvaSpecs } from '@/engine/sound/EvaSpecs';
import { SideType } from '@/game/SideType';
import { HudFactory } from '@/gui/screen/game/HudFactory';
import { Minimap } from '@/gui/screen/game/component/Minimap';
import { Replay } from '@/network/gamestate/Replay';
import { CombatantSidebarModel } from '@/gui/screen/game/component/hud/viewmodel/CombatantSidebarModel';
import { ActionFactoryReg } from '@/game/action/ActionFactoryReg';
import { MessageList } from '@/gui/screen/game/component/hud/viewmodel/MessageList';
import { ChannelType } from '@/engine/sound/ChannelType';
import { ChatNetHandler } from '@/gui/screen/game/ChatNetHandler';
import { ChatTypingHandler } from '@/gui/screen/game/ChatTypingHandler';
import { IrcConnection } from '@/network/IrcConnection';
import { CancellationTokenSource, OperationCanceledError } from '@puzzl/core/lib/async/cancellation';
import { MusicType } from '@/engine/sound/Music';
import { ActionType } from '@/game/action/ActionType';
import { EventType } from '@/game/event/EventType';
import { CommandBarButtonList } from '@/gui/screen/game/component/hud/commandBar/CommandBarButtonList';
import { CommandBarButtonType } from '@/gui/screen/game/component/hud/commandBar/CommandBarButtonType';
import { LoadingScreenType } from '@/gui/screen/game/loadingScreen/LoadingScreenApiFactory';
import { MapFile } from '@/data/MapFile';
import { VirtualFile } from '@/data/vfs/VirtualFile';
import { binaryStringToUint8Array } from '@/util/string';
import { MapDigest } from '@/engine/MapDigest';
import { MapSupport } from '@/engine/MapSupport';
import { OBS_COUNTRY_ID } from '@/game/gameopts/constants';
import { MainMenuRoute } from '@/gui/screen/mainMenu/MainMenuRoute';
import { RootRoute } from '@/gui/screen/RootRoute';
import { ChatHistory } from '@/gui/chat/ChatHistory';
import { PingMonitor } from '@/gui/screen/game/PingMonitor';
import { SidebarModel } from '@/gui/screen/game/component/hud/viewmodel/SidebarModel';
import { Engine } from '@/engine/Engine';
import * as A from '@/gui/screen/game/worldInteraction/WorldInteractionFactory';
import { ChatMessageFormat } from '@/gui/chat/ChatMessageFormat';

/**
 * Main game screen that orchestrates the entire game UI and logic
 * This is the primary screen shown during active gameplay
 */
export class GameScreen extends RootScreen {
  private disposables = new CompositeDisposable();
  private avgPing = new MedianPing();
  private preventUnload = true;
  
  // Controller reference
  protected controller?: any;
  
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

  setController(controller: any): void {
    this.controller = controller;
  }

  async onEnter(params: any): Promise<void> {
    this.pointer.lock();
    this.pointer.setVisible(false);
    await this.music?.play(MusicType.Loading);

    const cancellationTokenSource = new CancellationTokenSource();
    this.disposables.add(() => cancellationTokenSource.cancel());
    const cancellationToken = cancellationTokenSource.token;

    let gameOpts: any;
    this.returnTo = params.returnTo;
    this.isTournament = params.tournament;

    const playerName = this.playerName = params.playerName;
    const isSinglePlayer = this.isSinglePlayer = params.create && params.singlePlayer;

    if (isSinglePlayer) {
      gameOpts = params.gameOpts;
    } else {
      const credentials = this.wolService.getCredentials();
      if (!credentials || credentials.user !== playerName) {
        this.localPrefs.removeItem(StorageKey.LastConnection);
        this.controller?.goToScreen(ScreenType.MainMenuRoot, {
          route: new MainMenuRoute(MainMenuScreenType.Login, {
            forceUser: playerName,
            afterLogin: (user: any) => new RootRoute('Game', params)
          })
        });
        return;
      }

      this.wolService.setAutoReconnect(true);
      this.gservCon.onClose.subscribe(this.onGservClose);

      try {
        gameOpts = await this.connectToServerInstance(params, credentials, cancellationToken);
      } catch (error) {
        this.handleGservConError(error);
        return;
      }

      const { returnTo, ...connectionParams } = params;
      this.localPrefs.setItem(StorageKey.LastConnection, JSON.stringify(connectionParams));
    }

    // Set cheats based on dev mode and single player status
    if (this.config.devMode) {
      this.runtimeVars.cheatsEnabled.value = this.isSinglePlayer;
    } else if (!this.isSinglePlayer) {
      this.runtimeVars.cheatsEnabled.value = false;
    }

    let mapFile: any;
    try {
      const mapFileData = await this.transferAndLoadMapFile(
        params,
        gameOpts.mapName,
        gameOpts.mapDigest,
        cancellationToken
      );

      if (!gameOpts.mapOfficial) {
        this.debugMapFile = mapFileData;
        this.disposables.add(() => this.debugMapFile = undefined);
      }

      mapFile = new MapFile(mapFileData);
      const mapSupportError = MapSupport.check(mapFile, this.strings);
      if (mapSupportError) {
        this.handleError(mapSupportError, mapSupportError);
        return;
      }
    } catch (error) {
      this.handleMapLoadError(error, gameOpts.mapName);
      return;
    }

    const loadingScreenApi = this.loadingScreenApiFactory.create(
      isSinglePlayer ? LoadingScreenType.SinglePlayer : LoadingScreenType.MultiPlayer
    );

    this.loadingScreenApi = loadingScreenApi;
    this.disposables.add(loadingScreenApi, () => this.loadingScreenApi = undefined);
    this.disposables.add(() => this.gameLoader.clearStaticCaches());

    if (cancellationToken.isCancelled()) {
      return;
    }

    let gameLoadResult: any;
    try {
      gameLoadResult = await this.gameLoader.load(
        params.gameId,
        params.timestamp,
        gameOpts,
        mapFile,
        playerName,
        this.isSinglePlayer,
        loadingScreenApi,
        cancellationToken
      );
    } catch (error) {
      this.handleGameLoadError(error, params, gameOpts);
      return;
    }

    if (cancellationToken.isCancelled()) {
      return;
    }

    const { game, theater, hudSide, cameoFilenames } = gameLoadResult;
    this.game = game;
    this.disposables.add(
      game,
      () => this.game = undefined,
      () => Engine.unloadTheater(theater.type)
    );

    const localPlayer = game.getPlayerByName(playerName);
    let uiInitResult: any;

    try {
      uiInitResult = this.loadUi(game, theater, localPlayer, hudSide, cameoFilenames);
    } catch (error) {
      const errorMessage = error.message?.match(/memory|allocation/i)
        ? this.strings.get('TS:GameInitOom')
        : this.strings.get('TS:GameInitError') + 
          (game.gameOpts.mapOfficial ? '' : '\n\n' + this.strings.get('TS:CustomMapCrash'));
      this.handleGameError(error, errorMessage, game);
      return;
    }

    const actionFactory = new ActionFactory();
    new ActionFactoryReg().register(actionFactory, game, playerName);

    const actionQueue = new ActionQueue();
    const replay = this.replay = new Replay();
    this.disposables.add(() => this.replay = undefined);

    // Initialize replay with basic data
    // Note: Replay.init method may not exist, this is a placeholder
    
    // Create a mock replay recorder for now
    const replayRecorder = {
      record: (action: any) => {
        // Record action to replay
      }
    };

    // Create a basic game turn manager
    this.gameTurnMgr = new GameTurnManager();
    
    if (this.isSinglePlayer) {
      // Single player logic would go here
    } else {
      this.lagState = false;
      // Multiplayer logic would go here
      if (localPlayer.isObserver) {
        try {
          // Observer mode setup
        } catch (error) {
          if (error instanceof IrcConnection.SocketError) {
            return;
          }
          throw error;
        }
      } else {
        this.disposables.add(
          game.events.subscribe(EventType.PlayerDefeated, (event: any) => {
            if (event.target === localPlayer && localPlayer.isObserver) {
              // Handle player defeat
            }
          })
        );
      }
    }

    this.gameTurnMgr.init();

    const startGameHandler = () => {
      if (game.status !== GameStatus.Started) {
        try {
          this.onGameStart(localPlayer, game, uiInitResult, actionQueue, actionFactory, replay);
        } catch (error) {
          const errorMessage = error.message?.match(/memory|allocation/i)
            ? this.strings.get('TS:GameInitOom')
            : this.strings.get('TS:GameInitError') + 
              (game.gameOpts.mapOfficial ? '' : '\n\n' + this.strings.get('TS:CustomMapCrash'));
          this.handleGameError(error, errorMessage, game);
        }
      }
    };

    if (isSinglePlayer) {
      startGameHandler();
      
      DevToolsApi.registerCommand('reset', async () => {
        await this.onLeave();
        await this.onEnter(params);
      });
      
      DevToolsApi.registerVar('speed', game.desiredSpeed);
      this.disposables.add(
        () => DevToolsApi.unregisterCommand('reset'),
        () => DevToolsApi.unregisterVar('speed')
      );

      DevToolsApi.registerVar('cheats', this.runtimeVars.cheatsEnabled);
      this.disposables.add(() => DevToolsApi.unregisterVar('cheats'));
    } else if (this.gservCon.isOpen()) {
      const rateChangeHandler = (rate: number) => this.gameTurnMgr.setRate(rate);
      this.gservCon.onRateChange.subscribe(rateChangeHandler);
      this.disposables.add(() => this.gservCon.onRateChange.unsubscribe(rateChangeHandler));

      this.gservCon.onGameStart.subscribe(startGameHandler);
      this.disposables.add(() => this.gservCon.onGameStart.unsubscribe(startGameHandler));

      this.gservCon.sendLoadedPercent(100);
    }
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

  private async connectToServerInstance(params: any, credentials: any, cancellationToken: any): Promise<any> {
    let messageBoxShown = false;
    
    // Simplified connection logic
    try {
      // Show connecting message after delay
      setTimeout(() => {
        if (!cancellationToken.isCancelled()) {
          this.messageBoxApi.show(this.strings.get('TXT_CONNECTING'));
          messageBoxShown = true;
        }
      }, 1000);

      await this.gservCon.connect(params.gservUrl);
      await this.gservCon.cvers(this.engineVersion);
      await this.gservCon.login(credentials.user, credentials.pass);

      if (params.create) {
        const serializedOpts = this.gameOptsSerializer.serializeOptions(params.gameOpts);
        const { gameId, timestamp } = params;
        await this.gservCon.createGame(
          gameId,
          timestamp,
          serializedOpts,
          this.engineVersion,
          this.engineModHash,
          params.createPrivateGame
        );
        console.log(`Created game instance with id ${params.gameId}.`);
        this.localPrefs.removeItem(StorageKey.LastConnection);
      } else {
        await this.joinGame(params.gameId, 5, cancellationToken);
        console.log('Joined game instance with id ' + params.gameId);
      }

      const gameOptsData = await this.gservCon.gameOpts();
      return this.gameOptsParser.parseOptions(gameOptsData);
    } catch (error) {
      throw error;
    } finally {
      if (messageBoxShown) {
        this.messageBoxApi.destroy();
      }
    }
  }

  private async joinGame(gameId: string, retries: number, cancellationToken: any): Promise<void> {
    if (retries) {
      let lastError: any;
      while (retries--) {
        try {
          console.log(`Attempting to join game with id ${gameId}...`, retries + ' retries left');
          await this.gservCon.joinGame(gameId, this.engineVersion, this.engineModHash);
          return;
        } catch (error) {
          // Simplified error handling without GservError
          lastError = error;
          await sleep(3000);
        }
      }
      this.localPrefs.removeItem(StorageKey.LastConnection);
      throw lastError;
    }
    
    await this.gservCon.joinGame(gameId, this.engineVersion, this.engineModHash);
  }

  private async transferAndLoadMapFile(params: any, mapName: string, mapDigest: string, cancellationToken: any): Promise<any> {
    let mapFileData: any;

    if ((params.create && params.singlePlayer) || !params.mapTransfer) {
      mapFileData = await this.mapFileLoader.load(mapName, cancellationToken);
    } else {
      this.messageBoxApi.show(this.strings.get('GUI:MapTransfer'));

      if (params.create) {
        mapFileData = await this.mapFileLoader.load(mapName, cancellationToken);
        
        if (this.mapTransferService.getUrl()) {
          await this.mapTransferService.putMap(mapFileData.getBytes(), params.gameId, cancellationToken);
        } else {
          this.gservCon.sendMap(mapFileData.readAsString());
        }
      } else {
        let transferredMapData: Uint8Array;
        
        if (this.mapTransferService.getUrl()) {
          transferredMapData = await this.mapTransferService.getMap(params.gameId, cancellationToken);
        } else {
          transferredMapData = binaryStringToUint8Array(await this.gservCon.getMap());
        }

        mapFileData = VirtualFile.fromBytes(transferredMapData, mapName);
        
        if (MapDigest.compute(mapFileData) !== mapDigest) {
          throw new Error('Transferred map is corrupt');
        }

        if (this.mapDir && !(await this.mapDir.containsEntry(mapName))) {
          try {
            await this.mapDir.writeFile(mapFileData);
            this.mapList.addFromMapFile(mapFileData);
          } catch (error) {
            console.error('Map couldn\'t be saved', [error]);
          }
        }
      }

      this.messageBoxApi.destroy();
    }

    return mapFileData;
  }

  private loadUi(game: any, theater: any, localPlayer: any, hudSide: any, cameoFilenames: any): any {
    const sidebarModel = localPlayer.isObserver
      ? new SidebarModel(game, this.replay)
      : new CombatantSidebarModel(localPlayer, game);

    const messageList = new MessageList(
      game.rules.audioVisual.messageDuration,
      6,
      undefined
    );

    const chatHistory = new ChatHistory();

    this.sidebarModel = sidebarModel;
    this.disposables.add(() => this.sidebarModel = undefined);

    const uiIni = Engine.getUiIni();
    const commandBarButtonList = new CommandBarButtonList();

    if (!localPlayer.isObserver) {
      commandBarButtonList.fromIni(
        uiIni.getOrCreateSection(
          this.isSinglePlayer ? 'AdvancedCommandBar' : 'MultiplayerAdvancedCommandBar'
        )
      );
    }

    if (this.config.discordUrl) {
      commandBarButtonList.buttons.push(CommandBarButtonType.BugReport);
    }

    this.hudFactory = new HudFactory(
      hudSide,
      this.viewport.value,
      sidebarModel,
      messageList,
      chatHistory,
      game.debugText,
      this.runtimeVars.debugText,
      localPlayer.isObserver ? undefined : localPlayer,
      game.getCombatants(),
      game.stalemateDetectTrait,
      game.countdownTimer,
      cameoFilenames,
      this.jsxRenderer,
      this.strings,
      commandBarButtonList.buttons
    );
    this.disposables.add(() => this.hudFactory = undefined);

    const hud = this.hudFactory.create();
    this.hud = hud;

    const minimap = this.minimap = new Minimap(
      game,
      undefined,
      hud.getTextColor(),
      game.rules.general.radar
    );

    hud.setMinimap(minimap);
    this.disposables.add(minimap, () => this.minimap = undefined);
    minimap.setPointerEvents(this.pointer.pointerEvents);

    const hudDimensions = { width: hud.sidebarWidth, height: hud.actionBarHeight } as any;
    const worldView = new WorldView(
      hudDimensions,
      game,
      this.sound,
      this.renderer,
      this.runtimeVars,
      minimap,
      this.strings,
      this.generalOptions,
      this.vxlGeometryPool,
      this.buildingImageDataCache
    );

    const worldViewInit = worldView.init(localPlayer, this.viewport.value, theater);
    console.log('[GameScreen.loadUi] hudDimensions', {
      sidebarWidth: hud.sidebarWidth,
      actionBarHeight: hud.actionBarHeight,
      viewport: this.viewport.value
    });
    console.log('[GameScreen.loadUi] worldViewInit keys', Object.keys(worldViewInit || {}));
    this.worldView = worldView;
    this.disposables.add(worldView, () => this.worldView = undefined);
    // Ensure WorldScene container is set before processing render queue (aligns with original behavior)
    const ws: any = worldViewInit.worldScene;
    if (ws?.set3DObject && ws?.scene) {
      ws.set3DObject(ws.scene);
    }
    worldViewInit.worldScene.create3DObject?.();

    return {
      worldViewInitResult: worldViewInit,
      messageList,
      chatHistory,
      minimap
    };
  }

  private initLockstep(game: any, localPlayer: any, actionFactory: any, actionQueue: any, replayRecorder: any): any {
    // Simplified lockstep manager
    const lockstepManager = {
      onLagStateChange: {
        subscribe: (callback: (lagState: boolean) => void) => {
          // Mock subscription
        }
      },
      setPassiveMode: (passive: boolean) => {
        // Mock passive mode setting
      }
    };

    return lockstepManager;
  }

  private onGameStart(localPlayer: any, game: any, uiInitResult: any, actionQueue: any, actionFactory: any, replay: any): void {
    this.localPrefs.removeItem(StorageKey.LastConnection);
    this.loadingScreenApi?.dispose();
    this.music?.play(MusicType.Normal);

    // EVA setup (align with ReplayScreen)
    const evaSpecs = new EvaSpecs(SideType.GDI).readIni(Engine.getIni('eva.ini'));
    const eva = new Eva(evaSpecs, this.sound, this.renderer);
    eva.init();
    this.disposables.add(eva);

    // UI initialization with real world view init result
    this.initUi(localPlayer, game, undefined, actionQueue, actionFactory, this.hud, eva, uiInitResult);

    // Add world scene to renderer (align with original project behavior)
    const worldScene = uiInitResult.worldViewInitResult?.worldScene;
    if (worldScene) {
      console.log('[GameScreen.onGameStart] adding worldScene to renderer');
      this.renderer.removeScene(this.uiScene);
      this.renderer.addScene(worldScene);
      this.renderer.addScene(this.uiScene);
      const scenes = this.renderer.getScenes?.() ?? [];
      console.log('[GameScreen.onGameStart] scenes after add', scenes.map((s: any) => ({
        type: s.constructor?.name,
        viewport: s.viewport,
      })));
      console.log('[GameScreen.onGameStart] worldScene.scene children', worldScene.scene?.children?.length);
    }

    this.pointer.setVisible(true);

    // Start game
    game.start?.();

    if (!this.isSinglePlayer) {
      this.initNetStats(localPlayer);
    }

    // Game animation loop (align with original project)
    this.gameAnimationLoop = new GameAnimationLoop(
      localPlayer,
      this.renderer,
      this.sound,
      this.gameTurnMgr,
      {
        skipFrames: true,
        skipBudgetMillis: 8,
        onError: this.config.devMode ? undefined : (error: any, isCritical?: boolean) =>
          this.handleError(
            error,
            this.strings.get('TS:GameCrashed') +
            (isCritical || game.gameOpts.mapOfficial
              ? ''
              : '\n\n' + this.strings.get('TS:CustomMapCrash')),
            isCritical
          )
      }
    );
    this.uiAnimationLoop.stop();
    this.gameAnimationLoop.start();
  }

  private initNetStats(localPlayer: any): void {
    const pingMonitor = new PingMonitor(this.gameTurnMgr, this.gservCon, this.avgPing);
    pingMonitor.monitor();
    this.disposables.add(pingMonitor);
  }

  private initUi(localPlayer: any, game: any, replayRecorder: any, actionQueue: any, actionFactory: any, hud: any, eva: any, uiInitResult: any): void {
    // Simplified UI initialization
    const { messageList, chatHistory } = uiInitResult;

    // Sound handler
    const soundHandler = new SoundHandler(
      game,
      uiInitResult.worldViewInitResult.worldSound,
      eva,
      this.sound,
      game.events,
      messageList,
      this.strings,
      localPlayer
    );
    soundHandler.init?.();
    this.disposables.add(soundHandler);

    this.uiScene.add(hud);

    // Basic game menu
    const menu = this.menu = new GameMenu(
      this.gameMenuSubScreens,
      game,
      localPlayer,
      chatHistory,
      this.gservCon,
      this.isSinglePlayer,
      this.isTournament
    );
    menu.init(hud);
    this.initGameMenuEvents(menu, eva, game, localPlayer, actionQueue, actionFactory);
    this.disposables.add(menu, () => this.menu = undefined);

    // Create basic player UI
    if (localPlayer.isObserver) {
      const worldScene = uiInitResult.worldViewInitResult.worldScene;
      const renderableManager = uiInitResult.worldViewInitResult.renderableManager;
      const worldInteractionFactory = new A.WorldInteractionFactory(
        undefined,
        game,
        game.unitSelection,
        renderableManager,
        this.uiScene,
        worldScene,
        this.pointer,
        this.renderer,
        this.keyBinds,
        this.generalOptions,
        this.runtimeVars.freeCamera,
        this.runtimeVars.debugPaths,
        this.config.devMode,
        document,
        this.minimap,
        this.strings,
        hud.getTextColor?.(),
        this.runtimeVars.debugText,
        this.battleControlApi
      );
      this.playerUi = new ObserverUi(
        game,
        undefined,
        this.sidebarModel,
        this.replay,
        this.renderer,
        worldScene,
        this.sound,
        worldInteractionFactory,
        menu,
        this.runtimeVars,
        this.strings,
        renderableManager,
        this.messageBoxApi,
        this.config.discordUrl
      );
    } else {
      // Align with original constructor signature
      const worldScene = uiInitResult.worldViewInitResult.worldScene;
      const superWeaponFxHandler = uiInitResult.worldViewInitResult.superWeaponFxHandler;
      const beaconFxHandler = uiInitResult.worldViewInitResult.beaconFxHandler;
      const renderableManager = uiInitResult.worldViewInitResult.renderableManager;
      const textColor = hud.getTextColor?.();
      const worldInteractionFactory = new A.WorldInteractionFactory(
        localPlayer,
        game,
        game.unitSelection,
        renderableManager,
        this.uiScene,
        worldScene,
        this.pointer,
        this.renderer,
        this.keyBinds,
        this.generalOptions,
        this.runtimeVars.freeCamera,
        this.runtimeVars.debugPaths,
        this.config.devMode,
        document,
        this.minimap,
        this.strings,
        textColor,
        game.debugText,
        this.battleControlApi
      );

      this.playerUi = new CombatantUi(
        game,
        localPlayer,
        this.isSinglePlayer,
        actionQueue,
        actionFactory,
        this.sidebarModel,
        this.renderer,
        worldScene,
        soundHandler,
        messageList,
        this.sound,
        eva,
        worldInteractionFactory,
        menu,
        this.pointer,
        this.runtimeVars,
        this.speedCheat,
        this.strings,
        /* tauntHandler */ undefined,
        renderableManager,
        superWeaponFxHandler,
        beaconFxHandler,
        this.messageBoxApi,
        this.config.discordUrl
      );
    }

    this.playerUi.init?.(hud);
    this.disposables.add(this.playerUi, () => this.playerUi = undefined);

    // Basic multiplayer setup
    if (!this.isSinglePlayer) {
      const chatNetHandler = new ChatNetHandler(
        this.gservCon,
        this.wolService,
        messageList,
        chatHistory,
        new ChatMessageFormat(this.strings, localPlayer.name),
        localPlayer,
        game,
        this.replay,
        this.mutedPlayers ?? new Set<string>()
      );
      chatNetHandler.init();
      const worldInteraction = this.playerUi.worldInteraction;
      const chatTypingHandler = new ChatTypingHandler(
        worldInteraction.keyboardHandler,
        worldInteraction.arrowScrollHandler,
        messageList,
        chatHistory
      );
      this.chatTypingHandler = chatTypingHandler;
      this.chatNetHandler = chatNetHandler;
      this.disposables.add(() => {
        this.chatTypingHandler = this.chatNetHandler = undefined;
      });

      this.initHudChatTypingEvents(chatTypingHandler, chatNetHandler, hud);
    }
  }

  private initGameMenuEvents(menu: any, eva: any, game: any, localPlayer: any, actionQueue: any, actionFactory: any): void {
    menu.onOpen.subscribe(() => {
      this.pointer.unlock();
      this.playerUi.worldInteraction.setEnabled(false);
      
      if (this.isSinglePlayer) {
        this.pausedAtSpeed = game.speed.value;
        game.desiredSpeed.value = Number.EPSILON;
        this.mixer.setMuted(ChannelType.Effect, true);
        this.mixer.setMuted(ChannelType.Ambient, true);
      }
    });

    menu.onQuit.subscribe(async () => {
      console.log('[Quit] onQuit start', {
        isSinglePlayer: this.isSinglePlayer,
        pausedAtSpeed: this.pausedAtSpeed
      });
      if (!this.controller) return;

      if (this.isSinglePlayer && this.pausedAtSpeed) {
        this.mixer.setMuted(ChannelType.Effect, false);
        this.mixer.setMuted(ChannelType.Ambient, false);
      }

      if (!localPlayer.isObserver) {
        console.log('[Quit] play EVA_BattleControlTerminated');
        eva.play('EVA_BattleControlTerminated');
      }

      this.pointer.lock();
      this.pointer.setVisible(false);
      this.playerUi.dispose();

      if (!localPlayer.isObserver && !this.isSinglePlayer && !this.lagState) {
        actionQueue.push(actionFactory.create(ActionType.ResignGame));
        await new Promise<void>((resolve) => {
          this.gameTurnMgr.onActionsSent.subscribeOnce(() => resolve());
        });
      }

      try {
        this.gservCon.onClose.unsubscribe(this.onGservClose);
        this.gservCon.close();
      } catch (e) {
        console.warn('[Quit] gservCon close skipped', e);
      }
      this.gameTurnMgr.dispose();

      if (this.replay) {
        this.replay.finish(this.game.currentTick);
        this.saveReplay(this.replay);
      }

      if (!this.isSinglePlayer) {
        this.sendGameRes(game, {
          disconnect: false,
          desync: false,
          quit: true,
          finished: false
        });
      }

      if (!localPlayer.isObserver) {
        this.logGame(game, false);
      }

      console.log('[Quit] waiting before navigate');
      await sleep(2000);

      console.log('[Quit] navigating to Score');
      this.controller?.goToScreen(ScreenType.MainMenuRoot, {
        route: new MainMenuRoute(MainMenuScreenType.Score, {
          game,
          localPlayer,
          singlePlayer: this.isSinglePlayer,
          tournament: this.isTournament,
          returnTo: this.returnTo ?? new MainMenuRoute(MainMenuScreenType.Home)
        })
      });
    });

    menu.onObserve.subscribe(() => {
      this.pointer.lock();
      this.playerUi.worldInteraction.setEnabled(true);
      actionQueue.push(actionFactory.create(ActionType.ObserveGame));
      this.logGame(game, false);
    });

    menu.onCancel.subscribe(() => {
      this.pointer.lock();
      this.playerUi.worldInteraction.setEnabled(true);

      if (this.isSinglePlayer && this.pausedAtSpeed) {
        game.desiredSpeed.value = this.pausedAtSpeed;
        this.gameTurnMgr.doGameTurn(performance.now());
        this.pausedAtSpeed = undefined;
        this.mixer.setMuted(ChannelType.Effect, false);
        this.mixer.setMuted(ChannelType.Ambient, false);
      }
    });
  }

  private async onGameEnd(game: any, localPlayer: any, eva: any, replay: any): Promise<void> {
    const isVictory = !localPlayer.defeated || 
      game.alliances.getAllies(localPlayer).some((ally: any) => !ally.defeated);

    const [gameResultPopup] = this.jsxRenderer.render(
      jsx(GameResultPopup, {
        type: isVictory && !localPlayer.isObserver 
          ? GameResultType.MpVictory 
          : GameResultType.MpDefeat,
        viewport: this.viewport.value
      })
    );

    this.pointer.setVisible(false);
    this.playerUi.dispose();
    this.gservCon.onClose.unsubscribe(this.onGservClose);
    this.gservCon.close();
    this.uiScene.add(gameResultPopup);

    if (!localPlayer.isObserver) {
      eva.play(isVictory ? 'EVA_YouAreVictorious' : 'EVA_YouHaveLost', true);
    }

    replay.finish(game.currentTick);
    this.saveReplay(replay);

    if (!this.isSinglePlayer) {
      this.sendGameRes(game, {
        disconnect: false,
        desync: false,
        quit: false,
        finished: !game.alliances.getHostilePlayers().length
      });
    }

    if (!localPlayer.isObserver) {
      this.logGame(game, isVictory);
    }

    await sleep(5000);

    this.uiScene.remove(gameResultPopup);
    gameResultPopup.destroy();

    this.controller?.goToScreen(ScreenType.MainMenuRoot, {
      route: new MainMenuRoute(MainMenuScreenType.Score, {
        game,
        localPlayer,
        singlePlayer: this.isSinglePlayer,
        tournament: this.isTournament,
        returnTo: this.returnTo ?? new MainMenuRoute(MainMenuScreenType.Home)
      })
    });
  }

  private logGame(game: any, won: boolean): void {
    (window as any).gtag?.('event', 'game_finish', {
      singlePlayer: Number(this.isSinglePlayer),
      numPlayers: game.gameOpts.humanPlayers.filter((p: any) => p.countryId !== OBS_COUNTRY_ID).length + 
                  game.gameOpts.aiPlayers.filter((p: any) => !!p).length,
      won: Number(won),
      tournament: Number(this.isTournament),
      duration: game.currentTime
    });
  }

  private handleGservConError(error: any): void {
    if (error instanceof OperationCanceledError) {
      return;
    }

    // Simplified error handling
    let errorMessage = this.strings.get('WOL:MatchBadParameters');
    
    if (error instanceof IrcConnection.SocketError) {
      return;
    }
    
    if (error instanceof IrcConnection.ConnectError) {
      errorMessage = this.strings.get('TS:ConnectFailed');
    }

    this.handleError(error, errorMessage);
  }

  private handleMapLoadError(error: any, mapName: string): void {
    if (error instanceof OperationCanceledError || error instanceof IrcConnection.SocketError) {
      return;
    }

    // Simplified error handling
    let errorMessage = this.strings.get('TXT_MAP_ERROR');
    
    const message = typeof error === 'string' ? error : error.message;
    if (message?.match(/memory|allocation/i)) {
      errorMessage = this.strings.get('TS:GameInitOom');
    }

    this.handleError(error, errorMessage);
  }

  private handleGameLoadError(error: any, params: any, gameOpts: any): void {
    if (error instanceof OperationCanceledError || error instanceof IrcConnection.SocketError) {
      return;
    }

    // Simplified error handling
    let errorMessage = this.strings.get('TS:GameInitError');
    
    const message = typeof error === 'string' ? error : error.message;
    if (message?.match(/memory|allocation/i)) {
      errorMessage = this.strings.get('TS:GameInitOom');
    } else if (!gameOpts.mapOfficial) {
      errorMessage += '\n\n' + this.strings.get('TS:CustomMapCrash');
    }

    this.handleError(error, errorMessage);
  }

  private handleGameError(error: any, message: string, game: any, debugDataProvider?: () => Promise<any>, isCustomMap?: boolean): void {
    // Simplified game error handling
    const replay = this.replay;
    if (replay) {
      this.saveReplay(replay);
    }

    this.handleError(error, message, isCustomMap);

    if (error === 'desync_error') {
      this.sendGameRes(game, {
        disconnect: false,
        desync: true,
        quit: false,
        finished: false
      });
    }
  }

  private sendDebugInfo(
    error: any, 
    { gameId, replay, map, official }: { gameId?: string, replay?: any, map?: any, official?: boolean } = {},
    debugDataProvider?: () => Promise<any>
  ): void {
    // Simplified debug info sending
    console.error('Game error:', error, { gameId, official });
  }

  private sendGameRes(game: any, result: any): void {
    // Simplified game result sending
    console.log('Game result:', { game: game.id, result });
  }

  private getGameResClientInfo(result: any): any {
    return {
      clientVers: this.engineVersion,
      avgFps: 0,
      avgRtt: this.avgPing.calculate() ?? 0,
      outOfSync: result.desync,
      gameSku: this.wolService.getConfig().getClientSku(),
      accountName: this.playerName,
      suddenDisconnect: result.disconnect,
      quit: result.quit,
      finished: result.finished,
      pingsRecv: 0,
      pingsSent: 0
    };
  }
}
