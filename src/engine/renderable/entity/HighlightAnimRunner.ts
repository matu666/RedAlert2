import { SimpleRunner } from '@/engine/animation/SimpleRunner';
import { Animation } from '@/engine/Animation';
import { AnimProps } from '@/engine/AnimProps';
import { IniSection } from '@/data/IniSection';
import { ShpFile } from '@/data/ShpFile';

export class HighlightAnimRunner extends SimpleRunner {
  private maxAmount: number;
  private animation: Animation;

  constructor(gameSpeed: number, maxAmount: number = 0.5, loopEnd: number = 2, rate: number = 5) {
    super();
    this.maxAmount = maxAmount;
    
    const props = new AnimProps(
      new IniSection("dummy"),
      new ShpFile()
    );
    
    props.rate = rate;
    props.loopEnd = loopEnd - 1;
    props.loopCount = 2;
    
    this.animation = new Animation(props, gameSpeed);
    this.animation.stop();
  }

  animate(loopCount: number): void {
    this.animation.props.loopCount = loopCount;
    this.animation.reset();
  }

  getValue(): number {
    return (1 - this.getCurrentFrame()) * this.maxAmount;
  }
}