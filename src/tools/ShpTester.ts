import { Renderer } from "@/engine/gfx/Renderer";
import { UiScene } from "@/gui/UiScene";
import { Hud } from "@/gui/screen/game/component/Hud";
import { Engine } from "@/engine/Engine";
import { Rules } from "@/game/rules/Rules";
import { Art } from "@/game/art/Art";
import { Country } from "@/game/Country";
import { World } from "@/game/World";
import { ObjectFactory } from "@/game/gameobject/ObjectFactory";
import { ObjectArt } from "@/game/art/ObjectArt";
import { ObjectType } from "@/engine/type/ObjectType";
import { UiAnimationLoop } from "@/engine/UiAnimationLoop";
import { Game } from "@/game/Game";
import { JsxRenderer } from "@/gui/jsx/JsxRenderer";
import { CompositeDisposable } from "@/util/disposable/CompositeDisposable";
import { Alliances } from "@/game/Alliances";
import { PlayerList } from "@/game/PlayerList";
import { Pointer } from "@/gui/Pointer";
import { BoxedVar } from "@/util/BoxedVar";
import { TileCollection } from "@/game/map/TileCollection";
import { TileOccupation } from "@/game/map/TileOccupation";
import { Bridges } from "@/game/map/Bridges";
import { UnitSelection } from "@/game/gameobject/selection/UnitSelection";
import { GameModeType } from "@/game/ini/GameModeType";
import { getRandomInt, clamp } from "@/util/math";
import { TheaterType } from "@/engine/TheaterType";
import { GameMap } from "@/game/GameMap";
import { RadarTrait } from "@/game/player/trait/RadarTrait";
import { Minimap } from "@/gui/screen/game/component/Minimap";
import { CombatantSidebarModel } from "@/gui/screen/game/component/hud/viewmodel/CombatantSidebarModel";
import { MessageList } from "@/gui/screen/game/component/hud/viewmodel/MessageList";
import { MapShroudTrait } from "@/game/trait/MapShroudTrait";
import { SellTrait } from "@/game/trait/SellTrait";
import { MapBounds } from "@/game/map/MapBounds";
import { mixDatabase } from "@/engine/mixDatabase";
import { CommandBarButtonType } from "@/gui/screen/game/component/hud/commandBar/CommandBarButtonType";
import { CanvasMetrics } from "@/gui/CanvasMetrics";
import { StalemateDetectTrait } from "@/game/trait/StalemateDetectTrait";
import { CountdownTimer } from "@/game/CountdownTimer";
import { IniSection } from "@/data/IniSection";
import { ChatHistory } from "@/gui/chat/ChatHistory";
import { 
  SidebarItemTargetType, 
  SidebarCategory, 
  SidebarItemStatus 
} from "@/gui/screen/game/component/hud/viewmodel/SidebarModel";
import { SideType } from "@/game/SideType";
import { QueueType } from "@/game/player/production/ProductionQueue";
import { PlayerFactory } from "@/game/player/PlayerFactory";

declare const THREE: any;

interface GameOptions {
  superWeapons: boolean;
  gameSpeed: number;
}

interface SidebarItem {
  target: {
    type: SidebarItemTargetType;
    rules: any;
  };
  cameo: string;
  disabled: boolean;
  progress: number;
  quantity: number;
  status: SidebarItemStatus;
}


interface MenuButton {
  label: string;
  disabled?: boolean;
  isBottom?: boolean;
  onClick: () => void;
}


export class ShpTester {
  private static disposables = new CompositeDisposable();

  static async main(
    mixFileLoader: any,
    gameMap: any,
    parentElement: HTMLElement,
    strings: any
  ): Promise<void> {
    // 添加返回按钮
    this.buildHomeButton();

    // Initialize renderer
    const renderer = new Renderer(800, 600);
    renderer.init(parentElement);
    renderer.initStats(document.body);
    this.disposables.add(renderer);

    // Create UI scene
    const uiScene = UiScene.factory({
      x: 0,
      y: 0,
      width: 800,
      height: 600,
    });
    this.disposables.add(uiScene);

    // Load mix file
    await mixFileLoader.addMixFile("sidec01.mix");

    // Get cameo database
    const cameoDatabase = mixDatabase.get("cameo.mix");
    if (!cameoDatabase) {
      throw new Error("Missing file list database for cameos");
    }

    // Initialize game rules and art
    const rules = new Rules(Engine.getRules());
    const art = new Art(rules, Engine.getArt(), undefined, undefined);

    // Load theater
    const theater = await Engine.loadTheater(TheaterType.Temperate);
    const gameMapInstance = new GameMap(gameMap, theater.tileSets, rules, (min: number, max: number) => getRandomInt(min, max));

    // Game options
    const gameOptions: GameOptions = { 
      superWeapons: false, 
      gameSpeed: 5 
    };

    // Create player using PlayerFactory
    const playerFactory = new PlayerFactory(rules, gameOptions, []);
    
    // Create country - use direct factory method with rules
    const country = Country.factory("Americans", rules as any);
    const player = playerFactory.createCombatant("Player", country, 0, "Red", false, undefined);
    this.disposables.add(player);

    // Create world and related objects
    const world = new World();
    const playerList = new PlayerList();
    const alliances = new Alliances(playerList);
    const unitSelection = new UnitSelection();
    const tileCollection = new TileCollection(
      [],
      null,
      rules.general,
      () => getRandomInt(0, 1000),
    );
    const tileOccupation = new TileOccupation(tileCollection);
    const mapBounds = new MapBounds();
    const bridges = new Bridges(theater.tileSets, tileCollection, tileOccupation, mapBounds, rules);
    const gameSpeedVar = new BoxedVar(1);

    // Create object factory
    const objectFactory = new ObjectFactory(tileCollection, tileOccupation, bridges, gameSpeedVar);

    // Create game instance
    const game = new Game(
      world,
      gameMapInstance,
      rules,
      art,
      null,
      "0",
      0,
      gameOptions,
      GameModeType.Battle,
      playerList,
      unitSelection,
      alliances,
      gameSpeedVar,
      objectFactory,
      null,
    );

    game.addPlayer(player);
    game.mapShroudTrait = new MapShroudTrait(gameMapInstance, alliances);
    game.traits.add(game.mapShroudTrait);
    game.sellTrait = new SellTrait(game, game.rules.general);
    game.traits.add(game.sellTrait);

    // Add buildings to player
    const buildingTypes = [
      "GACNST", // Allied Construction Yard
      "GAPOWR", // Allied Power Plant
      "GAREFN", // Allied Ore Refinery
      "GAPILE", // Allied Barracks
      "GAAIRC", // Allied Airfield
      "GAWEAP", // Allied War Factory
      "GATECH", // Allied Battle Lab
      "GAYARD", // Allied Naval Yard
      "NAPOWR", // Soviet Power Plant
      "NAREFN", // Soviet Ore Refinery
      "NAHAND", // Soviet Barracks
      "NAWEAP", // Soviet War Factory
      "NATECH", // Soviet Battle Lab
      "NARADR", // Soviet Radar
      "NAYARD", // Soviet Naval Yard
    ];

    buildingTypes.forEach((buildingType) => {
      player.addOwnedObject(
        objectFactory.create(ObjectType.Building, buildingType, rules, art)
      );
    });

    // Create sidebar model
    const combatantSidebarModel = new CombatantSidebarModel(player, game);
    combatantSidebarModel.powerDrained = 150;
    combatantSidebarModel.powerGenerated = 300;
    const radarTrait = player.traits.get(RadarTrait);
    if (radarTrait) {
      radarTrait.setDisabled(false);
    }

    // Set up power updates
    const powerUpdateInterval = setInterval(() => {
      combatantSidebarModel.powerDrained = getRandomInt(0, 300);
      combatantSidebarModel.powerGenerated = getRandomInt(200, 1000);
      console.log(
        `Set power = ${combatantSidebarModel.powerGenerated}, drain = ${combatantSidebarModel.powerDrained}`
      );
    }, 5000);
    this.disposables.add(() => clearInterval(powerUpdateInterval));

    // Set up credits updates
    player.credits = 5000;
    const creditsUpdateInterval = setInterval(() => {
      player.credits = clamp(
        player.credits + getRandomInt(-1000, 1000),
        0,
        1000000,
      );
      console.log("Set credits", player.credits);
    }, 5000);
    this.disposables.add(() => clearInterval(creditsUpdateInterval));

    // Populate sidebar items - use all building types
    const availableObjects = buildingTypes
      .map(type => rules.getBuilding(type))
      .filter(building => building !== null);

    for (const availableObject of availableObjects) {
      const objectArt = ObjectArt.factory(
        ObjectType.Building,
        availableObject as any,
        Engine.getArt(),
        Engine.getArt().getSection((availableObject as any).imageName) ??
          new IniSection((availableObject as any).imageName),
      );

      const tab = combatantSidebarModel.getTabForQueueType(QueueType.Structures);

      const sidebarItem: SidebarItem = {
        target: { 
          type: SidebarItemTargetType.Techno, 
          rules: availableObject 
        },
        cameo: objectArt.cameo,
        disabled: tab.id === SidebarCategory.Structures,
        progress: 0,
        quantity: 0,
        status: SidebarItemStatus.Idle,
      };

      tab.items.push(sidebarItem);
    }

    // Configure specific sidebar items
    const firstActiveTabItem = combatantSidebarModel.activeTab.items[1];
    if (firstActiveTabItem) {
      firstActiveTabItem.disabled = false;
      firstActiveTabItem.progress = 0.75;
      firstActiveTabItem.quantity = 2;
      firstActiveTabItem.status = SidebarItemStatus.OnHold;
    }

    const firstInfantryItem = combatantSidebarModel.tabs[SidebarCategory.Infantry].items[0];
    if (firstInfantryItem) {
      firstInfantryItem.quantity = 5;
      firstInfantryItem.progress = 1;
      firstInfantryItem.status = SidebarItemStatus.Ready;
    }

    // Set up canvas metrics and pointer
    const canvasMetrics = new CanvasMetrics(renderer.getCanvas(), window);
    canvasMetrics.init();
    this.disposables.add(canvasMetrics);

    const pointer = Pointer.factory(
      Engine.getImages().get("mouse.shp"),
      Engine.getPalettes().get("mousepal.pal"),
      renderer,
      document,
      canvasMetrics,
      new BoxedVar(false),
    );
    pointer.init();
    pointer.lock();
    this.disposables.add(pointer);
    uiScene.add(pointer.getSprite());

    // Create JSX renderer
    const jsxRenderer = new JsxRenderer(
      Engine.getImages(),
      Engine.getPalettes(),
      uiScene.getCamera(),
      pointer.pointerEvents,
    );

    // Create message list
    const messageList = new MessageList(
      game.rules.audioVisual.messageDuration,
      6,
      player,
    );

    // Set up random system messages
    const systemMessages = [
      "txt_low_power",
      "txt_space_cant_save", 
      "txt_receiving_scenario",
      "txt_bad_chankey",
    ];

    let messageTimeout: number;
    const addRandomMessage = (): void => {
      const messageKey = strings.get(
        systemMessages[getRandomInt(0, systemMessages.length - 1)]
      );
      console.log("Add system message:", messageKey);
      messageList.addSystemMessage(
        messageKey,
        "#" + new THREE.Color(
          Math.random(),
          Math.random(), 
          Math.random(),
        ).getHexString(),
      );
      messageTimeout = setTimeout(addRandomMessage, 5000 * Math.random());
    };

    messageTimeout = setTimeout(addRandomMessage, 5000 * Math.random());
    this.disposables.add(() => clearTimeout(messageTimeout));

    // Create HUD
    const hud = new Hud(
      SideType.GDI,
      uiScene.viewport,
      Engine.getImages() as any,
      Engine.getPalettes() as any,
      cameoDatabase,
      combatantSidebarModel,
      messageList,
      new ChatHistory(),
      new BoxedVar(""),
      new BoxedVar(false),
      undefined,
      [],
      new StalemateDetectTrait(),
      new CountdownTimer(),
      jsxRenderer,
      strings,
      Object.values(CommandBarButtonType).filter(
        (value) => typeof value === "number",
      ) as CommandBarButtonType[],
    );

    // Create minimap
    const minimap = new Minimap(game, player, 0xFFFFFF, rules.general.radar as any);
    minimap.setPointerEvents(pointer.pointerEvents);
    hud.setMinimap(minimap);
    this.disposables.add(minimap);

    // Add HUD to scene
    uiScene.add(hud);

    // Set up HUD event handlers
    hud.onSidebarSlotClick.subscribe((slotData: any) => {
      console.log("clicked", slotData);
    });

    hud.onOptButtonClick.subscribe(() => {
      pointer.unlock();
      const menuButtons: MenuButton[] = [
        {
          label: "Button 1",
          onClick(): void {
            console.log("button 1 clicked");
          },
        },
        {
          label: "Button 2", 
          disabled: true,
          onClick(): void {
            console.error("button 2 should not trigger onClick");
          },
        },
        {
          label: "Exit",
          isBottom: true,
          onClick(): void {
            pointer.lock();
            hud.hideSidebarMenu();
          },
        },
      ];
      hud.showSidebarMenu(menuButtons);
    });

    hud.onRepairButtonClick.subscribe(() => {
      const radarTrait = player.traits.get(RadarTrait);
      if (radarTrait) {
        radarTrait.setDisabled(!radarTrait.isDisabled());
      }
    });

    hud.onCommandBarButtonClick.subscribe((buttonType: CommandBarButtonType) => {
      console.log("Clicked command bar -> " + CommandBarButtonType[buttonType]);
    });

    // Start rendering
    const startTime = new Date().getTime();
    renderer.addScene(uiScene);
    
    const uiAnimationLoop = new UiAnimationLoop(renderer);
    this.disposables.add(uiAnimationLoop);
    uiAnimationLoop.start();

    const endTime = new Date().getTime();
    console.log("Rendering took " + (endTime - startTime) + "ms");

    // Add to DOM
    parentElement.appendChild(uiScene.getHtmlContainer().getElement());
    this.disposables.add(() => {
      parentElement.removeChild(uiScene.getHtmlContainer().getElement());
    });
  }

  private static buildHomeButton(): void {
    const homeButton = document.createElement('button');
    homeButton.innerHTML = '点此返回主页';
    homeButton.style.cssText = `
      position: fixed;
      left: 50%;
      top: 10px;
      transform: translateX(-50%);
      padding: 10px 20px;
      background-color: rgba(0, 0, 0, 0.8);
      color: white;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-radius: 6px;
      cursor: pointer;
      font-size: 16px;
      font-weight: bold;
      z-index: 1000;
      transition: all 0.3s ease;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    `;
    homeButton.onmouseover = () => {
      homeButton.style.backgroundColor = 'rgba(0, 0, 0, 0.95)';
      homeButton.style.borderColor = 'rgba(255, 255, 255, 0.6)';
      homeButton.style.transform = 'translateX(-50%) translateY(-2px)';
      homeButton.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.4)';
    };
    homeButton.onmouseout = () => {
      homeButton.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
      homeButton.style.borderColor = 'rgba(255, 255, 255, 0.3)';
      homeButton.style.transform = 'translateX(-50%) translateY(0)';
      homeButton.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.3)';
    };
    homeButton.onclick = () => {
      window.location.hash = '/';
    };
    document.body.appendChild(homeButton);
    this.disposables.add(() => homeButton.remove());
  }

  static destroy(): void {
    this.disposables.dispose();

    // Clear global caches to avoid stale resources on next entry
    try {
      const { PipOverlay } = require("@/engine/renderable/entity/PipOverlay");
      const { TextureUtils } = require("@/engine/gfx/TextureUtils");
      PipOverlay?.clearCaches?.();
      if (TextureUtils?.cache) {
        TextureUtils.cache.forEach((tex: any) => tex.dispose?.());
        TextureUtils.cache.clear();
      }
    } catch (err) {
      console.warn('[ShpTester] Failed to clear caches during destroy:', err);
    }
  }
}
