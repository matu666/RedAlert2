import type { VirtualFileSystem } from '../data/vfs/VirtualFileSystem';
import type { VirtualFile } from '../data/vfs/VirtualFile'; // Or DataStream, depending on what openFile returns and factory expects

export class LazyResourceCollection<T> {
  private resourceFactory: (file: VirtualFile) => T; // Assuming openFile returns VirtualFile or compatible
  private resources: Map<string, T> = new Map();
  private vfs?: VirtualFileSystem;

  constructor(resourceFactory: (file: VirtualFile) => T) {
    this.resourceFactory = resourceFactory;
  }

  setVfs(vfs: VirtualFileSystem): void {
    this.vfs = vfs;
  }

  set(key: string, resource: T): void {
    this.resources.set(key, resource);
  }

  has(key: string): boolean {
    return !!this.resources.has(key) || (this.vfs?.fileExists(key) ?? false);
  }

  get(key: string): T | undefined {
    let resource = this.resources.get(key);
    if (!resource && this.vfs?.fileExists(key)) {
      const file = this.vfs.openFile(key);
      if (file) { // Ensure file is not undefined if openFile can return that
        resource = this.resourceFactory(file);
        this.resources.set(key, resource!);
      }
    }
    return resource;
  }

  clear(key?: string): void {
    if (key) {
      this.resources.delete(key);
    } else {
      this.resources.clear();
    }
  }

  // Added to match usage in Engine.ts, assuming it clears all loaded resources
  clearAll(): void {
    this.resources.clear();
  }
} 