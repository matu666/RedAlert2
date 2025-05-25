import { Screen } from './Controller';

export abstract class RootScreen implements Screen {
  constructor() {
    // Base initialization
  }

  abstract onEnter(params?: any): void | Promise<void>;
  abstract onLeave(): void | Promise<void>;

  onStack?(): void | Promise<void> {
    // Default implementation - can be overridden
  }

  onUnstack?(): void | Promise<void> {
    // Default implementation - can be overridden
  }

  update?(deltaTime: number): void {
    // Default implementation - can be overridden
  }

  destroy?(): void {
    // Default implementation - can be overridden
  }

  // Abstract method for viewport changes
  abstract onViewportChange?(): void;
} 