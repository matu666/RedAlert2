import { VirtualFile } from "./vfs/VirtualFile";
import { Section, PlainSection } from "./vxl/Section";
import { VxlHeader } from "./vxl/VxlHeader";
import type { DataStream } from "./DataStream";
import type { Voxel } from "./vxl/Voxel";
import type { Span } from "./vxl/Span";
import { Vector3, Matrix4 } from "three";

interface SectionTailerInfo {
    startingSpanOffset: number;
    endingSpanOffset: number;
    dataSpanOffset: number; // This seems to be an offset *within* the span data for that section, not global.
}

export interface PlainVxlFile {
    sections: PlainSection[];
    voxelCount: number;
    filename?: string;
}

export class VxlFile {
  public sections: Section[] = [];
  public voxelCount: number = 0;
  public filename?: string;

  constructor(file?: VirtualFile) {
    if (file instanceof VirtualFile) {
      this.fromVirtualFile(file);
    }
  }

  private fromVirtualFile(file: VirtualFile): void {
    this.filename = file.filename;
    const stream = file.stream as DataStream;

    if (stream.byteLength < VxlHeader.size) return;

    const header = new VxlHeader();
    header.read(stream); // Reads header and skips embedded palette

    if (!header.headerCount || !header.tailerCount || header.tailerCount !== header.headerCount) {
      console.warn(`VXL ${this.filename}: Invalid header counts (header: ${header.headerCount}, tailer: ${header.tailerCount}).`);
      return;
    }

    // Read all section headers (names)
    for (let i = 0; i < header.headerCount; ++i) {
      const section = new Section();
      this.readSectionHeader(section, stream); // Reads name and skips 3 uint32
      if (this.sections.find((s) => s.name === section.name)) {
        console.warn(`Duplicate section name "${section.name}" found in VXL "${this.filename}".`);
      }
      this.sections.push(section);
    }

    const bodyStartOffset = stream.position; // Position after all section name reads
    stream.seek(bodyStartOffset + header.bodySize); // Seek to the start of tailer data

    const tailerInfos: SectionTailerInfo[] = [];
    for (let i = 0; i < header.tailerCount; ++i) {
      // Associate tailer with the correct section. Order is assumed to be the same.
      tailerInfos[i] = this.readSectionTailer(this.sections[i], stream);
    }

    let totalVoxelsRead = 0;
    // Now read body data for each section
    stream.seek(bodyStartOffset); // Reset to start of body data

    for (let i = 0; i < header.headerCount; ++i) {
      const section = this.sections[i];
      const sectionTailerInfo = tailerInfos[i];
      // The original code had a cumulative offset logic. Let's try to make it per-section.
      // `t.dataSpanOffset` seems to be an offset within the section's span data block, not a global body offset.
      // The VXL format typically has [span_start_offsets][span_end_offsets][span_data_blocks]
      // `readSectionBodySpans` expects to be at the start of a given section's span definitions block.
      
      // The structure is complex. Based on common VXL spec (e.g. HVA VXL from Tiberian Sun / RA2):
      // Body = [Section 0 Span Start Offsets][Section 0 Span End Offsets][Section 0 Span Column Data] ... then Section 1 etc.
      // The original code seeks to `bodyStartOffset` (which is after all names), then adds `sectionTailerInfo.dataSpanOffset`
      // before reading spans. This is unusual if `dataSpanOffset` is relative *within* a section's body block.
      // For now, I will closely follow the original span reading which has its own seek logic using these offsets.
      // `readSectionBodySpans` will use `stream.position + t.startingSpanOffset` for its first internal seek.
      // It seems `t.startingSpanOffset` is an offset from the *current* stream position (start of this section's body data).
      
      const voxelCountForSection = this.readSectionBodySpans(section, sectionTailerInfo, stream);
      totalVoxelsRead += voxelCountForSection;
    }
    this.voxelCount = totalVoxelsRead;
  }

  private readSectionHeader(section: Section, stream: DataStream): void {
    section.name = stream.readCString(16);
    stream.skip(4); // Skip SectionDataLength (uint32) - not used directly by original parsing here
    stream.skip(4); // Skip SpanStartTableOffset (uint32)
    stream.skip(4); // Skip SpanEndTableOffset (uint32)
    // Total 16 + 12 = 28 bytes for this header part per section in some VXL versions.
    // Original code just read name then 3 uint32s. Assuming they were these offsets.
  }

  private readSectionTailer(section: Section, stream: DataStream): SectionTailerInfo {
    const startingSpanOffset = stream.readUint32(); // Relative to start of Section Body Data Block
    const endingSpanOffset = stream.readUint32();   // Relative to start of Section Body Data Block
    const dataSpanOffset = stream.readUint32();     // Relative to start of Section Body Data Block

    section.hvaMultiplier = stream.readFloat32();
    section.transfMatrix = this.readTransfMatrix(stream);
    section.minBounds = new Vector3(
      stream.readFloat32(),
      stream.readFloat32(),
      stream.readFloat32()
    );
    section.maxBounds = new Vector3(
      stream.readFloat32(),
      stream.readFloat32(),
      stream.readFloat32()
    );
    section.sizeX = stream.readUint8();
    section.sizeY = stream.readUint8();
    section.sizeZ = stream.readUint8();
    section.normalsMode = stream.readUint8();

    return {
      startingSpanOffset, 
      endingSpanOffset,
      dataSpanOffset, 
    };
  }

  private readTransfMatrix(stream: DataStream): Matrix4 {
    const elements: number[] = [];
    for (let i = 0; i < 12; ++i) { // Reads 3x4 part of matrix (rotation + translation)
      elements.push(stream.readFloat32());
    }
    // Standard homogeneous matrix form: last row is 0,0,0,1
    // Original code then transposes it. THREE.Matrix4.fromArray expects column-major.
    // If these 12 values are row-major [m11,m12,m13,m14, m21,m22,m23,m24, m31,m32,m33,m34]
    // they need to be mapped to column-major for fromArray, or use set().
    // The original code `t.push(0,0,0,1)` and then `fromArray(t).transpose()` is a bit confusing.
    // Let's assume the 12 values are the first 3 rows, then it adds the 4th [0,0,0,1].
    const finalElements = [
        elements[0], elements[4], elements[8],  0, // col 1
        elements[1], elements[5], elements[9],  0, // col 2
        elements[2], elements[6], elements[10], 0, // col 3
        elements[3], elements[7], elements[11], 1  // col 4 (translation)
    ];
    // The original code reads 3x4 floats, then appends [0,0,0,1] to make 16 elements for fromArray,
    // and then calls .transpose(). This implies the 12 floats read are already in column-major order for the 3x4 part.
    // Or, more likely, the 12 floats are row-major, and the fromArray + transpose converts to THREE's internal (column-major).
    // Let's stick to the latter interpretation if it matches THREE.js behavior.
    // If elements = [r1c1, r1c2, r1c3, r1c4, r2c1, ..., r3c4]
    // Then after adding [0,0,0,1] for r4, fromArray(rowMajor).transpose() should yield correct internal.
    const rowMajorWithLastRow = [...elements, 0,0,0,1];
    return new Matrix4().fromArray(rowMajorWithLastRow).transpose();
  }

  private readSectionBodySpans(
    section: Section,
    sectionTailerInfo: SectionTailerInfo,
    stream: DataStream
  ): number {
    // Seek to the start of this section's span definition data, relative to current stream position
    // The current stream position IS ALREADY at start of section's body (after all name reads, before any section body read)
    const initialStreamPos = stream.position;
    
    stream.seek(initialStreamPos + sectionTailerInfo.startingSpanOffset);
    const { sizeX, sizeY, sizeZ } = section;

    const spanStartOffsets: number[][] = new Array(sizeY);
    for (let y = 0; y < sizeY; ++y) {
      spanStartOffsets[y] = new Array(sizeX);
      for (let x = 0; x < sizeX; ++x) {
        spanStartOffsets[y][x] = stream.readInt32();
      }
    }

    // Original code seeks to `initialStreamPos + sectionTailerInfo.endingSpanOffset` here implicitly
    // because it assumes `endingSpanOffset` immediately follows `startingSpanOffset` data block.
    // If VXL format is [start_offsets][end_offsets][data_blocks], this is fine.
    // Let's ensure seek is correct if endingSpanOffset isn't contiguous.
    stream.seek(initialStreamPos + sectionTailerInfo.endingSpanOffset); 
    
    const spanEndOffsets: number[][] = new Array(sizeY);
    for (let y = 0; y < sizeY; ++y) {
      spanEndOffsets[y] = new Array(sizeX);
      for (let x = 0; x < sizeX; ++x) {
        spanEndOffsets[y][x] = stream.readInt32();
      }
    }

    section.spans = [];
    let voxelCountInSection = 0;

    // The actual voxel data starts after the offset tables, at `initialStreamPos + sectionTailerInfo.dataSpanOffset`
    // Each span (column) data is read from there.
    const baseDataOffset = initialStreamPos + sectionTailerInfo.dataSpanOffset;

    for (let y = 0; y < sizeY; ++y) {
      for (let x = 0; x < sizeX; ++x) {
        const start = spanStartOffsets[y][x];
        const end = spanEndOffsets[y][x];
        const voxelsInSpan = this.readSpanVoxels(start, end, x, y, sizeZ, stream, baseDataOffset);
        
        const span: Span = {
          // x: x, // x,y could be implicit from iteration order, or stored if needed
          // y: y,
          voxels: voxelsInSpan,
          startIndex: start, // Or a more meaningful span property from start/end
          endIndex: end
        };
        section.spans.push(span);
        voxelCountInSection += span.voxels.length;
      }
    }
    return voxelCountInSection;
  }

  private readSpanVoxels(
    spanStartIndex: number, // Start index in the column data block
    spanEndIndex: number,   // End index in the column data block
    voxelX: number,
    voxelY: number,
    sectionSizeZ: number, // Max Z height of the section
    stream: DataStream,
    baseDataOffset: number // Base offset for all span data in this section
  ): Voxel[] {
    if (spanStartIndex === -1 || spanEndIndex === -1 || spanStartIndex >= spanEndIndex) {
      return []; // No voxels in this span or invalid/empty span
    }

    // Seek to the start of this specific span's data
    stream.seek(baseDataOffset + spanStartIndex);
    
    const voxels: Voxel[] = [];
    let currentZ = 0;
    const maxBytesToRead = spanEndIndex - spanStartIndex;
    let bytesReadForThisSpan = 0;

    // The loop should terminate either by reaching sectionSizeZ or by consuming span data length.
    while (currentZ < sectionSizeZ && bytesReadForThisSpan < maxBytesToRead) {
      if (stream.isEof() || bytesReadForThisSpan + 1 > maxBytesToRead) break; 
      const skipCount = stream.readUint8();
      bytesReadForThisSpan += 1;
      currentZ += skipCount;

      if (stream.isEof() || bytesReadForThisSpan + 1 > maxBytesToRead) break; 
      const runLength = stream.readUint8();
      bytesReadForThisSpan += 1;

      if (runLength === 0) { // End of column marker in some VXL variants
          // Original code reads one more byte (next skip count) and then breaks.
          // This seems like an end-of-span marker (skip=0, run=0, next_skip=0)
          if (bytesReadForThisSpan < maxBytesToRead && !stream.isEof()) {
             stream.readUint8(); // Read and discard the final skip_count_end_of_column
             bytesReadForThisSpan += 1;
          }
          break; 
      }

      for (let i = 0; i < runLength; ++i) {
        if (currentZ >= sectionSizeZ || stream.isEof() || bytesReadForThisSpan + 2 > maxBytesToRead) break;
        const colorIndex = stream.readUint8();
        const normalIndex = stream.readUint8(); // Or lighting value in some VXLs
        bytesReadForThisSpan += 2;

        voxels.push({
          x: voxelX,
          y: voxelY,
          z: currentZ,
          colorIndex: colorIndex,
          normalIndex: normalIndex,
        });
        currentZ++;
      }
    }
    return voxels;
  }

  fromPlain(plain: PlainVxlFile): this {
    this.filename = plain.filename;
    this.sections = plain.sections.map((s) => new Section().fromPlain(s));
    this.voxelCount = plain.voxelCount;
    return this;
  }

  toPlain(): PlainVxlFile {
    return {
      filename: this.filename,
      sections: this.sections.map((s) => s.toPlain()),
      voxelCount: this.voxelCount,
    };
  }

  getSection(indexOrName: number | string): Section | undefined {
    if (typeof indexOrName === 'number') {
      return this.sections[indexOrName];
    }
    return this.sections.find(s => s.name === indexOrName);
  }
}
