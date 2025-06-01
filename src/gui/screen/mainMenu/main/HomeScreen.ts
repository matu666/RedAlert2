import { Screen } from '../../Controller';
import { MainMenuScreenType } from '../../ScreenType';
import { MainMenuController } from '../MainMenuController';
import { Strings } from '../../../../data/Strings';
import { MusicType } from '../../../../engine/sound/Music';
import { MessageBoxApi } from '../../../component/MessageBoxApi';

interface SidebarButton {
  label: string;
  tooltip?: string;
  disabled?: boolean;
  isBottom?: boolean;
  onClick: () => void | Promise<void>;
}

export class HomeScreen implements Screen {
  private strings: Strings;
  private messageBoxApi: MessageBoxApi;
  private appVersion: string;
  private storageEnabled: boolean;
  private quickMatchEnabled: boolean;
  private controller?: MainMenuController;
  public title: string;
  public musicType: MusicType;

  constructor(
    strings: Strings,
    messageBoxApi: MessageBoxApi,
    appVersion: string,
    storageEnabled: boolean = false,
    quickMatchEnabled: boolean = false
  ) {
    this.strings = strings;
    this.messageBoxApi = messageBoxApi;
    this.appVersion = appVersion;
    this.storageEnabled = storageEnabled;
    this.quickMatchEnabled = quickMatchEnabled;
    this.title = this.strings.get("GUI:MainMenu") || "Main Menu";
    this.musicType = MusicType.Intro; // 主菜单播放INTRO音乐（如果不存在会有调试信息）
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
        onClick: async () => {
          console.log('[HomeScreen] Quick Match clicked');
          await this.messageBoxApi.alert('Quick Match - 功能开发中\n\n需要登录系统和服务器连接', this.strings.get('GUI:OK') || 'OK');
        }
      },
      {
        label: this.strings.get('GUI:CustomMatch') || 'Custom Match',
        tooltip: this.strings.get('STT:WOLWelcomeCustomMatch') || 'Custom multiplayer match',
        onClick: async () => {
          console.log('[HomeScreen] Custom Match clicked');
          await this.messageBoxApi.alert('Custom Match - 功能开发中\n\n需要登录系统和游戏大厅', this.strings.get('GUI:OK') || 'OK');
        }
      },
      {
        label: this.strings.get('GUI:Demo') || 'Demo Mode',
        tooltip: this.strings.get('STT:Demo') || 'Play a singleplayer match against a training dummy',
        onClick: async () => {
          console.log('[HomeScreen] Demo Mode clicked');
          await this.messageBoxApi.alert('Demo Mode - 功能开发中\n\n需要遭遇战系统和AI', this.strings.get('GUI:OK') || 'OK');
        }
      },
      {
        label: this.strings.get('GUI:Replays') || 'Replays',
        tooltip: this.strings.get('STT:Replays') || 'Play back a recording of a previously played game',
        onClick: async () => {
          console.log('[HomeScreen] Replays clicked');
          await this.messageBoxApi.alert('Replays - 功能开发中\n\n需要回放系统', this.strings.get('GUI:OK') || 'OK');
        }
      }
    ];

    // Add mods button if storage is enabled
    if (this.storageEnabled) {
      buttons.push({
        label: this.strings.get('GUI:Mods') || 'Mods',
        tooltip: this.strings.get('STT:Mods') || 'Manage and play modified versions of the base game',
        onClick: async () => {
          console.log('[HomeScreen] Mods clicked');
          await this.messageBoxApi.alert('Mods - 功能开发中\n\n需要模组管理系统', this.strings.get('GUI:OK') || 'OK');
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
          if (this.controller) {
            this.controller.pushScreen(MainMenuScreenType.InfoAndCredits);
          }
        }
      },
      {
        label: this.strings.get('GUI:Options') || 'Options',
        tooltip: this.strings.get('STT:MainButtonOptions') || 'Game options and settings',
        onClick: async () => {
          console.log('[HomeScreen] Options clicked');
          await this.messageBoxApi.alert('Options - 功能开发中\n\n需要设置界面', this.strings.get('GUI:OK') || 'OK');
        }
      },
      // 底层测试入口，进入各类底层测试与文件系统管理
      {
        label: '底层测试入口',
        tooltip: '进入底层文件系统与测试工具',
        onClick: () => {
          console.log('[HomeScreen] Test Entry clicked');
          if (this.controller) {
            this.controller.pushScreen(MainMenuScreenType.TestEntry);
          }
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

  private async toggleFullscreen(): Promise<void> {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await document.documentElement.requestFullscreen();
      }
    } catch (err) {
      console.error('Error toggling fullscreen:', err);
      await this.messageBoxApi.alert(
        document.fullscreenElement 
          ? '无法退出全屏模式' 
          : '无法进入全屏模式\n\n请检查浏览器权限设置',
        this.strings.get('GUI:OK') || 'OK'
      );
    }
  }
} 