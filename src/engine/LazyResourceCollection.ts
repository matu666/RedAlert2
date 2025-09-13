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
    const inMem = this.resources.has(key);
    const inVfs = this.vfs?.fileExists(key) ?? false;
    if (!inMem) {
      try { console.log('[LazyResourceCollection.has]', { key, inVfs }); } catch {}
    }
    return !!inMem || inVfs;
  }

  get(key: string): T | undefined {
    let resource = this.resources.get(key);
    if (!resource) {
      try { console.log('[LazyResourceCollection.get] miss -> probing VFS', { key }); } catch {}
      if (this.vfs?.fileExists(key)) {
        try {
          const owners = (this.vfs as any).debugListFileOwners?.(key);
          try { console.log('[LazyResourceCollection.get] owners', owners); } catch {}
        } catch {}
        const file = this.vfs.openFile(key);
        if (file) {
          resource = this.resourceFactory(file);
          this.resources.set(key, resource!);
          try { console.log('[LazyResourceCollection.get] loaded', { key }); } catch {}
        }
      } else {
        try {
          console.warn('[LazyResourceCollection.get] not found in VFS', { key, archives: this.vfs?.listArchives?.() });
        } catch {}
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