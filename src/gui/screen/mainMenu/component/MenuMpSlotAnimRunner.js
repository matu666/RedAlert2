import { MenuSlotAnimationRunner, AnimationType } from "./MenuSlotAnimationRunner";
import { AnimationState } from "../../../../engine/Animation";

export class MenuMpSlotAnimRunner extends MenuSlotAnimationRunner {
  getCurrentFrame() {
    if (
      this.currentAnimationType === AnimationType.None ||
      this.animation.getState() === AnimationState.DELAYED
    ) {
      return this.collapsed ? 6 : 0;
    }
    
    const direction = this.currentAnimationType === AnimationType.SlideIn ? -1 : 1;
    let baseFrame = 1;
    
    if (direction === -1) {
      baseFrame += 5;
    }
    
    return baseFrame + direction * this.animation.getCurrentFrame();
  }
} 