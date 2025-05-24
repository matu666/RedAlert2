/**
 * Error thrown when no suitable storage (like IndexedDB or File System Access API) is available or functional.
 */
export class NoStorageError extends Error {
  constructor(message: string = "No available or functional storage adapters found.") {
    super(message);
    this.name = "NoStorageError";
  }
} 