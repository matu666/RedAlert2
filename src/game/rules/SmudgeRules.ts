import { ObjectRules } from './ObjectRules';

export class SmudgeRules extends ObjectRules {
  public burn!: boolean;
  public crater!: boolean;
  public width!: number;
  public height!: number;

  protected parse(): void {
    super.parse();
    this.burn = this.ini.getBool("Burn");
    this.crater = this.ini.getBool("Crater");
    this.width = this.ini.getNumber("Width", 1);
    this.height = this.ini.getNumber("Height", 1);
  }
}