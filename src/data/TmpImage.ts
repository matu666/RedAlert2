import type { DataStream } from "./DataStream";

// Placeholder for a Color class, assuming THREE.Color or similar might be used eventually.
class LocalColorImpl {
    constructor(public r: number = 0, public g: number = 0, public b: number = 0) {}
}
declare let THREE: { Color: typeof LocalColorImpl } | undefined;
const ColorImplToShow = typeof THREE !== 'undefined' ? THREE.Color : LocalColorImpl;

export enum TmpImageFlags {
  ExtraData = 1,
  ZData = 2,
  DamagedData = 4,
}

// Helper to convert signed byte to unsigned byte range (0-255)
const signedByteToUnsigned = (signedByte: number): number => {
  return signedByte < 0 ? signedByte + 256 : signedByte;
};

export class TmpImage {
  public x: number = 0;
  public y: number = 0;
  // Skipped: width and height from header (unused in original constructor logic for this.width/height)
  // private unknown1: number = 0; // from e.readInt32()
  // private unknown2: number = 0; // from e.readInt32()
  private dataBlockSize: number = 0; // 'r' in original, size of the z-buffer for extra data

  public extraX: number = 0;
  public extraY: number = 0;
  public extraWidth: number = 0;
  public extraHeight: number = 0;
  
  private flags: number = 0; // 's' in original

  public height: number = 0; // This is actually tile height (number of cells high), not pixel height
  public terrainType: number = 0;
  public rampType: number = 0;
  public radarLeft: InstanceType<typeof ColorImplToShow> = new ColorImplToShow();
  public radarRight: InstanceType<typeof ColorImplToShow> = new ColorImplToShow();
  // Skipped 3 bytes

  public tileData: Uint8Array = new Uint8Array(0); // Each byte is 2 cells (4 bits per cell)
  public zData?: Uint8Array; // Optional Z-buffer data for main tileData
  public extraData?: Uint8Array; // Optional extra tile data

  public hasZData: boolean = false;
  public hasExtraData: boolean = false;

  constructor(stream: DataStream, tileWidthCells: number, tileHeightCells: number) {
    this.fromStream(stream, tileWidthCells, tileHeightCells);
  }

  private fromStream(stream: DataStream, tileWidthCells: number, tileHeightCells: number): void {
    this.x = stream.readInt32();
    this.y = stream.readInt32();
    /* const headerWidth = */ stream.readInt32();  // Often same as tileWidthCells
    /* const headerHeight = */ stream.readInt32(); // Often same as tileHeightCells
    this.dataBlockSize = stream.readInt32(); // 'r' - size of z-buffer for extra data, if present

    this.extraX = stream.readInt32();
    this.extraY = stream.readInt32();
    this.extraWidth = stream.readInt32();
    this.extraHeight = stream.readInt32();
    
    this.flags = stream.readUint32(); // 's' - bitmask of TmpImageFlags

    this.height = stream.readUint8(); // Number of cells high for this specific tile piece
    this.terrainType = stream.readUint8();
    this.rampType = stream.readUint8();

    this.radarLeft = this.readRadarRgbInternal(
      stream.readInt8(),
      stream.readInt8(),
      stream.readInt8()
    );
    this.radarRight = this.readRadarRgbInternal(
      stream.readInt8(),
      stream.readInt8(),
      stream.readInt8()
    );
    stream.seek(stream.position + 3); // Skip 3 reserved bytes

    // Main tile data: (width * height) cells, 2 cells per byte (4 bits per cell)
    const mainTileDataByteLength = (tileWidthCells * tileHeightCells) / 2;

    // Ensure we don't try to read past EOF – malformed offsets sometimes point near EOF and
    // would cause RangeError.  If the requested data length exceeds the remaining bytes,
    // we treat this tile as empty/placeholder (just filled with zeros) and advance the
    // stream to the end to stay in sync with original logic (which would have crashed).
    if (stream.position + mainTileDataByteLength > stream.byteLength) {
      console.warn(
        `TmpImage: mainTileData (${mainTileDataByteLength} bytes) exceeds remaining buffer ` +
        `(${stream.byteLength - stream.position}). Using zero-filled placeholder.`
      );
      this.tileData = new Uint8Array(mainTileDataByteLength); // zeros
      stream.seek(stream.byteLength); // move to EOF to keep subsequent offsets reproducible
      this.hasZData = false;
      this.hasExtraData = false;
      return;
    }

    this.tileData = stream.mapUint8Array(mainTileDataByteLength);

    this.hasZData = (this.flags & TmpImageFlags.ZData) === TmpImageFlags.ZData;
    if (this.hasZData) {
      // Z-data for main tile data, same byte length as mainTileDataByteLength
      // Guard against malformed offsets that would read past EOF.
      if (stream.position + mainTileDataByteLength > stream.byteLength) {
        console.warn(
          `TmpImage: ZData (${mainTileDataByteLength} bytes) exceeds remaining buffer ` +
          `(${stream.byteLength - stream.position}). Skipping ZData.`
        );
        // Mark as missing but keep flag so logic stays consistent with original behaviour.
        this.zData = undefined;
        // Move to EOF to stay in sync with original crash behaviour
        stream.seek(stream.byteLength);
      } else {
        this.zData = stream.mapUint8Array(mainTileDataByteLength);
      }
    }

    this.hasExtraData = (this.flags & TmpImageFlags.ExtraData) === TmpImageFlags.ExtraData;
    if (this.hasExtraData) {
      const extraDataByteLength = Math.abs(this.extraWidth * this.extraHeight); // 1 byte per cell

      // Ensure extraData block is within bounds.
      if (stream.position + extraDataByteLength > stream.byteLength) {
        console.warn(
          `TmpImage: extraData (${extraDataByteLength} bytes) exceeds remaining buffer ` +
          `(${stream.byteLength - stream.position}). Skipping extraData.`
        );
        this.extraData = undefined;
        stream.seek(stream.byteLength);
      } else {
        // Read the extraData block itself
        this.extraData = stream.mapUint8Array(extraDataByteLength);
      }

      // In original implementation: if ZData & ExtraData are present and `r` (dataBlockSize)
      // is a positive value *within* the stream, then advance by extraDataByteLength bytes.
      if (
        this.hasZData &&
        this.hasExtraData &&
        this.dataBlockSize > 0 &&
        this.dataBlockSize < stream.byteLength
      ) {
        // Advance safely without overrunning.
        stream.seek(Math.min(stream.position + extraDataByteLength, stream.byteLength));
      }
    }
  }

  private readRadarRgbInternal(r: number, g: number, b: number): InstanceType<typeof ColorImplToShow> {
    return new ColorImplToShow(
      signedByteToUnsigned(r) / 255,
      signedByteToUnsigned(g) / 255,
      signedByteToUnsigned(b) / 255
    );
  }
} 