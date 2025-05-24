import { StorageQuotaError } from "./StorageQuotaError";
import { equalsIgnoreCase } from "../../util/string";
import { FileNotFoundError } from "./FileNotFoundError";
import { IOError } from "./IOError";
import { NameNotAllowedError } from "./NameNotAllowedError";
import { VirtualFile } from "./VirtualFile";

// Assumes File System Access API types are available (e.g., via tsconfig lib "DOM")
// type FileSystemDirectoryHandle = any; // Placeholder if not fully available
// type FileSystemFileHandle = any;
// type FileSystemHandle = any;

export class RealFileSystemDir {
  private handle: FileSystemDirectoryHandle;
  public caseSensitive: boolean;

  constructor(handle: FileSystemDirectoryHandle, caseSensitive: boolean = false) {
    this.handle = handle;
    this.caseSensitive = caseSensitive;
  }

  getNativeHandle(): FileSystemDirectoryHandle {
    return this.handle;
  }

  get name(): string {
    return this.handle.name;
  }

  async *getEntries(): AsyncGenerator<string, void, undefined> {
    try {
      for await (const [key, _handle] of this.handle.entries()) {
        yield key;
      }
    } catch (e: any) {
      if (e.name === "NotFoundError") {
        throw new FileNotFoundError(
          `Directory \"${this.handle.name}\" not found`,
          e,
        );
      }
      if (e instanceof DOMException) {
        throw new IOError(
          `Directory \"${this.handle.name}\" could not be read (${e.name})`,
          e,
        );
      }
      throw e;
    }
  }

  async listEntries(): Promise<string[]> {
    const entries: string[] = [];
    for await (const entry of this.getEntries()) {
      entries.push(entry);
    }
    return entries;
  }

  async *getFileHandles(): AsyncGenerator<FileSystemFileHandle, void, undefined> {
    try {
      for await (const entryHandle of this.handle.values()) {
        if (entryHandle.kind === "file") {
          yield entryHandle as FileSystemFileHandle;
        }
      }
    } catch (e: any) {
      if (e.name === "NotFoundError") {
        throw new FileNotFoundError(
          `Directory \"${this.handle.name}\" not found`,
          e,
        );
      }
      if (e instanceof DOMException) {
        throw new IOError(
          `Directory \"${this.handle.name}\" could not be read (${e.name})`,
          e,
        );
      }
      throw e;
    }
  }

  async *getRawFiles(): AsyncGenerator<File, void, undefined> {
    for await (const fileHandle of this.getFileHandles()) {
      yield await fileHandle.getFile();
    }
  }

  async containsEntry(entryName: string): Promise<boolean> {
    return (await this.resolveEntryName(entryName)) !== undefined;
  }

  async resolveEntryName(entryName: string): Promise<string | undefined> {
    if (this.caseSensitive) {
      try {
        // Try getting as file first, then as directory
        const fileHandle = await this.handle.getFileHandle(entryName).catch(() => null);
        if (fileHandle) return fileHandle.name;
        const dirHandle = await this.handle.getDirectoryHandle(entryName).catch(() => null);
        if (dirHandle) return dirHandle.name;
        return undefined;
      } catch {
        return undefined; // Should be caught by individual catches, but as a fallback
      }
    } else {
      for await (const key of this.getEntries()) {
        if (equalsIgnoreCase(key, entryName)) {
          return key;
        }
      }
    }
    return undefined;
  }

  async fixEntryCase(entryName: string): Promise<string> {
    if (!this.caseSensitive) {
      for await (const key of this.getEntries()) {
        if (equalsIgnoreCase(key, entryName)) {
          return key; // Return the name with correct casing
        }
      }
    }
    return entryName; // Return original if case sensitive or no match found
  }

  async getRawFile(
    filename: string,
    skipCaseFix: boolean = false,
    type?: string,
  ): Promise<File> {
    let fileHandle: FileSystemFileHandle;
    try {
      const resolvedName = skipCaseFix ? filename : await this.fixEntryCase(filename);
      fileHandle = await this.handle.getFileHandle(resolvedName);
    } catch (e: any) {
      if (e.name === "NotFoundError") {
        throw new FileNotFoundError(
          `File \"${filename}\" not found in directory \"${this.handle.name}\"`,
          e,
        );
      }
      if (e instanceof TypeError && e.message.includes("not allowed")) {
        throw new NameNotAllowedError(`File name \"${filename}\" is not allowed`, e);
      }
      if (e instanceof DOMException) {
        throw new IOError(`File \"${filename}\" could not be read (${e.name})`, e);
      }
      throw e;
    }
    const file = await fileHandle.getFile();
    if (type) {
      // Re-create file object with specific MIME type if provided
      return new File([await file.arrayBuffer()], file.name, { type });
    }
    return file;
  }

  async openFile(filename: string, skipCaseFix: boolean = false): Promise<VirtualFile> {
    const rawFile = await this.getRawFile(filename, skipCaseFix);
    return VirtualFile.fromRealFile(rawFile);
  }

  async writeFile(virtualFile: VirtualFile, filenameOverride?: string): Promise<void> {
    const resolvedFilename = filenameOverride ?? virtualFile.filename;
    try {
      const finalFilename = await this.fixEntryCase(resolvedFilename);
      // Original code had `await this.deleteFile(s, !0);` (s = finalFilename, !0 = true)
      // This means it tries to delete before writing. Let's replicate but be careful.
      // If deleteFile throws (e.g. not found), we might want to ignore that specific error.
      try {
        await this.deleteFile(finalFilename, true); // skipCaseFix = true as finalFilename is already fixed
      } catch (delError: any) {
        if (!(delError instanceof FileNotFoundError)) { // Only ignore if it was not found
            // console.warn(`Pre-delete failed for ${finalFilename} (continuing write):`, delError);
        }
      }

      const fileHandle = await this.handle.getFileHandle(finalFilename, { create: true });
      const writable = await fileHandle.createWritable();
      try {
        // virtualFile.getBytes() returns a Uint8Array view of the stream's buffer
        // This is what should be written.
        await writable.write(virtualFile.getBytes());
        await writable.close();
      } catch (writeError) {
        await writable.abort(); // Abort on write error
        throw writeError; // Re-throw the error
      }
    } catch (e: any) {
      if (e.name === "QuotaExceededError" || (e instanceof DOMException && e.message.toLowerCase().includes("quota"))) {
        throw new StorageQuotaError(undefined, e);
      }
      if (e.name === "NotFoundError") { // Can happen if directory itself vanishes
        throw new FileNotFoundError(
          `Directory \"${this.handle.name}\" not found during writeFile operation for \"${resolvedFilename}\"`,
          e,
        );
      }
      if (e instanceof TypeError && e.message.includes("not allowed")) {
        throw new NameNotAllowedError(`File name \"${resolvedFilename}\" is not allowed`, e);
      }
      if (e instanceof DOMException) {
        throw new IOError(`File \"${resolvedFilename}\" could not be written (${e.name})`, e);
      }
      throw e;
    }
  }

  async deleteFile(filename: string, skipCaseFix: boolean = false): Promise<void> {
    const resolvedName = skipCaseFix ? filename : await this.resolveEntryName(filename);
    if (resolvedName) {
      try {
        await this.handle.removeEntry(resolvedName);
      } catch (e: any) {
        // Original code has: `if (t && "NotFoundError" === e.name) return;` (t = skipCaseFix)
        // This means if skipCaseFix is true and file is not found, it doesn't throw.
        if (skipCaseFix && e.name === "NotFoundError") {
          return;
        }
        if (e.name === "QuotaExceededError" || (e instanceof DOMException && e.message.toLowerCase().includes("quota"))) {
          throw new StorageQuotaError(undefined, e);
        }
        if (e instanceof TypeError && e.message.includes("not allowed")) {
          throw new NameNotAllowedError(`File name \"${resolvedName}\" is not allowed for deletion`, e);
        }
        if (e instanceof DOMException) { // e.g., "InvalidModificationError" if trying to delete non-empty dir
          throw new IOError(`File \"${resolvedName}\" could not be deleted (${e.name})`, e);
        }
        throw e;
      }
    }
    // If resolvedName is undefined (file not found and not skipping case fix), do nothing (matches original implicit behavior)
  }

  async getDirectory(
    dirName: string,
    forceCaseSensitive: boolean = this.caseSensitive,
  ): Promise<RealFileSystemDir> {
    const resolvedName = forceCaseSensitive ? dirName : await this.fixEntryCase(dirName);
    let dirHandle: FileSystemDirectoryHandle;
    try {
      dirHandle = await this.handle.getDirectoryHandle(resolvedName);
    } catch (e: any) {
      if (e.name === "NotFoundError") {
        throw new FileNotFoundError(
          `Directory \"${dirName}\" not found or parent directory \"${this.handle.name}\" is gone`,
          e,
        );
      }
      if (e instanceof TypeError && e.message.includes("not allowed")) {
        throw new NameNotAllowedError(`Directory name \"${dirName}\" is not allowed`, e);
      }
      if (e instanceof DOMException) {
        throw new IOError(`Directory \"${dirName}\" could not be read (${e.name})`, e);
      }
      throw e;
    }
    return new RealFileSystemDir(dirHandle, forceCaseSensitive);
  }

  async getOrCreateDirectory(
    dirName: string,
    forceCaseSensitive: boolean = this.caseSensitive,
  ): Promise<RealFileSystemDir> {
    const resolvedName = forceCaseSensitive ? dirName : await this.fixEntryCase(dirName);
    try {
      const dirHandle = await this.handle.getDirectoryHandle(resolvedName, { create: true });
      return new RealFileSystemDir(dirHandle, forceCaseSensitive);
    } catch (e: any) {
      if (e.name === "QuotaExceededError" || (e instanceof DOMException && e.message.toLowerCase().includes("quota"))) {
        throw new StorageQuotaError(undefined, e);
      }
      // "NotFoundError" can occur if the path to the parent is gone.
      if (e.name === "NotFoundError") {
         throw new FileNotFoundError(
            `Directory \"${this.handle.name}\" not found while trying to create/get \"${dirName}\"`,
             e,
         );
      }
      if (e instanceof TypeError && e.message.includes("not allowed")) {
        throw new NameNotAllowedError(`Directory name \"${dirName}\" is not allowed`, e);
      }
      if (e instanceof DOMException) { // Other DOMExceptions like "TypeMismatchError" if entry exists but is a file
        throw new IOError(`Directory \"${dirName}\" could not be created/accessed (${e.name})`, e);
      }
      throw e;
    }
  }

  /**
   * Gets or creates a directory and returns its native FileSystemDirectoryHandle.
   * Placeholder - might need more specific implementation based on Engine.ts usage.
   */
  async getOrCreateDirectoryHandle(
    dirName: string,
    isPrivate?: boolean, // isPrivate might map to forceCaseSensitive or other options
  ): Promise<FileSystemDirectoryHandle> {
    // This is a simplification. `isPrivate` might need specific handling.
    // For now, assuming isPrivate might mean case-sensitive or influence other options.
    const rfsDir = await this.getOrCreateDirectory(dirName, isPrivate);
    return rfsDir.getNativeHandle();
  }

  async deleteDirectory(dirName: string, recursive: boolean = false): Promise<void> {
    // resolveEntryName is for files/dirs, fixEntryCase might be better if we know it's a dir
    const resolvedName = await this.fixEntryCase(dirName); 
    if (resolvedName) { // If fixEntryCase didn't find it, it returns original, so check if it *really* exists.
        // We need to be sure it's a directory handle before calling removeEntry,
        // or ensure removeEntry handles file vs dir.
        // For safety, one might try to get a directory handle first.
        // However, FileSystemDirectoryHandle.removeEntry is supposed to remove child entries.
      try {
        await this.handle.removeEntry(resolvedName, { recursive });
      } catch (e: any) {
        if (e.name === "QuotaExceededError" || (e instanceof DOMException && e.message.toLowerCase().includes("quota"))) {
          throw new StorageQuotaError(undefined, e);
        }
        // DOMException: InvalidModificationError if not empty and recursive is false
        if (e.name === "InvalidModificationError" && !recursive) {
          throw new IOError("Can't delete non-empty directory when recursive = false", e);
        }
         if (e.name === "NotFoundError") { // If the entry to delete is not found
          // This might be acceptable depending on desired behavior (idempotency)
          // Original code didn't explicitly handle this case for deleteDirectory.
          // For now, let's re-throw as FileNotFoundError.
          throw new FileNotFoundError(`Directory \"${resolvedName}\" not found for deletion.`, e);
        }
        if (e instanceof TypeError && e.message.includes("not allowed")) {
          throw new NameNotAllowedError(`Directory name \"${resolvedName}\" is not allowed for deletion`, e);
        }
        if (e instanceof DOMException) {
          throw new IOError(`Directory \"${resolvedName}\" could not be deleted (${e.name})`, e);
        }
        throw e;
      }
    } else {
        throw new FileNotFoundError(`Directory \"${dirName}\" not found for deletion (case-insensitive check failed).`);
    }
  }
} 