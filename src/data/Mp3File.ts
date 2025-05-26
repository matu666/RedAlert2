import type { VirtualFile } from "./vfs/VirtualFile";
import type { DataStream } from "./DataStream";

export class Mp3File {
  private sourceData: VirtualFile | DataStream | Blob; // Store the original source, could be VirtualFile, DataStream, or Blob from RFS
  private fileName: string;

  constructor(source: VirtualFile | DataStream | Blob | File, fileName?: string) {
    this.sourceData = source;
    if (source instanceof File) {
        this.fileName = fileName || source.name || 'unknown.mp3';
    } else if (typeof (source as VirtualFile).filename === 'string') {
        this.fileName = fileName || (source as VirtualFile).filename;
    } else {
        this.fileName = fileName || 'unknown.mp3';
    }
  }

  asFile(): File {
    let blob: Blob;
    if (this.sourceData instanceof Blob) { // Handles File as well, since File extends Blob
      blob = this.sourceData;
    } else if (typeof (this.sourceData as VirtualFile).getBytes === 'function') {
      // Assuming VirtualFile or DataStream with getBytes()
      const bytes = (this.sourceData as VirtualFile).getBytes();
      blob = new Blob([bytes], { type: "audio/mp3" });
    } else if ((this.sourceData as DataStream).buffer) {
      // Assuming a DataStream-like object
      const ds = this.sourceData as DataStream;
      const bytes = new Uint8Array(ds.buffer, ds.byteOffset, ds.byteLength);
      blob = new Blob([bytes], { type: "audio/mp3" });
    }else {
      throw new Error("Mp3File: Cannot convert source data to Blob.");
    }
    
    return new File([blob], this.fileName, {
      type: "audio/mp3",
    });
  }

  // Helper to get the underlying blob if needed, e.g., for creating an Object URL
  getBlob(): Blob {
    if (this.sourceData instanceof Blob) {
        return this.sourceData;
    }
    // Convert other types to Blob
    const file = this.asFile();
    return file;
  }
}
