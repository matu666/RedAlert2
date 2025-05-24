import { LazyHtmlElement } from "./LazyHtmlElement";

export class HtmlContainer extends LazyHtmlElement {
  public visible: boolean = true;
  public left: number = 0;
  public top: number = 0;
  public width: number | string = 0; // Width can be number (px) or string (e.g., "100%")
  public height: number | string = 0; // Height can also be a string
  public relativeMode: boolean = false;
  public translateMode: boolean = false;

  constructor() {
    super(); // Call LazyHtmlElement constructor
  }

  render(): void {
    if (!this.isRendered()) {
      let el = this.getElement();
      if (!el) {
        el = document.createElement("div");
        this.setElement(el);
      }
      this.updateMode();
      this.updatePosition();
      this.updateVisibility();
      this.updateSize();
    }
    super.render(); // Handles setting isRendered = true and rendering children
  }

  setRelativeMode(isRelative: boolean): void {
    if (this.relativeMode !== isRelative) {
      this.relativeMode = isRelative;
      this.updateMode();
    }
  }

  setTranslateMode(useTranslate: boolean): void {
    if (this.translateMode !== useTranslate) {
      this.translateMode = useTranslate;
      this.updatePosition();
    }
  }

  setPosition(left: number, top: number): void {
    this.left = left;
    this.top = top;
    this.updatePosition();
  }

  setSize(width: number | string, height: number | string): void {
    this.width = width;
    this.height = height;
    this.updateSize();
  }

  getSize(): { width: number | string; height: number | string } {
    return { width: this.width, height: this.height };
  }

  setVisible(isVisible: boolean): void {
    if (this.visible !== isVisible) {
      this.visible = isVisible;
      this.updateVisibility();
    }
  }

  protected updateMode(): void {
    const el = this.getElement();
    if (el) {
      if (this.relativeMode) {
        el.style.position = "relative";
      } else {
        el.style.overflow = "visible"; // Original behavior
        el.style.position = "absolute";
      }
    }
  }

  protected updatePosition(): void {
    const el = this.getElement();
    if (el) {
      if (this.translateMode) {
        el.style.top = "0"; // Reset direct positioning if using translate
        el.style.left = "0";
        el.style.transform = `translate(${this.left}px, ${this.top}px)`;
      } else {
        el.style.left = typeof this.left === 'number' ? `${this.left}px` : this.left;
        el.style.top = typeof this.top === 'number' ? `${this.top}px` : this.top;
        el.style.transform = ""; // Clear transform if not in translateMode
      }
    }
  }

  protected updateSize(): void {
    const el = this.getElement();
    if (el) {
      el.style.width = typeof this.width === 'number' ? `${this.width}px` : this.width;
      el.style.height = typeof this.height === 'number' ? `${this.height}px` : this.height;
    }
  }

  hide(): void {
    this.setVisible(false);
  }

  show(): void {
    this.setVisible(true);
  }

  protected updateVisibility(): void {
    const el = this.getElement();
    if (el) {
      el.style.display = this.visible ? "block" : "none"; // Or consider previous display type
    }
  }
} 