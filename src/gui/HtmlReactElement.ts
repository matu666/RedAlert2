import React from 'react';
import ReactDOM from 'react-dom';
import { HtmlContainer } from './HtmlContainer';

export class HtmlReactElement<P = any> extends HtmlContainer {
  private options: P;
  private Component: React.ComponentType<P>;

  static factory<P>(Component: React.ComponentType<P>, options: P): HtmlReactElement<P> {
    return new HtmlReactElement(options, Component);
  }

  constructor(options: P, Component: React.ComponentType<P>) {
    super();
    this.options = options;
    this.Component = Component;
  }

  render(): void {
    if (!this.isRendered()) {
      const element = document.createElement('div');
      this.setElement(element);
      this.renderReactElement();
    }
    super.render();
  }

  private renderReactElement(): void {
    const element = this.getElement();
    if (element) {
      ReactDOM.render(
        React.createElement(this.Component, this.options),
        element
      );
    }
  }

  applyOptions(callback: (options: P) => void): void {
    callback(this.options);
    this.refresh();
  }

  refresh(): void {
    if (this.isRendered()) {
      this.renderReactElement();
    }
  }

  unrender(): void {
    const element = this.getElement();
    if (element && this.isRendered()) {
      ReactDOM.unmountComponentAtNode(element);
    }
    super.unrender();
  }
} 