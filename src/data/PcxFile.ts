import PcxJs from 'pcx-js'; // Assuming default export from pcx-js
import { CanvasUtils } from '../engine/gfx/CanvasUtils';
import type { VirtualFile } from './vfs/VirtualFile';
import { DataStream } from './DataStream';

export class PcxFile {
  public width: number;
  public height: number;
  public data: Uint8Array; // RGBA data
  private fileSource: VirtualFile | DataStream; // Store original source for potential re-processing or debugging

  constructor(source: VirtualFile | DataStream) {
    this.fileSource = source;
    let dataViewProvider: { buffer: ArrayBuffer, byteOffset: number, byteLength: number };

    if ('stream' in source && source.stream instanceof DataStream) {
        // Assuming VirtualFile with a DataStream-like stream property
        const stream = source.stream;
        dataViewProvider = stream; // DataStream itself should have buffer, byteOffset, byteLength
    } else if (source instanceof DataStream) {
        // Direct DataStream input
        dataViewProvider = source;
    } else {
        throw new Error("PcxFile constructor: Unsupported source type.");
    }
    
    // pcx-js expects a Uint8Array view of the exact PCX data
    const pcxData = new Uint8Array(dataViewProvider.buffer, dataViewProvider.byteOffset, dataViewProvider.byteLength);
    const pcxParser = new PcxJs(pcxData);
    const decoded = pcxParser.decode(); // Decodes to { width, height, pixelArray (RGBA) }
    
    if (!decoded || !decoded.pixelArray) {
        throw new Error("Failed to decode PCX data.");
    }

    this.width = decoded.width;
    this.height = decoded.height;
    this.data = decoded.pixelArray; // This is already RGBA from pcx-js
    this.fixAlpha(this.data); 
  }

  // Static factory method to align with how it was used in GameRes.ts (vfs.openFileTyped)
  static fromVirtualFile(vf: VirtualFile): PcxFile {
    return new PcxFile(vf);
  }

  async toPngBlob(): Promise<Blob | null> { // CanvasUtils.canvasToBlob can return null
    const canvas = this.toCanvas();
    return await CanvasUtils.canvasToBlob(canvas);
  }

  toDataUrl(): string {
    return this.toCanvas().toDataURL();
  }

  toCanvas(): HTMLCanvasElement {
    return CanvasUtils.canvasFromRgbaImageData(
      this.data, // This is Uint8ClampedArray or Uint8Array of RGBA pixels
      this.width,
      this.height,
    );
  }

  /**
   * Fixes alpha channel for a specific magenta color (R:255, G:0, B:255) to make it transparent.
   * This is a common convention in old game graphics for transparency.
   * @param rgbaPixelArray The RGBA pixel data (Uint8Array or Uint8ClampedArray).
   */
  private fixAlpha(rgbaPixelArray: Uint8Array | Uint8ClampedArray): void {
    for (let i = 0; i < rgbaPixelArray.length; i += 4) {
      if (
        rgbaPixelArray[i] === 255 &&     // R
        rgbaPixelArray[i + 1] === 0 &&   // G
        rgbaPixelArray[i + 2] === 255    // B
      ) {
        rgbaPixelArray[i + 3] = 0;       // Alpha = 0 (transparent)
      }
    }
  }
} 