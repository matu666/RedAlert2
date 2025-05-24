import { TmpImage } from "./TmpImage";
import { VirtualFile } from "./vfs/VirtualFile";
import { DataStream } from "./DataStream"; // Changed to direct import

export class TmpFile {
  public images: TmpImage[] = [];
  public width: number = 0;      // Number of tiles wide
  public height: number = 0;     // Number of tiles high
  public blockWidth: number = 0; // Width of each tile block in cells (e.g., 32 for RA2 TMP)
  public blockHeight: number = 0;// Height of each tile block in cells (e.g., 32 for RA2 TMP)

  constructor(file?: VirtualFile) {
    if (file instanceof VirtualFile) {
      this.fromVirtualFile(file);
    }
  }

  private fromVirtualFile(file: VirtualFile): void {
    const stream = file.stream as DataStream;

    this.width = stream.readInt32();
    this.height = stream.readInt32();
    this.blockWidth = stream.readInt32();  // Also known as TileWidth
    this.blockHeight = stream.readInt32(); // Also known as TileHeight

    const numberOfTiles = this.width * this.height;
    if (numberOfTiles <= 0) return; // No tiles to read

    // Read the offset table for all images/tiles
    // Each offset is a 4-byte integer.
    const imageOffsets: number[] = [];
    for (let i = 0; i < numberOfTiles; i++) {
      imageOffsets.push(stream.readUint32()); // Offsets are typically Uint32
    }

    this.images = [];
    for (let i = 0; i < numberOfTiles; i++) {
      const offset = imageOffsets[i];
      if (offset === 0 || offset >= stream.byteLength) { 
          console.warn(`TmpFile: Tile index ${i} has offset ${offset}, which is invalid or points to EOF. Creating empty TmpImage placeholder.`);
          // Create a dummy stream for TmpImage constructor if it requires a stream.
          // Ensure TmpImage constructor can handle an empty/minimal stream.
          const dummyStream = new DataStream(0); 
          this.images.push(new TmpImage(dummyStream, this.blockWidth, this.blockHeight));
          continue; 
      }
      
      stream.seek(offset);
      // The TmpImage constructor reads data for one tile block
      const image = new TmpImage(stream, this.blockWidth, this.blockHeight);
      this.images.push(image);
    }
  }
  
  // Method to get a specific tile image, e.g., by its x,y tile coordinates
  public getTile(tileX: number, tileY: number): TmpImage | undefined {
      if (tileX < 0 || tileX >= this.width || tileY < 0 || tileY >= this.height) {
          return undefined; // Out of bounds
      }
      const index = tileY * this.width + tileX;
      return this.images[index]; // This might be undefined if an offset was bad during loading
  }
}
