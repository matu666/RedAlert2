import { RgbaBitmap } from '../../../data/Bitmap';
import { Palette } from '../../../data/Palette';

export class PalDrawable {
  private pal: Palette;

  constructor(palette: Palette) {
    this.pal = palette;
  }

  draw(): RgbaBitmap {
    const size = this.pal.size;
    const bitmap = new RgbaBitmap(size, 1);
    
    // 调试：输出调色板前几个颜色
    console.log('[PalDrawable] Drawing palette with size:', size);
    for (let i = 0; i < Math.min(10, size); i++) {
      const color = this.pal.getColor(i);
      console.log(`[PalDrawable] Color ${i}:`, { r: color.r, g: color.g, b: color.b });
    }
    
    let dataIndex = 0;
    for (let i = 0; i < size; i++) {
      const color = this.pal.getColor(i);
      
      // 暂时使用原始颜色值，不应用任何校正
      bitmap.data[dataIndex] = color.r;
      bitmap.data[dataIndex + 1] = color.g;
      bitmap.data[dataIndex + 2] = color.b;
      bitmap.data[dataIndex + 3] = i ? 255 : 0; // First color is transparent
      dataIndex += 4;
    }
    
    return bitmap;
  }
} 