import { Task } from "@puzzl/core/lib/async/Task";
import { SlotType, SlotInfo } from "network/gameopt/SlotInfo";
import { GameOpts } from "game/gameopts/GameOpts";
import { 
  RANDOM_COUNTRY_ID,
  RANDOM_COLOR_ID, 
  RANDOM_START_POS,
  NO_TEAM_ID,
  aiUiNames
} from "game/gameopts/constants";
import { LobbyForm } from "@/gui/screen/mainMenu/lobby/component/LobbyForm";
import { LobbyType, SlotOccupation } from "@/gui/screen/mainMenu/lobby/component/viewmodel/lobby";
import { ScreenType } from "@/gui/screen/mainMenu/ScreenType";
import { CompositeDisposable } from "@/util/disposable/CompositeDisposable";
import { jsx } from "@/gui/jsx/jsx";
import { HtmlView } from "@/gui/jsx/HtmlView";
import { DownloadError } from "@/engine/ResourceLoader";
import { CancellationTokenSource, OperationCanceledError } from "@puzzl/core/lib/async/cancellation";
import { MapPreviewRenderer } from "@/gui/screen/mainMenu/lobby/MapPreviewRenderer";
import { findIndexReverse } from "@/util/array";
import { StorageKey } from "LocalPrefs";
import { isNotNullOrUndefined } from "@/util/typeGuard";
import { PreferredHostOpts } from "@/gui/screen/mainMenu/lobby/PreferredHostOpts";
import { MainMenuScreen } from "@/gui/screen/mainMenu/MainMenuScreen";
import { MapFile } from "data/MapFile";
import { MapDigest } from "@/engine/MapDigest";
import { MainMenuRoute } from "@/gui/screen/mainMenu/MainMenuRoute";
import { MusicType } from "@/engine/sound/Music";
import { Parser } from "network/gameopt/Parser";
import { Serializer } from "network/gameopt/Serializer";

interface GameMode {
  id: number;
  label: string;
  mpDialogSettings: any;
}

interface GameModes {
  getAll(): GameMode[];
  getById(id: number): GameMode;
}

interface MapListEntry {
  fileName: string;
  maxSlots: number;
  getFullMapTitle(strings: any): string;
}

interface MapList {
  getAll(): MapListEntry[];
  getByName(name: string): MapListEntry;
}

interface MapFileLoader {
  load(mapName: string): Promise<any>;
}

interface RootController {
  createGame(
    gameId: string,
    timestamp: number,
    gservUrl: string,
    username: string,
    gameOpts: GameOpts,
    singlePlayer: boolean,
    tournament: boolean,
    mapTransfer: boolean,
    privateGame: boolean,
    fallbackRoute: MainMenuRoute,
  ): void;
}

interface ErrorHandler {
  handle(error: any, message: string, onClose: () => void): void;
}

interface MessageBoxApi {
  show(message: string, buttonText?: string, onClose?: () => void): void;
  confirm(message: string, confirmText: string, cancelText: string): Promise<boolean>;
}

interface LocalPrefs {
  getItem(key: string): string | undefined;
  setItem(key: string, value: string): void;
}

interface Rules {
  getMultiplayerCountries(): any[];
  getMultiplayerColors(): Map<number, any>;
  mpDialogSettings: any;
}

interface SkirmishUnstackParams {
  gameMode: GameMode;
  mapName: string;
  changedMapFile?: any;
}

export class SkirmishScreen extends MainMenuScreen {
  private rootController: RootController;
  private errorHandler: ErrorHandler;
  private messageBoxApi: MessageBoxApi;
  private strings: any;
  private rules: Rules;
  private jsxRenderer: any;
  private mapFileLoader: MapFileLoader;
  private mapList: MapList;
  private gameModes: GameModes;
  private localPrefs: LocalPrefs;

  private playerName: string = "Player 1";
  private disposables: CompositeDisposable = new CompositeDisposable();
  private gameOpts!: GameOpts;
  private slotsInfo!: SlotInfo[];
  private currentMapFile?: any;
  private preferredHostOpts?: PreferredHostOpts;
  private formModel?: any;
  private lobbyForm?: any;

  constructor(
    rootController: RootController,
    errorHandler: ErrorHandler,
    messageBoxApi: MessageBoxApi,
    strings: any,
    rules: Rules,
    jsxRenderer: any,
    mapFileLoader: MapFileLoader,
    mapList: MapList,
    gameModes: GameModes,
    localPrefs: LocalPrefs,
  ) {
    super();
    this.rootController = rootController;
    this.errorHandler = errorHandler;
    this.messageBoxApi = messageBoxApi;
    this.strings = strings;
    this.rules = rules;
    this.jsxRenderer = jsxRenderer;
    this.mapFileLoader = mapFileLoader;
    this.mapList = mapList;
    this.gameModes = gameModes;
    this.localPrefs = localPrefs;
    this.title = this.strings.get("GUI:SkirmishGame");
    this.musicType = MusicType.Intro;
  }

  onEnter(): void {
    this.controller.toggleMainVideo(false);
    this.lobbyForm = undefined;
    this.initFormModel();
    this.createGame();
  }

  private async createGame(): Promise<void> {
    try {
      await this.initOptions();
    } catch (error) {
      this.handleError(
        error,
        error instanceof DownloadError
          ? this.strings.get("TXT_DOWNLOAD_FAILED")
          : this.strings.get("WOL:MatchErrorCreatingGame"),
      );
      return;
    }

    this.updateMapPreview();
    this.updateFormModel();
    this.controller.toggleSidebarPreview(true);
    this.initView();
  }

  onViewportChange(): void {
    // No implementation needed for skirmish
  }

  onUnstack(params?: SkirmishUnstackParams): void {
    if (params) {
      const modeChanged = params.gameMode.id !== this.gameOpts.gameMode;
      this.gameOpts.gameMode = params.gameMode.id;

      const mapEntry = this.mapList.getByName(params.mapName);
      const mapFile = params.changedMapFile ?? this.currentMapFile;
      this.currentMapFile = mapFile;

      const lastUsedSlotIndex = findIndexReverse(
        this.slotsInfo,
        (slot) =>
          slot.type === SlotType.Ai ||
          slot.type === SlotType.Player ||
          slot.type === SlotType.Open,
      );

      const slotsToClose = Math.max(0, lastUsedSlotIndex + 1 - mapEntry.maxSlots);
      for (let i = 0; i < slotsToClose; i++) {
        this.slotsInfo[lastUsedSlotIndex - i].type = SlotType.Closed;
        this.gameOpts.aiPlayers[lastUsedSlotIndex - i] = undefined;
      }

      const mpDialogSettings = this.gameModes.getById(this.gameOpts.gameMode).mpDialogSettings;
      
      [...this.gameOpts.humanPlayers, ...this.gameOpts.aiPlayers].forEach((player) => {
        if (player) {
          if (player.startPos > mapEntry.maxSlots - 1) {
            player.startPos = RANDOM_START_POS;
          }
          if (modeChanged) {
            player.teamId = mpDialogSettings.alliesAllowed && mpDialogSettings.mustAlly ? 0 : NO_TEAM_ID;
          }
        }
      });

      this.applyGameOption((opts) => {
        opts.mapName = mapEntry.fileName;
        opts.mapDigest = MapDigest.compute(mapFile);
        opts.mapSizeBytes = mapFile.getSize();
        opts.mapTitle = mapEntry.getFullMapTitle(this.strings);
        opts.maxSlots = mapEntry.maxSlots;
        opts.mapOfficial = mapEntry.official;
      });

      this.localPrefs.setItem(StorageKey.LastMap, mapEntry.fileName);
      this.localPrefs.setItem(StorageKey.LastMode, String(params.gameMode.id));
    }

    this.updateMapPreview();
    this.initView();
  }

  private async initOptions(): Promise<void> {
    const savedOpts = this.localPrefs.getItem(StorageKey.PreferredGameOpts);
    const savedCountry = this.localPrefs.getItem(StorageKey.LastPlayerCountry);
    const savedColor = this.localPrefs.getItem(StorageKey.LastPlayerColor);
    const savedMap = this.localPrefs.getItem(StorageKey.LastMap);
    const savedMode = this.localPrefs.getItem(StorageKey.LastMode);

    let selectedMap = savedMap ? this.mapList.getByName(savedMap) : undefined;
    let selectedModeId = selectedMap && savedMode && this.gameModes.getAll().find(m => m.id === Number(savedMode)) ? Number(savedMode) : 1;
    let selectedMode = this.gameModes.getById(selectedModeId);

    // Find compatible map if current map doesn't support the mode
    if (!selectedMap?.gameModes.find((mode) => mode.mapFilter === selectedMode.mapFilter)) {
      selectedModeId = 1;
      selectedMode = this.gameModes.getById(selectedModeId);
      selectedMap = this.mapList
        .getAll()
        .find((map) =>
          map.gameModes.find((mode) => selectedMode.mapFilter === mode.mapFilter),
        );
    }

    this.currentMapFile = await this.mapFileLoader.load(selectedMap!.fileName);

    const preferredOpts = (this.preferredHostOpts = new PreferredHostOpts());
    if (savedOpts) {
      preferredOpts.unserialize(savedOpts);
    } else {
      preferredOpts.applyMpDialogSettings(this.rules.mpDialogSettings);
    }

    const mpDialogSettings = this.gameModes.getById(selectedModeId).mpDialogSettings;

    this.gameOpts = {
      gameMode: selectedModeId,
      shortGame: preferredOpts.shortGame,
      mcvRepacks: preferredOpts.mcvRepacks,
      cratesAppear: preferredOpts.cratesAppear,
      superWeapons: preferredOpts.superWeapons,
      gameSpeed: preferredOpts.gameSpeed,
      credits: preferredOpts.credits,
      unitCount: preferredOpts.unitCount,
      buildOffAlly: preferredOpts.buildOffAlly,
      hostTeams: preferredOpts.hostTeams,
      destroyableBridges: preferredOpts.destroyableBridges,
      multiEngineer: preferredOpts.multiEngineer,
      noDogEngiKills: preferredOpts.noDogEngiKills,
      humanPlayers: [
        {
          name: this.playerName,
          countryId: savedCountry !== undefined && 
            Number(savedCountry) < this.getAvailablePlayerCountries().length
            ? Number(savedCountry)
            : RANDOM_COUNTRY_ID,
          colorId: savedColor !== undefined && 
            Number(savedColor) < this.getAvailablePlayerColors().length
            ? Number(savedColor)
            : RANDOM_COLOR_ID,
          startPos: RANDOM_START_POS,
          teamId: mpDialogSettings.mustAlly ? 0 : NO_TEAM_ID,
        },
      ],
      aiPlayers: new Array(8).fill(undefined),
      mapName: selectedMap!.fileName,
      mapDigest: MapDigest.compute(this.currentMapFile),
      mapSizeBytes: this.currentMapFile.getSize(),
      mapTitle: selectedMap!.getFullMapTitle(this.strings),
      maxSlots: selectedMap!.maxSlots,
      mapOfficial: selectedMap!.official,
    };

    this.slotsInfo = [{ type: SlotType.Player, name: this.playerName }];
    for (let i = 1; i < 8; ++i) {
      this.slotsInfo.push({
        type: preferredOpts.slotsClosed.has(i)
          ? SlotType.Closed
          : i < selectedMap!.maxSlots
            ? SlotType.Open
            : SlotType.Closed,
      });
    }
  }

  private initFormModel(): void {
    const mpDialogSettings = this.rules.mpDialogSettings;
    
    this.formModel = {
      strings: this.strings,
      countryUiNames: new Map([
        // Country name mappings would go here
      ]),
      countryUiTooltips: new Map([
        // Country tooltip mappings would go here
      ]),
      availablePlayerCountries: this.getAvailablePlayerCountries(),
      availablePlayerColors: this.getAvailablePlayerColors(),
      availableAiNames: new Map([...aiUiNames.entries()]),
      availableStartPositions: this.getAvailableStartPositions(),
      maxTeams: 4,
      lobbyType: LobbyType.Singleplayer,
      mpDialogSettings: mpDialogSettings,
      onCountrySelect: this.handleCountrySelect.bind(this),
      onColorSelect: this.handleColorSelect.bind(this),
      onStartPosSelect: this.handleStartPosSelect.bind(this),
      onTeamSelect: this.handleTeamSelect.bind(this),
      onSlotChange: this.handleSlotChange.bind(this),
      onToggleShortGame: (value: boolean) => this.applyGameOption((opts) => opts.shortGame = value),
      onToggleMcvRepacks: (value: boolean) => this.applyGameOption((opts) => opts.mcvRepacks = value),
      onToggleCratesAppear: (value: boolean) => this.applyGameOption((opts) => opts.cratesAppear = value),
      onToggleSuperWeapons: (value: boolean) => this.applyGameOption((opts) => opts.superWeapons = value),
      onToggleBuildOffAlly: (value: boolean) => this.applyGameOption((opts) => opts.buildOffAlly = value),
      onToggleHostTeams: (value: boolean) => this.applyGameOption((opts) => opts.hostTeams = value),
      onToggleDestroyableBridges: (value: boolean) => this.applyGameOption((opts) => opts.destroyableBridges = value),
      onToggleMultiEngineer: (value: boolean) => this.applyGameOption((opts) => opts.multiEngineer = value),
      onToggleNoDogEngiKills: (value: boolean) => this.applyGameOption((opts) => opts.noDogEngiKills = value),
      onChangeGameSpeed: (value: number) => this.applyGameOption((opts) => opts.gameSpeed = value),
      onChangeCredits: (value: number) => this.applyGameOption((opts) => opts.credits = value),
      onChangeUnitCount: (value: number) => this.applyGameOption((opts) => opts.unitCount = value),
      activeSlotIndex: 0,
      teamsAllowed: true,
      teamsRequired: false,
      playerSlots: [],
      shortGame: true,
      mcvRepacks: true,
      cratesAppear: true,
      superWeapons: true,
      buildOffAlly: true,
      hostTeams: false,
      destroyableBridges: true,
      multiEngineer: false,
      multiEngineerCount: Math.ceil((1 - this.rules.general.engineerCaptureLevel) / this.rules.general.engineerDamage) + 1,
      noDogEngiKills: false,
      gameSpeed: 6,
      credits: mpDialogSettings.money,
      unitCount: mpDialogSettings.unitCount,
    };
  }

  private getAvailablePlayerCountries(): string[] {
    return this.rules.getMultiplayerCountries().map((country: any) => country.name);
  }

  private getAvailablePlayerColors(): string[] {
    return [...this.rules.getMultiplayerColors().values()].map((color: any) => color.asHexString());
  }

  private getAvailableStartPositions(): number[] {
    return new Array(this.gameOpts?.maxSlots ?? 8).fill(0).map((_, index) => index);
  }

  private applyGameOption(modifier: (opts: GameOpts) => void): void {
    modifier(this.gameOpts);
    this.updateFormModel();
    this.savePreferences();
  }

  private handleCountrySelect(countryName: string, slotIndex: number): void {
    // Implementation for country selection
  }

  private handleColorSelect(colorName: string, slotIndex: number): void {
    // Implementation for color selection
  }

  private handleStartPosSelect(startPos: number, slotIndex: number): void {
    // Implementation for start position selection
  }

  private handleTeamSelect(teamId: number, slotIndex: number): void {
    // Implementation for team selection
  }

  private handleSlotChange(occupation: SlotOccupation, slotIndex: number, aiDifficulty?: any): void {
    // Implementation for slot changes
  }

  private updateFormModel(): void {
    // Implementation for updating form model
  }

  private savePreferences(): void {
    this.localPrefs.setItem(
      StorageKey.PreferredGameOpts,
      this.preferredHostOpts!.applyGameOpts(this.gameOpts).serialize(),
    );
  }

  private initView(): void {
    this.initLobbyForm();
    this.refreshSidebarButtons();
    this.refreshSidebarMpText();
    this.controller.showSidebarButtons();
  }

  private initLobbyForm(): void {
    const [component] = this.jsxRenderer.render(
      jsx(HtmlView, {
        innerRef: (ref: any) => (this.lobbyForm = ref),
        component: LobbyForm,
        props: this.formModel,
      }),
    );
    this.controller.setMainComponent(component);
  }

  private refreshSidebarButtons(): void {
    this.controller.setSidebarButtons([
      {
        label: this.strings.get("GUI:StartGame"),
        tooltip: this.strings.get("STT:SkirmishButtonGo"),
        onClick: () => {
          this.handleStartGame();
        },
      },
      {
        label: this.strings.get("GUI:ChooseMap"),
        tooltip: this.strings.get("STT:SkirmishButtonChooseMap"),
        onClick: () => {
          this.controller?.pushScreen(ScreenType.MapSelection, {
            lobbyType: LobbyType.Singleplayer,
            gameOpts: this.gameOpts,
            usedSlots: () => 1 + findIndexReverse(this.slotsInfo, (slot) => 
              slot.type === SlotType.Ai || slot.type === SlotType.Player),
          });
        },
      },
      {
        label: this.strings.get("GUI:Back"),
        tooltip: this.strings.get("STT:SkirmishButtonBack"),
        isBottom: true,
        onClick: () => {
          this.controller?.goToScreen(ScreenType.Home);
        },
      },
    ]);
  }

  private refreshSidebarMpText(): void {
    if (this.gameOpts) {
      this.controller.setSidebarMpContent({
        text:
          this.strings.get(this.gameModes.getById(this.gameOpts.gameMode).label) +
          "\n\n" +
          this.gameOpts.mapTitle,
        icon: this.gameOpts.mapOfficial ? "gt18.pcx" : "settings.png",
        tooltip: this.gameOpts.mapOfficial
          ? this.strings.get("STT:VerifiedMap")
          : this.strings.get("STT:UnverifiedMap"),
      });
    } else {
      this.controller.setSidebarMpContent({ text: "" });
    }
  }

  private updateMapPreview(): void {
    try {
      const preview = new MapPreviewRenderer(this.strings).render(
        new MapFile(this.currentMapFile),
        LobbyType.Singleplayer,
        this.controller.getSidebarPreviewSize(),
      );
      this.controller.setSidebarPreview(preview);
    } catch (error) {
      console.error("Failed to render map preview");
      console.error(error);
      this.controller.setSidebarPreview();
    }
  }

  private handleStartGame(): void {
    if (this.gameOpts.humanPlayers.filter((p) => p.countryId !== OBS_COUNTRY_ID).length < 2) {
      this.messageBoxApi.show(this.strings.get("TXT_ONLY_ONE"), this.strings.get("GUI:Ok"));
      return;
    }

    if (!this.meetsMinimumTeams()) {
      this.messageBoxApi.show(this.strings.get("TXT_CANNOT_ALLY"), this.strings.get("GUI:Ok"));
      return;
    }

    const gameId = "skirmish-" + Date.now();
    const timestamp = Date.now();
    const fallbackRoute = new MainMenuRoute(ScreenType.Home, {});

    this.rootController.createGame(
      gameId,
      timestamp,
      "", // No gserv URL for skirmish
      this.playerName,
      this.gameOpts,
      true, // Single player
      false, // Not tournament
      false, // No map transfer
      false, // Not private
      fallbackRoute,
    );
  }

  private meetsMinimumTeams(): boolean {
    const allPlayers = [
      ...this.gameOpts.humanPlayers,
      ...this.gameOpts.aiPlayers,
    ]
      .filter(isNotNullOrUndefined)
      .filter((player) => player.countryId !== OBS_COUNTRY_ID);

    const firstTeamId = allPlayers[0].teamId;
    return firstTeamId === NO_TEAM_ID || allPlayers.some((player) => player.teamId !== firstTeamId);
  }

  private handleError(error: any, message: string): void {
    this.errorHandler.handle(error, message, () => {
      this.controller?.goToScreen(ScreenType.Home);
    });
  }

  async onLeave(): Promise<void> {
    this.disposables.dispose();
    this.currentMapFile = undefined;
    this.gameOpts = undefined as any;
    this.preferredHostOpts = undefined;
    this.slotsInfo = undefined as any;
    this.controller.toggleSidebarPreview(false);
    await this.unrender();
  }

  private async unrender(): Promise<void> {
    await this.controller.hideSidebarButtons();
    this.lobbyForm = undefined;
  }
}
