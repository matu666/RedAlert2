import { RootScreen } from '../RootScreen';
import { MainMenu } from './component/MainMenu';
import { MainMenuController } from './MainMenuController';
import { MainMenuScreenType } from '../ScreenType';
import { HomeScreen } from './main/HomeScreen';
import { Strings } from '../../../data/Strings';
import { ShpFile } from '../../../data/ShpFile';
import { JsxRenderer } from '../../jsx/JsxRenderer';
import { LazyResourceCollection } from '../../../engine/LazyResourceCollection';

export interface UiScene {
  menuViewport: { x: number; y: number; width: number; height: number };
  viewport: { x: number; y: number; width: number; height: number };
  add(object: any): void;
  remove(object: any): void;
}

export class MainMenuRootScreen extends RootScreen {
  private subScreens: Map<MainMenuScreenType, any>;
  private uiScene: UiScene;
  private strings: Strings;
  private images: LazyResourceCollection<ShpFile>;
  private jsxRenderer: JsxRenderer;
  private videoSrc?: string | File;
  private sound?: any;
  private music?: any;
  private appVersion: string;

  // Components
  private mainMenu?: MainMenu;
  private mainMenuCtrl?: MainMenuController;

  constructor(
    subScreens: Map<MainMenuScreenType, any>,
    uiScene: UiScene,
    strings: Strings,
    images: LazyResourceCollection<ShpFile>,
    jsxRenderer: JsxRenderer,
    appVersion: string,
    videoSrc?: string | File,
    sound?: any,
    music?: any
  ) {
    super();
    this.subScreens = subScreens;
    this.uiScene = uiScene;
    this.strings = strings;
    this.images = images;
    this.jsxRenderer = jsxRenderer;
    this.appVersion = appVersion;
    this.videoSrc = videoSrc;
    this.sound = sound;
    this.music = music;
  }

  createView(): void {
    console.log('[MainMenuRootScreen] Creating view');
    console.log('[MainMenuRootScreen] Using menuViewport:', this.uiScene.menuViewport);
    console.log('[MainMenuRootScreen] Full viewport:', this.uiScene.viewport);
    
    this.mainMenu = new MainMenu(
      this.uiScene.menuViewport,
      this.images,
      this.jsxRenderer,
      this.videoSrc
    );
  }

  createViewAndController(): MainMenuController {
    console.log('[MainMenuRootScreen] Creating view and controller');
    
    this.createView();
    
    this.mainMenuCtrl = new MainMenuController(
      this.mainMenu,
      this.sound,
      this.music
    );

    // Subscribe to screen changes for logging/analytics
    this.mainMenuCtrl.onScreenChange.subscribe((screenType, controller) => {
      if (screenType !== undefined) {
        console.log(`[MainMenuRootScreen] Navigated to screen: ${screenType}`);
      } else {
        console.log('[MainMenuRootScreen] Navigated to previous screen');
      }
    });

    return this.mainMenuCtrl;
  }

  onViewportChange(): void {
    console.log('[MainMenuRootScreen] Viewport changed');
    console.log('[MainMenuRootScreen] New menuViewport:', this.uiScene.menuViewport);
    
    if (this.mainMenu) {
      this.mainMenu.setViewport(this.uiScene.menuViewport);
    }
    
    if (this.mainMenuCtrl) {
      this.mainMenuCtrl.rerenderCurrentScreen();
    }
  }

  onEnter(params?: any): void {
    console.log('[MainMenuRootScreen] Entering main menu root screen');
    
    const controller = this.createViewAndController();
    
    // Add all sub-screens to the controller
    for (const [screenType, screenClass] of this.subScreens) {
      const screen = new screenClass(
        this.strings,
        this.appVersion,
        false, // storageEnabled - TODO: get from config
        false  // quickMatchEnabled - TODO: get from config
      );
      
      // Set the controller for the screen if it has a setController method
      if (screen.setController) {
        screen.setController(controller);
      }
      
      controller.addScreen(screenType, screen);
    }

    // Add the main menu to the UI scene
    if (this.mainMenu) {
      this.uiScene.add(this.mainMenu);
    }

    // Navigate to initial screen after a short delay to ensure everything is set up
    setTimeout(() => {
      if (params?.route) {
        controller.goToScreen(params.route.screenType, params.route.params);
      } else {
        controller.goToScreen(MainMenuScreenType.Home);
      }
    }, 0);
  }

  async onLeave(): Promise<void> {
    console.log('[MainMenuRootScreen] Leaving main menu root screen');
    
    if (this.mainMenuCtrl) {
      this.mainMenuCtrl.toggleMainVideo(false);
      await this.mainMenuCtrl.leaveCurrentScreen();
      this.mainMenuCtrl.destroy();
      this.mainMenuCtrl = undefined;
    }

    if (this.mainMenu) {
      this.uiScene.remove(this.mainMenu);
      this.mainMenu.destroy();
      this.mainMenu = undefined;
    }
  }

  update(deltaTime: number): void {
    if (this.mainMenuCtrl) {
      this.mainMenuCtrl.update(deltaTime);
    }
    
    if (this.mainMenu) {
      this.mainMenu.update(deltaTime);
    }
  }

  destroy(): void {
    console.log('[MainMenuRootScreen] Destroying');
    
    if (this.mainMenuCtrl) {
      this.mainMenuCtrl.destroy();
    }
    
    if (this.mainMenu) {
      this.mainMenu.destroy();
    }
  }
} 