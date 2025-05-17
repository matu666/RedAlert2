// Type augmentation for File System Access API and FileExplorer
declare global {
  // Options for the IndexedDB adapter
  interface FileSystemAccessIndexedDBAdapterOptions {
    name: string; // Name of the IndexedDB database
    rootName?: string; // Optional name for the root directory in the virtual file system
    // ... any other options fsalib might take
  }

  // The FileSystemAccess object that fsalib might put on window
  interface FileSystemAccessAPI {
    adapters?: {
      indexeddb: (options: FileSystemAccessIndexedDBAdapterOptions) => Promise<FileSystemDirectoryHandle>;
      // Potentially other adapters like cacheApi could be defined here
    };
    // Potentially other top-level methods or properties of the polyfill
  }

  interface Window {
    showDirectoryPicker?: () => Promise<FileSystemDirectoryHandle>;
    FileExplorer: any; // Type for the FileExplorer global
    FileSystemAccess?: FileSystemAccessAPI; // Add the fsalib object here
  }
  // Basic types for File System Access API handles
  interface FileSystemHandle {
    readonly kind: 'file' | 'directory';
    readonly name: string;
  }
  interface FileSystemFileHandle extends FileSystemHandle {
    readonly kind: 'file';
    getFile(): Promise<File>;
  }
  interface FileSystemDirectoryHandle extends FileSystemHandle {
    readonly kind: 'directory';
    entries(): AsyncIterableIterator<[string, FileSystemHandle]>;
    keys(): AsyncIterableIterator<string>;
    values(): AsyncIterableIterator<FileSystemHandle>;
    getDirectoryHandle(name: string, options?: { create?: boolean }): Promise<FileSystemDirectoryHandle>;
    getFileHandle(name: string, options?: { create?: boolean }): Promise<FileSystemFileHandle>;
    removeEntry(name: string, options?: { recursive?: boolean }): Promise<void>;
  }
}

// It can be useful to export an empty object to ensure this file is treated as a module
// if it doesn't contain any other top-level exports or imports.
// However, for a .d.ts file with `declare global`, this is often not necessary.
export {}; 