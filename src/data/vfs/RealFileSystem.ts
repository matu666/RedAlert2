import { FileNotFoundError } from "./FileNotFoundError";
import { RealFileSystemDir } from "./RealFileSystemDir";
import type { VirtualFile } from "./VirtualFile";

// Placeholder for FileSystemDirectoryHandle if not globally available in the TS environment
// This should ideally be provided by including "DOM" (and potentially "DOM.Iterable") in tsconfig.json libs
// type FileSystemDirectoryHandle = any; 

export interface RFSConstructorOptions {
    // Potentially add options like default case sensitivity here if needed
}

export class RealFileSystem {
  private directories: RealFileSystemDir[];
  private rootDirectory: RealFileSystemDir | undefined;
  private rootDirectoryHandle: FileSystemDirectoryHandle | undefined;

  constructor(options?: RFSConstructorOptions) {
    this.directories = [];
    // options could be used to set initial properties, e.g.
    // this.caseSensitive = options?.caseSensitive ?? false;
  }

  addRootDirectoryHandle(handle: FileSystemDirectoryHandle): RealFileSystemDir {
    // Assuming the root directory added this way should also be generally searchable
    this.rootDirectoryHandle = handle;
    const newDir = new RealFileSystemDir(handle); // Uses default caseSensitivity of RealFileSystemDir
    this.directories.push(newDir);
    this.rootDirectory = newDir;
    return newDir;
  }

  getRootDirectoryHandle(): FileSystemDirectoryHandle | undefined {
    return this.rootDirectoryHandle;
  }

  addDirectoryHandle(handle: FileSystemDirectoryHandle): RealFileSystemDir {
    const newDir = new RealFileSystemDir(handle);
    this.directories.push(newDir);
    return newDir;
  }

  addDirectory(dir: RealFileSystemDir): void {
    if (!this.directories.includes(dir)) {
        this.directories.push(dir);
    }
  }

  async getDirectory(path: string): Promise<RealFileSystemDir> {
    // This simplified version assumes path is a top-level directory name managed by one of the RFS dirs.
    // The original `findDirectory` was more complex, potentially searching within directory handles.
    // For a direct child, this might be sufficient.
    for (const dir of this.directories) {
        // If the dir itself matches the name (for root-level named directories in this.directories)
        if (dir.name === path) return dir;
        // Or if the dir contains an entry with that name (for subdirectories)
        try {
            // Attempt to get it as a subdirectory from one of the known roots
            return await dir.getDirectory(path);
        } catch (e) {
            if (!(e instanceof FileNotFoundError)) {
                // console.warn(`Error checking directory ${dir.name} for subdirectory ${path}:`, e);
            }
            // Continue to check other root directories
        }
    }
    throw new Error(`Directory "${path}" not found in real file system`);
  }

  // The original findDirectory was: 
  // async findDirectory(e) { for (const t of this.directories) if (await t.containsEntry(e)) return await t.getDirectory(e); }
  // This implies it would iterate through all registered directories and check if they contain an *entry* (file or dir)
  // named 'e', and if so, try to get it as a directory. This could be ambiguous if 'e' is a file.
  // The revised getDirectory above tries to be a bit more explicit.

  async findDirectory(directoryName: string): Promise<RealFileSystemDir | undefined> {
    for (const dir of this.directories) {
      if (await dir.containsEntry(directoryName)) {
        try {
          return await dir.getDirectory(directoryName);
        } catch (e) {
          // If entry exists but can't be accessed as directory, continue searching
          continue;
        }
      }
    }
    return undefined; // Return undefined if not found (matches Engine.ts optional chaining usage)
  }

  getRootDirectory(): RealFileSystemDir | undefined {
    return this.rootDirectory;
  }

  async containsEntry(entryName: string): Promise<boolean> {
    for (const dir of this.directories) {
      if (await dir.containsEntry(entryName)) {
        return true;
      }
    }
    return false;
  }

  async openFile(filename: string, skipCaseFix: boolean = false): Promise<VirtualFile> {
    for (const dir of this.directories) {
      try {
        // Attempt to open the file from this directory
        return await dir.openFile(filename, skipCaseFix);
      } catch (e) {
        if (!(e instanceof FileNotFoundError)) {
          // If it's not a FileNotFoundError, it's an unexpected error, so re-throw
          throw e; 
        }
        // If it is FileNotFoundError, suppress it and try the next directory
      }
    }
    // If loop completes, file was not found in any directory
    throw new FileNotFoundError(
      `File "${filename}" not found in any registered real file system directories.`,
    );
  }

  async getRawFile(filename: string): Promise<File> {
    for (const dir of this.directories) {
        try {
            return await dir.getRawFile(filename);
        } catch (e) {
            if (!(e instanceof FileNotFoundError)) throw e;
        }
    }
    throw new FileNotFoundError(`File "${filename}" not found in real file system (getRawFile)`);
  }

  async *getEntries(): AsyncGenerator<string, void, undefined> {
    for (const dir of this.directories) {
      for await (const entryName of dir.getEntries()) {
        yield entryName;
      }
    }
  }
} 