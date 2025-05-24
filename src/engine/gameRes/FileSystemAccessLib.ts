export interface FileSystemAccessAdapterSupport {
  native?: boolean;
  cache?: boolean;
  [key: string]: any; // For other potential adapter support flags
}

export interface FileSystemAccessAdapters {
  indexeddb?: any; // Type for IndexedDB adapter module/function
  cache?: any;     // Type for Cache adapter module/function
  [key: string]: any; // For other potential adapters
}

export interface FileSystemAccessLib {
  support: {
    adapter: FileSystemAccessAdapterSupport;
  };
  adapters: FileSystemAccessAdapters;
  getOriginPrivateDirectory: (adapterModule?: any) => Promise<FileSystemDirectoryHandle>;
  // Define other methods and properties of fsalib.min.js as they are identified
  [key: string]: any; // Allows for other properties not yet strictly typed
}

// It's assumed that an instance of this type will be available globally
// or imported from the actual 'file-system-access' library.
// For example: declare global { var fsalib: FileSystemAccessLib; }
// Or it will be passed as a dependency. 