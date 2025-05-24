export enum PixelFormat {
  Rgb = 1,      // Typically 3 bytes per pixel (BPP)
  Rgba = 2,     // Typically 4 BPP
  Indexed = 3,  // Typically 1 BPP (index into a palette)
}

function getBytesPerPixel(format: PixelFormat): number {
  switch (format) {
    case PixelFormat.Indexed:
      return 1;
    case PixelFormat.Rgb:
      return 3;
    case PixelFormat.Rgba:
      return 4;
    default:
      throw new Error("Unsupported pixel format " + format);
  }
}

export class Bitmap {
  public data: Uint8Array;
  public pixelFormat: PixelFormat;
  public width: number;
  public height: number;

  constructor(
    width: number,
    height: number,
    data?: Uint8Array, // Data can be optional, will be created if not provided
    pixelFormat: PixelFormat = PixelFormat.Rgba,
  ) {
    const bytesPerPixel = getBytesPerPixel(pixelFormat);
    this.data = data || new Uint8Array(bytesPerPixel * width * height);
    if (this.data.length < bytesPerPixel * width * height && data) {
        // If provided data is too small, this is an issue.
        // Original code would likely proceed and potentially error out later.
        // For stricter typing, one might throw or reallocate.
        // console.warn("Bitmap constructor: Provided data array is smaller than required by dimensions and pixel format.");
    }
    this.pixelFormat = pixelFormat;
    this.width = width;
    this.height = height;
  }

  /**
   * Draws an indexed image onto this bitmap at the specified coordinates.
   * Assumes this bitmap has enough channels to represent the indexed data (e.g., Rgb or Rgba).
   * For indexed target, it just copies index. For RGB, assumes index becomes (index, 0, 0).
   * For RGBA, assumes (index, 0, 0, 255) if index is non-zero.
   * @param sourceBitmap The source IndexedBitmap.
   * @param x The x-coordinate to start drawing at.
   * @param y The y-coordinate to start drawing at.
   */
  drawIndexedImage(sourceBitmap: IndexedBitmap, x: number, y: number): void {
    const destBpp = getBytesPerPixel(this.pixelFormat);
    const destData = this.data;
    const destStride = this.width * destBpp;
    const destBufferLimit = destData.length; // Use actual buffer length for boundary checks

    let destOffset = y * destStride + x * destBpp;
    let sourceOffset = 0;

    for (let sy = 0; sy < sourceBitmap.height; sy++) {
      let currentDestRowOffset = destOffset;
      for (let sx = 0; sx < sourceBitmap.width; sx++) {
        const sourceIndexValue = sourceBitmap.data[sourceOffset];
        
        // Check if currentDestRowOffset is within bounds before writing
        if (sourceIndexValue !== 0 && currentDestRowOffset >= 0 && (currentDestRowOffset + destBpp -1) < destBufferLimit) {
            destData[currentDestRowOffset] = sourceIndexValue; // R or Index channel
            if (destBpp >= 3) { // RGB or RGBA
                destData[currentDestRowOffset + 1] = 0; // G
                destData[currentDestRowOffset + 2] = 0; // B
            }
            if (destBpp === 4) { // RGBA
                destData[currentDestRowOffset + 3] = 255; // Alpha
            }
        }
        currentDestRowOffset += destBpp;
        sourceOffset++;
      }
      destOffset += destStride; // Move to the next row in destination
    }
  }
}

export class IndexedBitmap extends Bitmap {
  constructor(width: number, height: number, data?: Uint8Array) {
    super(width, height, data, PixelFormat.Indexed);
  }
  // IndexedBitmap specific methods can be added here
}

export class RgbBitmap extends Bitmap {
  constructor(width: number, height: number, data?: Uint8Array) {
    super(width, height, data, PixelFormat.Rgb);
  }
  // RgbBitmap specific methods can be added here
}

export class RgbaBitmap extends Bitmap {
  constructor(width: number, height: number, data?: Uint8Array) {
    super(width, height, data, PixelFormat.Rgba);
  }

  /**
   * Draws an RGBA image onto this RGBA bitmap at the specified coordinates.
   * @param sourceBitmap The source RgbaBitmap.
   * @param x The x-coordinate to start drawing at.
   * @param y The y-coordinate to start drawing at.
   * @param destWidth The width of the area to draw into (optional, defaults to sourceBitmap.width).
   * @param destHeight The height of the area to draw into (optional, defaults to sourceBitmap.height).
   */
  drawRgbaImage(sourceBitmap: RgbaBitmap, x: number, y: number, destWidth?: number, destHeight?: number): void {
    const destData = this.data;
    const destStride = this.width * 4; // 4 bytes per pixel for RGBA
    const destBufferLimit = destData.length;

    const effectiveDestWidth = destWidth ?? sourceBitmap.width;
    const effectiveDestHeight = destHeight ?? sourceBitmap.height;

    let destOffset = y * destStride + x * 4;
    let sourceOffset = 0;

    // Clip drawing to the bounds of both source and destination bitmaps
    const drawHeight = Math.min(effectiveDestHeight, sourceBitmap.height, Math.max(0, this.height - y));
    const drawWidth = Math.min(effectiveDestWidth, sourceBitmap.width, Math.max(0, this.width - x));

    for (let sy = 0; sy < drawHeight; sy++) {
      let currentDestRowOffset = destOffset;
      let currentSourceRowOffset = sourceOffset;
      for (let sx = 0; sx < drawWidth; sx++) {
        if (currentDestRowOffset >= 0 && (currentDestRowOffset + 3) < destBufferLimit) {
          destData[currentDestRowOffset] = sourceBitmap.data[currentSourceRowOffset];         // R
          destData[currentDestRowOffset + 1] = sourceBitmap.data[currentSourceRowOffset + 1]; // G
          destData[currentDestRowOffset + 2] = sourceBitmap.data[currentSourceRowOffset + 2]; // B
          destData[currentDestRowOffset + 3] = sourceBitmap.data[currentSourceRowOffset + 3]; // A
        }
        currentDestRowOffset += 4;
        currentSourceRowOffset += 4;
      }
      destOffset += destStride; // Move to the next row in destination
      sourceOffset += sourceBitmap.width * 4; // Move to the next row in source
    }
  }
} 