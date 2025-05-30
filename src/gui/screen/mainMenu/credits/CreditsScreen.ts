import { Screen } from '../../Controller';
import { MainMenuController } from '../MainMenuController';
import { Strings } from '../../../../data/Strings';
import { JsxRenderer } from '../../../jsx/JsxRenderer';
import { Engine } from '../../../../engine/Engine';
import { Credits } from './Credits';
import { jsx } from '../../../jsx/jsx';
import { HtmlView } from '../../../jsx/HtmlView';

export class CreditsScreen implements Screen {
  private strings: Strings;
  private jsxRenderer: JsxRenderer;
  private controller?: MainMenuController;
  public title: string;

  constructor(strings: Strings, jsxRenderer: JsxRenderer) {
    this.strings = strings;
    this.jsxRenderer = jsxRenderer;
    this.title = this.strings.get("GUI:Credits") || "Credits";
  }

  setController(controller: MainMenuController): void {
    this.controller = controller;
  }

  onEnter(): void {
    console.log('[CreditsScreen] Entering credits screen');

    // 设置侧边栏按钮 - 只有返回按钮
    this.controller?.setSidebarButtons([
      {
        label: this.strings.get("GUI:Back") || "Back",
        isBottom: true,
        onClick: () => {
          console.log('[CreditsScreen] Back clicked');
          this.controller?.leaveCurrentScreen();
        }
      }
    ]);

    this.controller?.showSidebarButtons();
    this.controller?.toggleMainVideo(false); // 关闭背景视频

    // 从VFS读取制作人员文件 - 如实迁移原项目逻辑
    let creditscdContent = "";
    let creditsContent = "";

    try {
      if (Engine.vfs) {
        // 尝试读取 creditscd.txt (可能不存在)
        try {
          creditscdContent = Engine.vfs.openFile("creditscd.txt").readAsString("utf-8") || "";
        } catch (e) {
          console.warn('[CreditsScreen] creditscd.txt not found, using empty content');
          creditscdContent = "";
        }

        // 尝试读取 credits.txt (主要制作人员文件)
        try {
          creditsContent = Engine.vfs.openFile("credits.txt").readAsString() || "";
        } catch (e) {
          console.warn('[CreditsScreen] credits.txt not found, using fallback content');
          creditsContent = this.getFallbackCreditsContent();
        }
      } else {
        console.warn('[CreditsScreen] VFS not available, using fallback content');
        creditsContent = this.getFallbackCreditsContent();
      }
    } catch (error) {
      console.error('[CreditsScreen] Error reading credits files:', error);
      creditsContent = this.getFallbackCreditsContent();
    }

    // 将 creditscd.txt 内容插入到 credits.txt 的 {CRD:CREDITS} 占位符中
    const finalContent = creditsContent.replace(/\s+\{CRD:CREDITS\}\s+/, creditscdContent);

    // 使用JSX渲染系统渲染Credits组件
    try {
      const [renderedElement] = this.jsxRenderer.render(
        jsx(HtmlView, {
          width: "100%",
          height: "100%",
          component: Credits,
          props: { 
            contentTpl: finalContent, 
            strings: this.strings 
          }
        })
      );

      this.controller?.setMainComponent(renderedElement);
    } catch (error) {
      console.error('[CreditsScreen] Error rendering credits:', error);
      // 如果渲染失败，显示简单的HTML内容
      this.controller?.setMainComponent(this.createFallbackElement(finalContent));
    }
  }

  async onLeave(): Promise<void> {
    console.log('[CreditsScreen] Leaving credits screen');
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

  private getFallbackCreditsContent(): string {
    // 如果无法从VFS读取，提供基本的制作人员信息
    return `网页红井制作组\t\n\n` +
           `原项目开发\tChronodivide\n` +
           `React迁移\t网页红井制作组\n` +
           `技术支持\t思牛逼公众号\n\n` +
           `{TS:Disclaimer}\n\n` +
           `{TXT_Copyright}`;
  }

  private createFallbackElement(content: string): HTMLElement {
    // 简单的HTML渲染作为后备方案
    const div = document.createElement('div');
    div.className = 'credits-container';
    div.style.cssText = `
      width: 100%;
      height: 100%;
      overflow-y: auto;
      padding: 20px;
      color: white;
      background: rgba(0, 0, 0, 0.8);
    `;
    
    const creditsDiv = document.createElement('div');
    creditsDiv.className = 'credits';
    creditsDiv.innerHTML = content
      .replace(/\{([^}]+)\}/g, (match, key) => this.strings.get(key) || match)
      .replace(/\t*\r?\n/g, "<br />")
      .replace(/([^>]+)\t+([^<]+)<br \/>/g, 
        `<div style="display: flex; justify-content: space-between; margin: 5px 0;">
          <span>$1</span>
          <span>$2</span>
        </div>`);
    
    div.appendChild(creditsDiv);
    return div;
  }
} 