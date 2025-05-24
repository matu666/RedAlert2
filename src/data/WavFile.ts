import { WaveFile } from 'wavefile';
import type { VirtualFile } from './vfs/VirtualFile';
import type { DataStream } from './DataStream';

export class WavFile {
  private rawData?: Uint8Array;
  private decodedData?: Uint8Array; // wavefile's toBuffer() returns Uint8Array

  constructor(source: VirtualFile | DataStream | Uint8Array) {
    if (source instanceof Uint8Array) {
      this.fromRawData(source);
    } else if ('stream' in source && 'getBytes' in source) { // Heuristic for VirtualFile-like or DataStream from our project
        // Assuming VirtualFile from project has getBytes() or similar, or is DataStream itself.
        // Original VirtualFile had a DataStream named 'stream'.
        this.fromVirtualFileOrDataStream(source as VirtualFile | DataStream);
    } else {
        console.warn("WavFile constructor: Unknown source type", source);
        // throw new Error("Unsupported source type for WavFile");
    }
  }

  private fromRawData(data: Uint8Array): this {
    this.rawData = data;
    return this;
  }

  private fromVirtualFileOrDataStream(file: VirtualFile | DataStream): this {
    // Assuming VirtualFile has getBytes or DataStream is passed directly
    if (typeof (file as any).getBytes === 'function') {
        this.rawData = (file as VirtualFile).getBytes();
    } else if (file instanceof Uint8Array) { // Direct DataStream which might be Uint8Array
        this.rawData = file;
    } else if ((file as DataStream).buffer && (file as DataStream).byteOffset !== undefined && (file as DataStream).byteLength !== undefined) {
        // Handling object that looks like a DataStream (e.g. from VirtualFile.stream)
        const ds = file as DataStream;
        this.rawData = new Uint8Array(ds.buffer, ds.byteOffset, ds.byteLength);
    } else {
        throw new Error('Cannot get Uint8Array from VirtualFile/DataStream for WavFile');
    }
    return this;
  }

  getRawData(): Uint8Array | undefined {
    return this.rawData;
  }

  getData(): Uint8Array {
    if (!this.decodedData) {
      if (!this.rawData) {
        throw new Error("WavFile: No data loaded to decode.");
      }
      this.decodedData = this.decodeData(this.rawData);
      this.rawData = undefined; // Clear raw data after decoding
    }
    return this.decodedData;
  }

  setData(decodedData: Uint8Array): void {
    this.rawData = undefined;
    this.decodedData = decodedData;
  }

  private decodeData(data: Uint8Array): Uint8Array {
    const wav = new WaveFile();
    wav.fromBuffer(data); // Use fromBuffer instead of passing to constructor directly for clarity

    // Original: "4" === t.bitDepth && t.fromIMAADPCM(), t.toBuffer();
    // This means if bitDepth is "4" (as string), it implies IMA ADPCM, so decode it.
    if (wav.bitDepth === '4') {
      wav.fromIMAADPCM();
    }
    return wav.toBuffer();
  }

  isRawImaAdpcm(): boolean {
    if (!this.rawData) return false;
    const wav = new WaveFile();
    wav.fromBuffer(this.rawData);
    return wav.bitDepth === '4';
  }
} 