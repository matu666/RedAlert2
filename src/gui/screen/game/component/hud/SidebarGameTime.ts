// 用 TypeScript 重写 SidebarGameTime 组件

import * as THREE from "three";
import { jsx } from "@/gui/jsx/jsx";
import { UiObject } from "@/gui/UiObject";
import { UiComponent, UiComponentProps } from "@/gui/jsx/UiComponent";
import { HtmlContainer } from "@/gui/HtmlContainer";
import { UiText } from "@/gui/component/UiText";
import { formatTimeDuration } from "@/util/format";

type SidebarModel = {
  currentGameTime: number;
  replayTime?: number;
  topTextLeftAlign: boolean;
};

type SidebarGameTimeProps = UiComponentProps & {
  textColor: string;
  width: number;
  height: number;
  zIndex?: number;
  sidebarModel: SidebarModel;
};

export class SidebarGameTime extends UiComponent<SidebarGameTimeProps> {
  text!: UiText;
  lastUpdate?: number;
  lastGameTime?: number;
  lastLeftAligned?: boolean;

  createUiObject(): UiObject {
    return new UiObject(
      new THREE.Object3D(),
      new HtmlContainer(),
    );
  }

  defineChildren() {
    const { textColor, width, height, zIndex } = this.props;
    return jsx(UiText, {
      ref: (e: UiText) => (this.text = e),
      value: "",
      textColor,
      width,
      height,
      zIndex,
    });
  }

  onFrame(now: number) {
    const {
      sidebarModel: { currentGameTime, replayTime, topTextLeftAlign },
    } = this.props;

    // 每 50ms 更新一次
    if (!this.lastUpdate || now - this.lastUpdate >= 50) {
      this.lastUpdate = now;

      // 更新时间文本
      if (this.lastGameTime !== currentGameTime) {
        this.text.setValue(
          formatTimeDuration(currentGameTime) +
            (replayTime ? " / " + formatTimeDuration(replayTime) : ""),
        );
        this.lastGameTime = currentGameTime;
      }

      // 更新对齐方式
      if (topTextLeftAlign !== this.lastLeftAligned) {
        if (topTextLeftAlign) {
          this.text.setTextAlign("left");
          this.text.getUiObject().setPosition(15, 0);
        } else {
          this.text.setTextAlign("center");
          this.text.getUiObject().setPosition(0, 0);
        }
        this.lastLeftAligned = topTextLeftAlign;
      }
    }
  }
}

export default SidebarGameTime;