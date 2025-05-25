import type { ShpFile } from '../../data/ShpFile';
import type { Palette } from '../../data/Palette';
import { IndexedBitmap } from '../../data/Bitmap';
import { CanvasUtils } from './CanvasUtils';
// import { RgbaBitmap } from '../../data/Bitmap'; // If needed for internal operations
// import { CanvasUtils } from './CanvasUtils'; // If used for conversion

export class ImageUtils {
  /**
   * Converts an SHP file and a Palette to a PNG Blob.
   * Based on the original project implementation.
   */
  static async convertShpToPng(shpFile: ShpFile, palette: Palette): Promise<Blob> {
    const canvas = this.convertShpToCanvas(shpFile, palette);
    return await CanvasUtils.canvasToBlob(canvas);
  }

  /**
   * Converts an SHP file to an IndexedBitmap.
   * Based on the original implementation.
   */
  static convertShpToBitmap(shpFile: ShpFile, palette: Palette, forceSquare: boolean = false): IndexedBitmap {
    let offsetX = 0;
    let offsetY = 0;
    let finalWidth = shpFile.width;
    let finalHeight = shpFile.height;

    // Make square if requested (for texture atlasing)
    if (finalWidth !== finalHeight && forceSquare) {
      offsetX = finalWidth > finalHeight ? 0 : Math.floor((finalHeight - finalWidth) / 2);
      offsetY = finalWidth > finalHeight ? Math.floor((finalWidth - finalHeight) / 2) : 0;
      finalWidth = finalHeight = Math.max(finalWidth, finalHeight);
    }

    // Create bitmap wide enough for all frames horizontally
    const bitmap = new IndexedBitmap(shpFile.numImages * finalWidth, finalHeight);

    // Draw each SHP frame into the bitmap
    for (let i = 0; i < shpFile.numImages; i++) {
      const image = shpFile.getImage(i);
      const imageBitmap = new IndexedBitmap(image.width, image.height, image.imageData);
      bitmap.drawIndexedImage(imageBitmap, i * finalWidth + image.x + offsetX, image.y + offsetY);
    }

    return bitmap;
  }

  /**
   * Converts an SHP file to a Canvas element.
   * Based on the original implementation.
   */
  static convertShpToCanvas(shpFile: ShpFile, palette: Palette, forceSquare: boolean = false): HTMLCanvasElement {
    const bitmap = this.convertShpToBitmap(shpFile, palette, forceSquare);
    return CanvasUtils.canvasFromIndexedImageData(
      bitmap.data,
      bitmap.width,
      bitmap.height,
      palette
    );
  }

  // Other image utility functions might go here.
} 