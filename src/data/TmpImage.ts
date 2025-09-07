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
    this.tileData = stream.mapUint8Array(mainTileDataByteLength);

    this.hasZData = (this.flags & TmpImageFlags.ZData) === TmpImageFlags.ZData;
    if (this.hasZData) {
      // Z-data for main tile data, same byte length as mainTileDataByteLength
      this.zData = stream.mapUint8Array(mainTileDataByteLength);
    }

    this.hasExtraData = (this.flags & TmpImageFlags.ExtraData) === TmpImageFlags.ExtraData;
    if (this.hasExtraData) {
      const extraDataByteLength = Math.abs(this.extraWidth * this.extraHeight); // 1 byte per cell
      // Read the extraData block itself (mirror original logic)
      this.extraData = stream.mapUint8Array(extraDataByteLength);

      // Original: if ZData & ExtraData present and dataBlockSize within stream, advance by extraDataByteLength again
      if (
        this.hasZData &&
        this.hasExtraData &&
        this.dataBlockSize > 0 &&
        this.dataBlockSize < stream.byteLength
      ) {
        stream.seek(stream.position + extraDataByteLength);
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