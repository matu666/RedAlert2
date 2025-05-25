import { IniSection } from "../../../../data/IniSection";
import { ShpFile } from "../../../../data/ShpFile";
import { Animation, AnimationState } from "../../../../engine/Animation";
import { AnimProps } from "../../../../engine/AnimProps";
import { Engine } from "../../../../engine/Engine";
import { BoxedVar } from "../../../../util/BoxedVar";

export const AnimationType = {
  None: 0,
  SlideIn: 1,
  SlideOut: 2,
};

export const MenuButtonState = {
  Hidden: 0,
  Unlit: 1,
  Normal: 2,
  Active: 3,
};

export class MenuSlotAnimationRunner {
  constructor(delayFrames = 0) {
    this.delayFrames = delayFrames;
    this.buttonState = MenuButtonState.Hidden;
    this.collapsed = true;
    this.currentAnimationType = AnimationType.None;
  }

  slideIn() {
    this.currentAnimationType = AnimationType.SlideIn;
    this.initAnimation();
  }

  slideOut() {
    this.currentAnimationType = AnimationType.SlideOut;
    this.initAnimation();
  }

  initAnimation() {
    const iniSection = new IniSection("");
    let animProps = new AnimProps(iniSection, new ShpFile());
    animProps.loopEnd = 5;
    
    const animation = new Animation(
      animProps,
      new BoxedVar(Engine.UI_ANIM_SPEED),
    );
    this.animation = animation;
  }

  tick(deltaTime) {
    let animation = this.animation;
    const animationType = this.currentAnimationType;
    
    if (animation && animationType !== AnimationType.None) {
      switch (animation.getState()) {
        case AnimationState.STOPPED:
          break;
        case AnimationState.NOT_STARTED:
          animation.start(deltaTime, this.delayFrames);
        case AnimationState.RUNNING:
        default:
          animation.update(deltaTime);
      }
      
      if (animation.getState() === AnimationState.STOPPED) {
        this.collapsed = animationType === AnimationType.SlideOut;
        this.currentAnimationType = AnimationType.None;
      }
    }
  }

  shouldUpdate() {
    return true;
  }

  isStopped() {
    return this.currentAnimationType === AnimationType.None;
  }

  getCurrentFrame() {
    if (
      this.currentAnimationType !== AnimationType.None &&
      this.animation.getState() !== AnimationState.DELAYED
    ) {
      const direction = this.currentAnimationType === AnimationType.SlideIn ? -1 : 1;
      let baseFrame = this.buttonState !== MenuButtonState.Hidden ? 5 : 11;
      
      if (direction === -1) {
        baseFrame += 5;
      }
      
      return baseFrame + direction * this.animation.getCurrentFrame();
    }
    
    let frame;
    if (this.collapsed) {
      frame = this.buttonState === MenuButtonState.Hidden ? 16 : 10;
    } else if (this.buttonState === MenuButtonState.Hidden) {
      frame = 0;
    } else if (this.buttonState === MenuButtonState.Unlit) {
      frame = 1;
    } else if (this.buttonState === MenuButtonState.Normal) {
      frame = 2;
    } else if (this.buttonState === MenuButtonState.Active) {
      frame = 4;
    } else {
      throw new Error(`Unknown buttonState "${this.buttonState}"`);
    }
    
    return frame;
  }
} 