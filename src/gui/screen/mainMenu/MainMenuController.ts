import { Controller, Screen } from '../Controller';
import { MainMenuScreenType } from '../ScreenType';
import { EventDispatcher } from '../../../util/event';

export class MainMenuController extends Controller {
  private mainMenu: any; // MainMenu component
  private sound?: any; // Sound system
  private music?: any; // Music system

  constructor(mainMenu: any, sound?: any, music?: any) {
    super();
    this.mainMenu = mainMenu;
    this.sound = sound;
    this.music = music;
    
    console.log('[MainMenuController] Initialized');
  }

  // Override to use MainMenuScreenType
  async goToScreenBlocking(screenType: MainMenuScreenType, params?: any): Promise<void> {
    return super.goToScreenBlocking(screenType, params);
  }

  goToScreen(screenType: MainMenuScreenType, params?: any): void {
    return super.goToScreen(screenType, params);
  }

  async pushScreen(screenType: MainMenuScreenType, params?: any): Promise<void> {
    return super.pushScreen(screenType, params);
  }

  // Main menu specific methods
  setSidebarButtons(buttons: any[]): void {
    console.log(`[MainMenuController] Setting ${buttons.length} sidebar buttons`);
    if (this.mainMenu && this.mainMenu.setButtons) {
      this.mainMenu.setButtons(buttons);
    }
  }

  showSidebarButtons(): void {
    console.log('[MainMenuController] Showing sidebar buttons');
    if (this.mainMenu && this.mainMenu.showButtons) {
      this.mainMenu.showButtons();
    }
  }

  async hideSidebarButtons(): Promise<void> {
    console.log('[MainMenuController] Hiding sidebar buttons');
    if (this.mainMenu && this.mainMenu.hideButtons) {
      this.mainMenu.hideButtons();
    }
    // Return a promise that resolves after animation time
    return new Promise(resolve => {
      setTimeout(resolve, 300); // Match animation time
    });
  }

  toggleMainVideo(show: boolean): void {
    console.log(`[MainMenuController] ${show ? 'Showing' : 'Hiding'} main video`);
    if (this.mainMenu && this.mainMenu.toggleVideo) {
      this.mainMenu.toggleVideo(show);
    }
  }

  showVersion(version: string): void {
    console.log(`[MainMenuController] Showing version: ${version}`);
    if (this.mainMenu && this.mainMenu.showVersion) {
      this.mainMenu.showVersion(version);
    }
  }

  hideVersion(): void {
    console.log('[MainMenuController] Hiding version');
    if (this.mainMenu && this.mainMenu.hideVersion) {
      this.mainMenu.hideVersion();
    }
  }

  setSidebarTitle(title: string): void {
    console.log(`[MainMenuController] Setting sidebar title: ${title}`);
    if (this.mainMenu && this.mainMenu.setSidebarTitle) {
      this.mainMenu.setSidebarTitle(title);
    }
  }

  rerenderCurrentScreen(): void {
    console.log('[MainMenuController] Rerendering current screen');
    // Force current screen to re-enter if it exists
    const currentScreen = this.getCurrentScreen();
    const currentScreenType = this.getCurrentScreenType();
    
    if (currentScreen && currentScreenType !== undefined) {
      // Re-enter the current screen to refresh its state
      currentScreen.onLeave();
      currentScreen.onEnter();
    }
  }

  destroy(): void {
    console.log('[MainMenuController] Destroying');
    super.destroy();
  }
} 