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
    // Offsets in TMP files are *signed* 32-bit integers (little-endian).
    // A value of -1 (0xFFFFFFFF) indicates that the tile is not present.
    // Therefore we must read them as **signed** values so that 0xFFFFFFFF
    // becomes -1 instead of 4294967295.
    const imageOffsets: number[] = [];
    for (let i = 0; i < numberOfTiles; i++) {
      imageOffsets.push(stream.readInt32());
    }

    this.images = [];
    for (let i = 0; i < numberOfTiles; i++) {
      let offset = imageOffsets[i];
      // In the original implementation negative offsets are clamped to 0 by DataStream.seek(),
      // resulting in the first tile being duplicated. We replicate that behaviour here: only
      // offsets that are *beyond* the end of the buffer are considered invalid and replaced
      // with a placeholder image.
      if (offset < 0) {
        offset = 0; // clamp negative offsets
      }

      if (offset >= stream.byteLength) { 
          // Move the main stream pointer to EOF to mimic original seek behaviour
          stream.seek(offset); // will clamp to byteLength
          console.warn(`TmpFile: Tile index ${i} has offset ${offset}, which is invalid or points to EOF. Creating empty TmpImage placeholder.`);
          // Instead of passing an empty stream which would cause read attempts to fail,
          // allocate a small zero-filled buffer that is large enough for TmpImage to
          // read its mandatory header fields as well as an empty tile data block.
          // A TMP tile requires at minimum:
          //   * 49 bytes header (see TmpImage.fromStream implementation)
          //   * main tile data           = (blockWidth * blockHeight) / 2 bytes
          // We allocate that size to avoid out-of-bounds reads, even though the
          // resulting image will just contain transparent pixels.
          const minimalHeaderSize = 49;
          const mainTileDataByteLength = (this.blockWidth * this.blockHeight) / 2;
          const dummyBufferSize = minimalHeaderSize + mainTileDataByteLength;
          const dummyStream = new DataStream(dummyBufferSize);
          // Make the dummy stream a fixed-size buffer so TmpImage won't attempt to
          // expand it while reading.
          dummyStream.dynamicSize = false;
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
