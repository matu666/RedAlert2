import { Screen } from '../../Controller';
import { MainMenuScreenType } from '../../ScreenType';
import { MainMenuController } from '../MainMenuController';
import { SidebarButton } from '../component/MainMenu';
import { Strings } from '../../../../data/Strings';

export class HomeScreen implements Screen {
  private strings: Strings;
  private appVersion: string;
  private storageEnabled: boolean;
  private quickMatchEnabled: boolean;
  private controller?: MainMenuController;

  constructor(
    strings: Strings,
    appVersion: string,
    storageEnabled: boolean = false,
    quickMatchEnabled: boolean = false
  ) {
    this.strings = strings;
    this.appVersion = appVersion;
    this.storageEnabled = storageEnabled;
    this.quickMatchEnabled = quickMatchEnabled;
  }

  setController(controller: MainMenuController): void {
    this.controller = controller;
  }

  onEnter(): void {
    console.log('[HomeScreen] Entering home screen');
    
    const buttons: SidebarButton[] = [
      {
        label: this.strings.get('GUI:QuickMatch') || 'Quick Match',
        tooltip: this.strings.get('STT:WOLWelcomeQuickMatch') || 'Quick multiplayer match',
        disabled: !this.quickMatchEnabled,
        onClick: () => {
          console.log('[HomeScreen] Quick Match clicked');
          alert('Quick Match - 功能开发中\n\n需要登录系统和服务器连接');
        }
      },
      {
        label: this.strings.get('GUI:CustomMatch') || 'Custom Match',
        tooltip: this.strings.get('STT:WOLWelcomeCustomMatch') || 'Custom multiplayer match',
        onClick: () => {
          console.log('[HomeScreen] Custom Match clicked');
          alert('Custom Match - 功能开发中\n\n需要登录系统和游戏大厅');
        }
      },
      {
        label: this.strings.get('GUI:Demo') || 'Demo Mode',
        tooltip: this.strings.get('STT:Demo') || 'Play a singleplayer match against a training dummy',
        onClick: () => {
          console.log('[HomeScreen] Demo Mode clicked');
          alert('Demo Mode - 功能开发中\n\n需要遭遇战系统和AI');
        }
      },
      {
        label: this.strings.get('GUI:Replays') || 'Replays',
        tooltip: this.strings.get('STT:Replays') || 'Play back a recording of a previously played game',
        onClick: () => {
          console.log('[HomeScreen] Replays clicked');
          alert('Replays - 功能开发中\n\n需要回放系统');
        }
      }
    ];

    // Add mods button if storage is enabled
    if (this.storageEnabled) {
      buttons.push({
        label: this.strings.get('GUI:Mods') || 'Mods',
        tooltip: this.strings.get('STT:Mods') || 'Manage and play modified versions of the base game',
        onClick: () => {
          console.log('[HomeScreen] Mods clicked');
          alert('Mods - 功能开发中\n\n需要模组管理系统');
        }
      });
    }

    // Add remaining buttons
    buttons.push(
      {
        label: this.strings.get('TS:InfoAndCredits') || 'Info & Credits',
        tooltip: this.strings.get('STT:InfoAndCredits') || 'Information and credits',
        onClick: () => {
          console.log('[HomeScreen] Info & Credits clicked');
          alert('Info & Credits - 功能开发中\n\n需要信息展示页面');
        }
      },
      {
        label: this.strings.get('GUI:Options') || 'Options',
        tooltip: this.strings.get('STT:MainButtonOptions') || 'Game options and settings',
        onClick: () => {
          console.log('[HomeScreen] Options clicked');
          alert('Options - 功能开发中\n\n需要设置界面');
        }
      },
      {
        label: this.strings.get('GUI:Fullscreen') || 'Fullscreen',
        tooltip: this.strings.get('STT:Fullscreen') || 'Toggle full screen mode',
        isBottom: true,
        disabled: false,
        onClick: () => {
          console.log('[HomeScreen] Fullscreen clicked');
          this.toggleFullscreen();
        }
      }
    );

    // Set the sidebar buttons
    if (this.controller) {
      this.controller.setSidebarButtons(buttons);
      this.controller.showSidebarButtons();
      this.controller.toggleMainVideo(true);
      this.controller.showVersion(this.appVersion);
    }
  }

  async onLeave(): Promise<void> {
    console.log('[HomeScreen] Leaving home screen');
    if (this.controller) {
      this.controller.hideVersion();
      await this.controller.hideSidebarButtons();
    }
  }

  async onStack(): Promise<void> {
    await this.onLeave();
  }

  onUnstack(): void {
    this.onEnter();
  }

  update(deltaTime: number): void {
    // Default implementation - can be overridden
  }

  destroy(): void {
    // Cleanup if needed
  }

  private toggleFullscreen(): void {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(err => {
        console.error('Error exiting fullscreen:', err);
        alert('无法退出全屏模式');
      });
    } else {
      document.documentElement.requestFullscreen().catch(err => {
        console.error('Error entering fullscreen:', err);
        alert('无法进入全屏模式\n\n请检查浏览器权限设置');
      });
    }
  }
} 