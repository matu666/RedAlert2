import { CommandBarButtonType } from "./CommandBarButtonType";

export class CommandBarButtonList {
  buttons: CommandBarButtonType[] = [];

  /**
   * 从ini对象解析按钮列表
   * @param iniSection 具有getString方法的ini节对象
   * @returns this
   */
  fromIni(iniSection: { getString: (key: string) => string | undefined }): this {
    const buttonListStr = iniSection.getString("ButtonList") ?? "";
    const buttonNames = buttonListStr.split(",").map(s => s.trim()).filter(Boolean);

    const validButtonNames = new Set(
      Object.keys(CommandBarButtonType).filter(key => isNaN(Number(key)))
    );

    const result: CommandBarButtonType[] = [];
    for (const name of buttonNames) {
      if (name === "x") {
        result.push(CommandBarButtonType.Separator);
      } else if (validButtonNames.has(name)) {
        // @ts-ignore
        result.push(CommandBarButtonType[name as keyof typeof CommandBarButtonType]);
      } else {
        console.warn(`Unknown command bar button type "${name}"`);
      }
    }
    this.buttons = result;
    return this;
  }
}