import { Screen } from '../../Controller';
import { MainMenuController } from '../MainMenuController';
import { MainMenuScreenType } from '../../ScreenType';
import { Strings } from '../../../../data/Strings';
import { MessageBoxApi } from '../../../component/MessageBoxApi';
import { Config } from '../../../../Config';
import { ReportBug } from '../main/ReportBug';
import React from 'react';

interface SidebarButton {
  label: string;
  tooltip?: string;
  disabled?: boolean;
  isBottom?: boolean;
  onClick: () => void | Promise<void>;
}

export class InfoAndCreditsScreen implements Screen {
  private strings: Strings;
  private messageBoxApi: MessageBoxApi;
  private controller?: MainMenuController;
  public title: string;

  constructor(strings: Strings, messageBoxApi: MessageBoxApi) {
    this.strings = strings;
    this.messageBoxApi = messageBoxApi;
    this.title = this.strings.get("TS:InfoAndCredits") || "Info & Credits";
  }

  setController(controller: MainMenuController): void {
    this.controller = controller;
  }

  onEnter(): void {
    console.log('[InfoAndCreditsScreen] Entering info and credits screen');

    const buttons: SidebarButton[] = [];
    
    // 补丁说明按钮 (暂时跳过，等hasScreen方法实现后再启用)
    // if (this.controller?.hasScreen?.(MainMenuScreenType.PatchNotes)) {
    //   buttons.push({
    //     label: this.strings.get("TS:PatchNotes") || "Patch Notes",
    //     tooltip: this.strings.get("STT:PatchNotes") || "显示游戏客户端每个版本的更改日志",
    //     onClick: () => {
    //       console.log('[InfoAndCreditsScreen] Patch Notes clicked');
    //       this.controller?.pushScreen(MainMenuScreenType.PatchNotes);
    //     }
    //   });
    // }

    // 报告错误按钮 (暂时禁用，等Config集成后再启用)
    // const discordUrl = this.config.discordUrl;
    // if (discordUrl) {
    //   buttons.push({
    //     label: this.strings.get("TS:ReportBug") || "Report Bug",
    //     tooltip: this.strings.get("TS:ReportBugTT") || "请微信关注公众号 思牛逼 报告BUG或者获取解决方案！",
    //     onClick: () => {
    //       console.log('[InfoAndCreditsScreen] Report Bug clicked');
    //       this.messageBoxApi.show(
    //         React.createElement(ReportBug, {
    //           discordUrl: discordUrl,
    //           strings: this.strings
    //         }),
    //         this.strings.get("GUI:OK") || "OK"
    //       );
    //     }
    //   });
    // }

    // 捐赠按钮 (暂时禁用，等Config集成后再启用)
    // const donateUrl = this.config.donateUrl;
    // if (donateUrl) {
    //   buttons.push({
    //     label: this.strings.get("TS:Donate") || "Donate",
    //     onClick: () => {
    //       console.log('[InfoAndCreditsScreen] Donate clicked');
    //       window.open(donateUrl, "_blank");
    //       // 可选的分析跟踪
    //       if (typeof window.gtag === 'function') {
    //         window.gtag("event", "donate_click");
    //       }
    //     }
    //   });
    // }

    // 查看制作人员按钮 (必有)
    buttons.push({
      label: this.strings.get("GUI:ViewCredits") || "View Credits",
      onClick: () => {
        console.log('[InfoAndCreditsScreen] View Credits clicked');
        this.controller?.pushScreen(MainMenuScreenType.Credits);
      }
    });

    // 返回按钮
    buttons.push({
      label: this.strings.get("GUI:Back") || "Back",
      isBottom: true,
      onClick: () => {
        console.log('[InfoAndCreditsScreen] Back clicked');
        this.controller?.leaveCurrentScreen();
      }
    });

    // 设置侧边栏按钮并显示
    this.controller?.setSidebarButtons(buttons);
    this.controller?.showSidebarButtons();
    this.controller?.toggleMainVideo(true); // 保持背景视频播放
    this.controller?.setMainComponent(); // 清空主要内容区域
  }

  async onLeave(): Promise<void> {
    console.log('[InfoAndCreditsScreen] Leaving info and credits screen');
    if (this.controller) {
      await this.controller.hideSidebarButtons();
    }
  }

  async onStack(): Promise<void> {
    await this.onLeave();
  }

  onUnstack(): void {
    // 当从栈上弹出时，重新进入
    this.onEnter();
  }

  update(deltaTime: number): void {
    // Default implementation
  }

  destroy(): void {
    // Cleanup if needed
  }
} 