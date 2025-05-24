export class LazyHtmlElement {
  protected element?: HTMLElement;
  protected children: Set<LazyHtmlElement>; // Children are also LazyHtmlElements
  protected rendered: boolean;

  constructor(element?: HTMLElement) {
    this.children = new Set();
    this.rendered = false;
    if (element) {
      this.setElement(element);
    }
  }

  setElement(element: HTMLElement): void {
    this.element = element;
  }

  getElement(): HTMLElement | undefined {
    return this.element;
  }

  getChildren(): LazyHtmlElement[] {
    return [...this.children];
  }

  isRendered(): boolean {
    return this.rendered;
  }

  add(...elements: LazyHtmlElement[]): void {
    for (const el of elements) {
      if (!this.children.has(el)) {
        this.children.add(el);
        if (this.rendered) {
          this.renderChild(el);
        }
      }
    }
  }

  remove(...elements: LazyHtmlElement[]): void {
    for (const el of elements) {
      if (this.children.has(el)) {
        this.children.delete(el);
        if (this.rendered) {
          this.unrenderChild(el);
        }
      }
    }
  }

  removeAll(): void {
    this.remove(...this.children);
  }

  render(): void {
    if (!this.element) {
      throw new Error(
        "An HTML element must be set using setElement before rendering."
      );
    }
    if (this.rendered) return; // Already rendered

    this.children.forEach((child) => this.renderChild(child));
    this.rendered = true;
  }

  protected renderChild(child: LazyHtmlElement): void {
    child.render(); // Ensure child is rendered
    const childElement = child.getElement();
    if (childElement && this.element) { // Ensure both parent and child elements exist
        if (childElement.parentElement !== this.element) { // Avoid re-appending if already a direct child
            this.element.appendChild(childElement);
        }
    } else if (!this.element) {
        console.warn("LazyHtmlElement: Parent element not available for renderChild");
    }
  }

  protected unrenderChild(child: LazyHtmlElement): void {
    const childElement = child.getElement();
    child.unrender(); // Unrender the child first (this will detach its own children)
    if (childElement && this.element && childElement.parentElement === this.element) {
      this.element.removeChild(childElement);
    }
  }

  unrender(): void {
    if (!this.isRendered()) {
      return;
    }
    // Unrender children before modifying this.rendered state, so they correctly detach
    this.children.forEach((child) => this.unrenderChild(child));
    // Note: The original implementation unrendered child, then if childElement.parentElement was this.element, removed it.
    // My unrenderChild now handles both unrender and remove if parent matches.
    this.rendered = false;
    // The element itself (this.element) is not removed from its parent here, only its children are detached.
    // If this LazyHtmlElement is a child of another, its parent is responsible for detaching this.element.
  }
} 