import type { Palette } from '../../data/Palette'; // For indexed image data conversion

interface DrawTextOptions {
  color?: string;
  backgroundColor?: string;
  outlineColor?: string;
  outlineWidth?: number;
  fontSize?: number; // Should be specified with units, e.g., "16px" in font property
  fontFamily?: string;
  fontWeight?: string;
  borderColor?: string;
  borderWidth?: number;
  paddingTop?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  paddingRight?: number;
  textAlign?: CanvasTextAlign;
  width?: number; // Explicit width for the text box
  height?: number; // Explicit height for the text box
  autoEnlargeCanvas?: boolean;
}

interface TextRect {
    x: number;
    y: number;
    width: number;
    height: number;
}

export class CanvasUtils {
  static canvasFromRgbImageData(rgbData: Uint8Array | Uint8ClampedArray, width: number, height: number): HTMLCanvasElement {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Couldn't acquire canvas 2d context");
    }
    const imageData = ctx.createImageData(width, height);
    let dataIndex = 0;
    for (let i = 0; i < rgbData.length; i += 3) {
      imageData.data[dataIndex++] = rgbData[i];     // R
      imageData.data[dataIndex++] = rgbData[i + 1]; // G
      imageData.data[dataIndex++] = rgbData[i + 2]; // B
      imageData.data[dataIndex++] = 255;            // Alpha (opaque)
    }
    ctx.putImageData(imageData, 0, 0);
    return canvas;
  }

  static canvasFromRgbaImageData(rgbaData: Uint8Array | Uint8ClampedArray, width: number, height: number): HTMLCanvasElement {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Couldn't acquire canvas 2d context");
    }
    const imageData = ctx.createImageData(width, height);
    // Ensure rgbaData is not smaller than imageData.data. If it is, this will error or produce weird results.
    // For safety, one might copy min(imageData.data.length, rgbaData.length) or ensure lengths match.
    imageData.data.set(rgbaData.slice(0, imageData.data.length)); // Ensure we don't write past buffer, set is efficient.
    ctx.putImageData(imageData, 0, 0);
    return canvas;
  }

  static canvasFromIndexedImageData(indexedData: Uint8Array, width: number, height: number, palette: Palette): HTMLCanvasElement {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Couldn't acquire canvas 2d context");
    }
    const imageData = ctx.createImageData(width, height);
    let dataIdx = 0;
    for (let i = 0; i < indexedData.length; i++) {
      const paletteIndex = indexedData[i];
      const color = palette.getColor(paletteIndex); // Assuming Palette has getColor({r,g,b})
      imageData.data[dataIdx++] = color.r;
      imageData.data[dataIdx++] = color.g;
      imageData.data[dataIdx++] = color.b;
      imageData.data[dataIdx++] = paletteIndex !== 0 ? 255 : 0; // Common: index 0 is transparent
    }
    ctx.putImageData(imageData, 0, 0);
    return canvas;
  }

  static async canvasToBlob(canvas: HTMLCanvasElement, type: string = 'image/png', quality?: number): Promise<Blob | null> {
    return new Promise<Blob | null>((resolve) => {
      try {
        canvas.toBlob(
          (blob) => {
            resolve(blob);
          },
          type,
          quality
        );
      } catch (e) {
        console.error("canvas.toBlob failed:", e);
        // Fallback for browsers/contexts where direct toBlob might fail or not be supported as expected (e.g. OffscreenCanvas in some workers without polyfill)
        console.warn("Failed to convert canvas to blob directly. Falling back to dataURL generation.");
        try {
            const dataUrl = canvas.toDataURL(type, quality);
            resolve(this.dataUrlToBlob(dataUrl));
        } catch (dataUrlError) {
            console.error("Fallback dataURLToBlob also failed:", dataUrlError);
            resolve(null); // If both fail, resolve with null
        }
      }
    });
  }

  static dataUrlToBlob(dataUrl: string): Blob {
    const match = dataUrl.match(/^data:((.*?)(;charset=.*?)?)(;base64)?,/);
    if (!match) throw new Error("Invalid dataURI format");

    const mimeType = match[2] ? match[1] : "text/plain" + (match[3] || ";charset=utf-8");
    const isBase64 = !!match[4];
    const dataString = dataUrl.slice(match[0].length);

    const binaryString = isBase64 ? atob(dataString) : decodeURIComponent(dataString);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return new Blob([bytes], { type: mimeType });
  }

  static drawText(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number = 0,
    y: number = 0,
    options: DrawTextOptions = {},
  ): TextRect {
    const {
      color = "white",
      backgroundColor,
      outlineColor,
      outlineWidth,
      fontSize = 10, // Default font size in pixels if not specified via font property
      fontFamily = "Arial, sans-serif",
      fontWeight = "normal",
      borderColor,
      borderWidth = 0,
      paddingTop = 0,
      paddingBottom = 0,
      paddingLeft = 0,
      paddingRight = 0,
      textAlign = "left",
      width: explicitWidth,
      height: explicitHeight,
      autoEnlargeCanvas = false,
    } = options;

    // Construct font string carefully
    const fontStyle = `${fontWeight} ${fontSize}px ${fontFamily}`;
    ctx.font = fontStyle;

    const textMetrics = ctx.measureText(text);
    // A more robust way to get text height if available, otherwise estimate
    const capAHeightMetrics = ctx.measureText("A"); // Often used for approximate cap height
    const textHeightEstimate = capAHeightMetrics.actualBoundingBoxAscent + capAHeightMetrics.actualBoundingBoxDescent;
    
    const measuredTextWidth = Math.ceil(
        Math.max(
            textMetrics.width, 
            Math.abs(textMetrics.actualBoundingBoxLeft || 0) + Math.abs(textMetrics.actualBoundingBoxRight || 0)
        )
    );

    const boxWidth = explicitWidth ?? (measuredTextWidth + paddingLeft + paddingRight + 2 * borderWidth);
    const boxHeight = explicitHeight ?? (textHeightEstimate + paddingTop + paddingBottom + 2 * borderWidth);
    
    let drawX = x;
    if (textAlign === "right" && explicitWidth === undefined) {
        drawX = ctx.canvas.width - boxWidth - x; // x is treated as right-margin if textAlign=right & no explicit width
    } else if (textAlign === "center" && explicitWidth === undefined) {
        drawX = x - boxWidth / 2; // x is center point
    } 
    // If explicitWidth is given, x remains the left starting point of the box.

    const rect: TextRect = {
        x: drawX,
        y: y,
        width: boxWidth,
        height: boxHeight,
    };

    if (autoEnlargeCanvas) {
        let needsResize = false;
        let newCanvasWidth = ctx.canvas.width;
        let newCanvasHeight = ctx.canvas.height;
        if (rect.x + rect.width > newCanvasWidth) {
            newCanvasWidth = rect.x + rect.width;
            needsResize = true;
        }
        if (rect.y + rect.height > newCanvasHeight) {
            newCanvasHeight = rect.y + rect.height;
            needsResize = true;
        }
        if (needsResize) {
            const currentContent = (ctx.canvas.width > 0 && ctx.canvas.height > 0) ? ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height) : undefined;
            ctx.canvas.width = newCanvasWidth;
            ctx.canvas.height = newCanvasHeight;
            if (currentContent) ctx.putImageData(currentContent, 0, 0);
            ctx.font = fontStyle; // Font needs to be reset after canvas resize
        }
    }

    if (backgroundColor) {
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
    }

    if (borderColor && borderWidth > 0) {
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = borderWidth; // Use actual borderWidth
      // For crisp lines, offset by 0.5 if borderWidth is odd, or adjust coordinates.
      // Simple strokeRect used here for brevity matching original.
      ctx.strokeRect(rect.x + borderWidth / 2, rect.y + borderWidth / 2, rect.width - borderWidth, rect.height - borderWidth);
    }
    
    ctx.fillStyle = color;
    ctx.font = fontStyle; // Re-apply font, as it might be reset by canvas resize or other operations
    ctx.textAlign = textAlign; // Set canvas text align for fillText positioning

    let textDrawX = rect.x + paddingLeft + borderWidth;
    if (textAlign === 'center') {
        textDrawX = rect.x + rect.width / 2;
    } else if (textAlign === 'right') {
        textDrawX = rect.x + rect.width - paddingRight - borderWidth;
    }
    
    // Adjust Y for text baseline. actualBoundingBoxAscent is good for this.
    const textDrawY = rect.y + paddingTop + borderWidth + (textMetrics.actualBoundingBoxAscent || fontSize * 0.8); // Estimate if not available

    if (outlineColor && outlineWidth && outlineWidth > 0) {
      ctx.strokeStyle = outlineColor;
      ctx.lineWidth = outlineWidth * 2; // Original multiplied by 2
      ctx.strokeText(text, textDrawX, textDrawY, explicitWidth ? rect.width - paddingLeft - paddingRight - 2*borderWidth : undefined);
    }
    ctx.fillText(text, textDrawX, textDrawY, explicitWidth ? rect.width - paddingLeft - paddingRight - 2*borderWidth : undefined);

    return rect;
  }
}
