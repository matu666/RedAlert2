import type { VirtualFile } from "./VirtualFile";

export class MemArchive {
  private entries: Map<string, VirtualFile>;

  constructor() {
    this.entries = new Map<string, VirtualFile>();
  }

  addFile(file: VirtualFile): void {
    this.entries.set(file.filename, file);
  }

  containsFile(filename: string): boolean {
    return this.entries.has(filename);
  }

  openFile(filename: string): VirtualFile {
    if (!this.containsFile(filename)) {
      // Consider using the custom FileNotFoundError for consistency if available
      // For now, sticking to Error to match original direct JS behavior within this class
      throw new Error(`File "${filename}" not found in MemArchive`);
    }
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return this.entries.get(filename)!;
  }

  // Optional: Method to list all files, if needed later
  listFiles(): string[] {
    return [...this.entries.keys()];
  }

  // Optional: Method to get all files, if needed later
  getAllFiles(): VirtualFile[] {
    return [...this.entries.values()];
  }
} 