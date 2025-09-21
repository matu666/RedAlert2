// import { Task } from "@puzzl/core/lib/async/Task"; // 未使用
import { SlotType as NetSlotType, SlotInfo } from "@/network/gameopt/SlotInfo";
import { GameOpts, AiDifficulty } from "@/game/gameopts/GameOpts";
import { 
  RANDOM_COUNTRY_ID,
  RANDOM_COLOR_ID, 
  RANDOM_START_POS,
  NO_TEAM_ID,
  aiUiNames,
  OBS_COUNTRY_ID,
  RANDOM_COUNTRY_NAME,
  OBS_COUNTRY_NAME,
  RANDOM_COUNTRY_UI_NAME,
  RANDOM_COUNTRY_UI_TOOLTIP,
  OBS_COUNTRY_UI_NAME,
  OBS_COUNTRY_UI_TOOLTIP,
  RANDOM_COLOR_NAME,
} from "@/game/gameopts/constants";
import { LobbyForm } from "@/gui/screen/mainMenu/lobby/component/LobbyForm";
import { LobbyType, SlotOccupation, PlayerStatus, SlotType as UiSlotType } from "@/gui/screen/mainMenu/lobby/component/viewmodel/lobby";
import { MainMenuScreenType } from "../../ScreenType";
import { CompositeDisposable } from "@/util/disposable/CompositeDisposable";
import { jsx } from "@/gui/jsx/jsx";
import { HtmlView } from "@/gui/jsx/HtmlView";
// DownloadError - 暂时注释，使用any类型替代
// import { CancellationTokenSource, OperationCanceledError } from "@puzzl/core/lib/async/cancellation"; // 未使用
import { MapPreviewRenderer } from "@/gui/screen/mainMenu/lobby/MapPreviewRenderer";
import { findIndexReverse } from "@/util/Array";
import { StorageKey } from "@/LocalPrefs";
import { isNotNullOrUndefined } from "@/util/typeGuard";
import { PreferredHostOpts } from "./PreferredHostOpts";
import { MainMenuScreen } from "@/gui/screen/mainMenu/MainMenuScreen";
import { MapFile } from "@/data/MapFile";
import { MapDigest } from "@/engine/MapDigest";
import { MainMenuRoute } from "@/gui/screen/mainMenu/MainMenuRoute";
import { MusicType } from "@/engine/sound/Music";
// import { Parser } from "../../../../network/gameopt/Parser.js"; // 未使用
// import { Serializer } from "../../../../network/gameopt/Serializer.js"; // 未使用

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
  public musicType: MusicType;
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
        (error as any)?.name === 'DownloadError'
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

  async onStack(): Promise<void> {
    await this.unrender();
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
          slot.type === NetSlotType.Ai ||
          slot.type === NetSlotType.Player ||
          slot.type === NetSlotType.Open,
      );

      const slotsToClose = Math.max(0, lastUsedSlotIndex + 1 - mapEntry.maxSlots);
      for (let i = 0; i < slotsToClose; i++) {
        this.slotsInfo[lastUsedSlotIndex - i].type = NetSlotType.Closed;
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
        opts.mapOfficial = (mapEntry as any).official ?? false;
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
    if (!selectedMap || !(selectedMap as any)?.gameModes?.find((mode: any) => mode.mapFilter === (selectedMode as any).mapFilter)) {
      selectedModeId = 1;
      selectedMode = this.gameModes.getById(selectedModeId);
      selectedMap = this.mapList
        .getAll()
        .find((map) =>
          (map as any).gameModes?.find((mode: any) => (selectedMode as any).mapFilter === mode.mapFilter),
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
      // Skirmish does not show HostTeams; keep false
      hostTeams: false,
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
      mapOfficial: (selectedMap! as any).official ?? false,
    };

    // Align with original: default one AI with Easy difficulty if slot available
    if (selectedMap!.maxSlots > 1) {
      this.gameOpts.aiPlayers[1] = {
        difficulty: AiDifficulty.Easy,
        countryId: RANDOM_COUNTRY_ID,
        colorId: RANDOM_COLOR_ID,
        startPos: RANDOM_START_POS,
        teamId: this.gameModes.getById(selectedModeId).mpDialogSettings.mustAlly ? 3 : NO_TEAM_ID,
      } as any;
    }

    this.slotsInfo = [{ type: NetSlotType.Player, name: this.playerName }];
    for (let i = 1; i < 8; ++i) {
      if (i < selectedMap!.maxSlots && this.gameOpts.aiPlayers[i]) {
        this.slotsInfo.push({ type: NetSlotType.Ai, difficulty: (this.gameOpts.aiPlayers[i] as any).difficulty });
      } else {
        const type = i < selectedMap!.maxSlots
          ? (preferredOpts.slotsClosed.has(i) ? NetSlotType.Closed : NetSlotType.Open)
          : NetSlotType.Closed;
        this.slotsInfo.push({ type });
      }
    }
  }

  private initFormModel(): void {
    const mpDialogSettings = this.rules.mpDialogSettings;

    const countryUiNameEntries: [string, string][] = [
      [RANDOM_COUNTRY_NAME, RANDOM_COUNTRY_UI_NAME],
      [OBS_COUNTRY_NAME, OBS_COUNTRY_UI_NAME],
      ...this.getAvailablePlayerCountryRules().map((c: any) => [c.name, c.uiName] as [string, string]),
    ];

    const countryUiTooltipEntries: [string, string][] = [
      [RANDOM_COUNTRY_NAME, RANDOM_COUNTRY_UI_TOOLTIP],
      [OBS_COUNTRY_NAME, OBS_COUNTRY_UI_TOOLTIP],
      ...this.getAvailablePlayerCountryRules()
        .filter((c: any) => c.uiTooltip)
        .map((c: any) => [c.name, c.uiTooltip] as [string, string]),
    ];

    this.formModel = {
      strings: this.strings,
      countryUiNames: new Map<string, string>(countryUiNameEntries),
      countryUiTooltips: new Map<string, string>(countryUiTooltipEntries),
      availablePlayerCountries: [RANDOM_COUNTRY_NAME].concat(this.getAvailablePlayerCountries()),
      availablePlayerColors: [],
      availableAiNames: new Map([...aiUiNames.entries()]),
      availableStartPositions: [],
      maxTeams: 4,
      lobbyType: LobbyType.Singleplayer,
      mpDialogSettings: mpDialogSettings,
      onCountrySelect: this.handleCountrySelect.bind(this),
      onColorSelect: this.handleColorSelect.bind(this),
      onStartPosSelect: this.handleStartPosSelect.bind(this),
      onTeamSelect: this.handleTeamSelect.bind(this),
      onSlotChange: this.handleSlotChange.bind(this),
      onToggleShortGame: (value: boolean) => this.applyGameOption((opts) => (opts.shortGame = value)),
      onToggleMcvRepacks: (value: boolean) => this.applyGameOption((opts) => (opts.mcvRepacks = value)),
      onToggleCratesAppear: (value: boolean) => this.applyGameOption((opts) => (opts.cratesAppear = value)),
      onToggleSuperWeapons: (value: boolean) => this.applyGameOption((opts) => (opts.superWeapons = value)),
      onToggleBuildOffAlly: (value: boolean) => this.applyGameOption((opts) => (opts.buildOffAlly = value)),
      onToggleHostTeams: (value: boolean) => this.applyGameOption((opts) => (opts.hostTeams = value)),
      onToggleDestroyableBridges: (value: boolean) => this.applyGameOption((opts) => (opts.destroyableBridges = value)),
      onToggleMultiEngineer: (value: boolean) => this.applyGameOption((opts) => (opts.multiEngineer = value)),
      onToggleNoDogEngiKills: (value: boolean) => this.applyGameOption((opts) => (opts.noDogEngiKills = value)),
      onChangeGameSpeed: (value: number) => this.applyGameOption((opts) => (opts.gameSpeed = value)),
      onChangeCredits: (value: number) => this.applyGameOption((opts) => (opts.credits = value)),
      onChangeUnitCount: (value: number) => this.applyGameOption((opts) => (opts.unitCount = value)),
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
      multiEngineerCount:
        Math.ceil(
          (1 - ((this.rules as any).general?.engineerCaptureLevel || 0.5)) /
            ((this.rules as any).general?.engineerDamage || 0.25),
        ) + 1,
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

  private getAvailableStartPositionsForMax(maxSlots: number): number[] {
    return new Array(maxSlots).fill(0).map((_, index) => index);
  }

  private getAvailablePlayerCountryRules(): any[] {
    return this.rules.getMultiplayerCountries();
  }

  private applyGameOption(modifier: (opts: GameOpts) => void): void {
    modifier(this.gameOpts);
    this.updateFormModel();
    this.savePreferences();
  }

  private handleCountrySelect(countryName: string, slotIndex: number): void {
    this.updatePlayerInfo(
      this.getCountryIdByName(countryName),
      this.getColorIdByName(this.formModel.playerSlots[slotIndex].color),
      this.formModel.playerSlots[slotIndex].startPos,
      this.formModel.playerSlots[slotIndex].team,
      slotIndex,
    );
    this.updateFormModel();
  }

  private handleColorSelect(colorName: string, slotIndex: number): void {
    this.updatePlayerInfo(
      this.getCountryIdByName(this.formModel.playerSlots[slotIndex].country),
      this.getColorIdByName(colorName),
      this.formModel.playerSlots[slotIndex].startPos,
      this.formModel.playerSlots[slotIndex].team,
      slotIndex,
    );
    this.updateFormModel();
  }

  private handleStartPosSelect(startPos: number, slotIndex: number): void {
    this.updatePlayerInfo(
      this.getCountryIdByName(this.formModel.playerSlots[slotIndex].country),
      this.getColorIdByName(this.formModel.playerSlots[slotIndex].color),
      startPos,
      this.formModel.playerSlots[slotIndex].team,
      slotIndex,
    );
  }

  private handleTeamSelect(teamId: number, slotIndex: number): void {
    this.updatePlayerInfo(
      this.getCountryIdByName(this.formModel.playerSlots[slotIndex].country),
      this.getColorIdByName(this.formModel.playerSlots[slotIndex].color),
      this.formModel.playerSlots[slotIndex].startPos,
      teamId,
      slotIndex,
    );
  }

  private handleSlotChange(occupation: SlotOccupation, slotIndex: number, aiDifficulty?: any): void {
    if (slotIndex === 0) {
      throw new Error("Change slot type of host");
    }

    if (occupation === SlotOccupation.Occupied && aiDifficulty !== undefined) {
      const mpDialogSettings = this.gameModes.getById(this.gameOpts.gameMode).mpDialogSettings;
      const slot = this.slotsInfo[slotIndex];
      slot.type = NetSlotType.Ai;
      slot.difficulty = aiDifficulty;
      if (!this.gameOpts.aiPlayers[slotIndex]) {
        this.gameOpts.aiPlayers[slotIndex] = {
          difficulty: aiDifficulty,
          countryId: RANDOM_COUNTRY_ID,
          colorId: RANDOM_COLOR_ID,
          startPos: RANDOM_START_POS,
          teamId: mpDialogSettings.mustAlly ? 3 : NO_TEAM_ID,
        } as any;
      }
      this.gameOpts.aiPlayers[slotIndex]!.difficulty = aiDifficulty;
    }

    if (occupation === SlotOccupation.Closed) {
      this.slotsInfo[slotIndex].type = NetSlotType.Closed;
      this.gameOpts.aiPlayers[slotIndex] = undefined as any;
    }

    this.updateFormModel();
  }

  private getCountryNameById(countryId: number): string {
    if (countryId === RANDOM_COUNTRY_ID) return RANDOM_COUNTRY_NAME;
    if (countryId === OBS_COUNTRY_ID) return OBS_COUNTRY_NAME;
    return this.getAvailablePlayerCountries()[countryId];
  }

  private getCountryIdByName(name: string): number {
    if (name === RANDOM_COUNTRY_NAME) return RANDOM_COUNTRY_ID;
    if (name === OBS_COUNTRY_NAME) return OBS_COUNTRY_ID;
    const idx = this.getAvailablePlayerCountries().indexOf(name);
    return idx;
  }

  private getColorNameById(colorId: number): string {
    return colorId === RANDOM_COLOR_ID ? RANDOM_COLOR_NAME : this.getAvailablePlayerColors()[colorId];
  }

  private getColorIdByName(name: string): number {
    if (name === RANDOM_COLOR_NAME) return RANDOM_COLOR_ID;
    const idx = this.getAvailablePlayerColors().indexOf(name);
    if (idx === -1) throw new Error(`Color ${name} not found in available player colors`);
    return idx;
  }

  private getSelectablePlayerColors(playerSlots: any[]): string[] {
    const usedColors: string[] = [];
    playerSlots.forEach((slot) => {
      if (slot) usedColors.push(slot.color);
    });
    const available = this.getAvailablePlayerColors();
    return [RANDOM_COLOR_NAME].concat(available.filter((c) => c && !usedColors.includes(c)));
  }

  private getSelectableStartPositions(playerSlots: any[], maxSlots: number): number[] {
    const used: number[] = [];
    playerSlots.forEach((slot) => {
      if (slot) used.push(slot.startPos);
    });
    const positions = this.getAvailableStartPositionsForMax(maxSlots);
    return [RANDOM_START_POS].concat(positions.filter((p) => !used.includes(p)));
  }

  private updatePlayerInfo(countryId: number, colorId: number, startPos: number, teamId: number, slotIndex: number): void {
    const slot = this.slotsInfo[slotIndex];
    if (slot.type === NetSlotType.Ai) {
      const ai = this.gameOpts.aiPlayers[slotIndex];
      if (!ai) throw new Error("No AI found on slot " + slotIndex);
      ai.countryId = countryId;
      ai.colorId = colorId;
      ai.startPos = startPos;
      ai.teamId = teamId;
    } else if (slot.type === NetSlotType.Player) {
      const human = this.gameOpts.humanPlayers.find((p) => p.name === slot.name);
      if (!human) throw new Error("No player found on slot " + slotIndex);
      human.countryId = countryId;
      human.colorId = colorId;
      human.startPos = startPos;
      human.teamId = teamId;
      if (countryId !== RANDOM_COUNTRY_ID) {
        this.localPrefs.setItem(StorageKey.LastPlayerCountry, String(countryId));
      }
      if (colorId !== RANDOM_COLOR_ID) {
        this.localPrefs.setItem(StorageKey.LastPlayerColor, String(colorId));
      }
      if (startPos !== RANDOM_START_POS) {
        this.localPrefs.setItem(StorageKey.LastPlayerStartPos, String(startPos));
      }
      if (teamId !== NO_TEAM_ID) {
        this.localPrefs.setItem(StorageKey.LastPlayerTeam, String(teamId));
      }
    } else {
      throw new Error("Unexpected slot type " + slot.type);
    }
    this.updateFormModel();
  }

  private updateFormModel(): void {
    const e = this.gameOpts;
    this.formModel.gameSpeed = e.gameSpeed;
    this.formModel.credits = e.credits;
    this.formModel.unitCount = e.unitCount;
    this.formModel.shortGame = e.shortGame;
    this.formModel.superWeapons = e.superWeapons;
    this.formModel.buildOffAlly = e.buildOffAlly;
    this.formModel.mcvRepacks = e.mcvRepacks;
    this.formModel.cratesAppear = e.cratesAppear;
    this.formModel.destroyableBridges = e.destroyableBridges;
    this.formModel.multiEngineer = e.multiEngineer;
    this.formModel.noDogEngiKills = e.noDogEngiKills;

    let remaining = e.maxSlots;
    this.slotsInfo.forEach((_, t) => {
      if (remaining) {
        remaining--;
        this.formModel.playerSlots[t] = {
          country: RANDOM_COUNTRY_NAME,
          color: RANDOM_COLOR_NAME,
          startPos: RANDOM_START_POS,
          team: NO_TEAM_ID,
        };
      } else {
        this.formModel.playerSlots[t] = undefined;
      }
    });

    this.slotsInfo.forEach((slot, i) => {
      if (!this.formModel.playerSlots[i]) return;
      const s = this.formModel.playerSlots[i];
      if (slot.type === NetSlotType.Closed) s.occupation = SlotOccupation.Closed;
      else if (slot.type === NetSlotType.Open || (slot as any).type === NetSlotType.OpenObserver) s.occupation = SlotOccupation.Open;
      else s.occupation = SlotOccupation.Occupied;

      if (slot.type === NetSlotType.Ai) {
        s.aiDifficulty = slot.difficulty;
        s.type = UiSlotType.Ai;
      } else if (slot.type === NetSlotType.Player) {
        s.name = slot.name;
        s.type = UiSlotType.Player;
      }
      s.status = PlayerStatus.NotReady;
    });

    const humans = this.gameOpts ? this.gameOpts.humanPlayers : [];
    const ais = this.gameOpts ? this.gameOpts.aiPlayers : [];
    const mp = this.gameModes.getById(this.gameOpts.gameMode).mpDialogSettings;

    this.formModel.playerSlots.forEach((ps: any, idx: number) => {
      if (!ps) return;
      if (ps.occupation === SlotOccupation.Occupied) {
        let h = humans.find((p: any) => p.name === ps.name);
        if (h) {
          ps.country = this.getCountryNameById(h.countryId);
          ps.color = this.getColorNameById(h.colorId);
          ps.startPos = h.startPos;
          ps.team = h.teamId;
          return;
        }
        const a = ais[idx];
        if (a) {
          ps.country = this.getCountryNameById(a.countryId);
          ps.color = this.getColorNameById(a.colorId);
          ps.startPos = a.startPos;
          ps.team = a.teamId;
        }
      } else {
        ps.country = RANDOM_COUNTRY_NAME;
        ps.team = mp.mustAlly ? 0 : NO_TEAM_ID;
      }
    });

    this.formModel.availablePlayerColors = this.getSelectablePlayerColors(this.formModel.playerSlots);
    this.formModel.availableStartPositions = this.getSelectableStartPositions(this.formModel.playerSlots, e.maxSlots);
    this.formModel.teamsAllowed = this.gameModes.getById(e.gameMode).mpDialogSettings.alliesAllowed;
    this.formModel.teamsRequired = this.gameModes.getById(e.gameMode).mpDialogSettings.mustAlly;

    this.lobbyForm && this.lobbyForm.refresh();
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
        tooltip: this.strings.get("STT:SkirmishButtonStartGame"),
        onClick: () => {
          this.handleStartGame();
        },
      },
      {
        label: this.strings.get("GUI:ChooseMap"),
        tooltip: this.strings.get("STT:SkirmishButtonChooseMap"),
        onClick: () => {
          this.controller?.pushScreen(MainMenuScreenType.MapSelection, {
            lobbyType: LobbyType.Singleplayer,
            gameOpts: this.gameOpts,
            usedSlots: () => 1 + findIndexReverse(this.slotsInfo, (slot) => 
              slot.type === NetSlotType.Ai || slot.type === NetSlotType.Player),
          });
        },
      },
      {
        label: this.strings.get("GUI:Back"),
        tooltip: this.strings.get("STT:SkirmishButtonBack"),
        isBottom: true,
        onClick: () => {
          this.controller?.goToScreen(MainMenuScreenType.Home);
        },
      },
    ], true);
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
    if (this.gameOpts.aiPlayers.filter(isNotNullOrUndefined).length < 1) {
      this.messageBoxApi.show(this.strings.get("TXT_NEED_AT_LEAST_TWO_PLAYERS"), this.strings.get("GUI:Ok"));
      return;
    }

    if (!this.meetsMinimumTeams()) {
      this.messageBoxApi.show(this.strings.get("TXT_CANNOT_ALLY"), this.strings.get("GUI:Ok"));
      return;
    }

    const gameId = "skirmish-" + Date.now();
    const timestamp = Date.now();
    const fallbackRoute = new MainMenuRoute(MainMenuScreenType.Skirmish, {});

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
      this.controller?.goToScreen(MainMenuScreenType.Home);
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
