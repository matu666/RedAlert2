import { VirtualFile } from '@/data/vfs/VirtualFile';
import { Section } from '@/data/vxl/Section';
import { VxlHeader } from '@/data/vxl/VxlHeader';
import * as THREE from 'three';

export class VxlFile {
  constructor(virtualFile) {
    this.voxelCount = 0;
    if (virtualFile instanceof VirtualFile) {
      this.fromVirtualFile(virtualFile);
    }
  }

  fromVirtualFile(virtualFile) {
    this.filename = virtualFile.filename;
    let stream = virtualFile.stream;
    
    this.sections = [];
    
    if (stream.byteLength < VxlHeader.size) {
      return;
    }

    let header = new VxlHeader();
    header.read(stream);
    
    if (!header.headerCount || !header.tailerCount || header.tailerCount !== header.headerCount) {
      return;
    }

    // Read section headers
    for (let i = 0; i < header.headerCount; ++i) {
      const section = new Section();
      this.readSectionHeader(section, stream);
      
      if (this.sections.find(s => s.name === section.name)) {
        console.warn(`Duplicate section name "${section.name}" found in VXL "${this.filename}".`);
      }
      
      this.sections.push(section);
    }

    // Save current position and skip body
    const bodyStartPosition = stream.position;
    stream.seek(stream.position + header.bodySize);

    // Read section tailers
    let tailers = [];
    for (let i = 0; i < header.tailerCount; ++i) {
      tailers[i] = this.readSectionTailer(this.sections[i], stream);
    }

    // Read section body spans
    let totalVoxelCount = 0;
    for (let i = 0; i < header.headerCount; ++i) {
      stream.seek(bodyStartPosition);
      totalVoxelCount += this.readSectionBodySpans(this.sections[i], tailers[i], stream);
    }
    
    this.voxelCount = totalVoxelCount;
  }

  readSectionHeader(section, stream) {
    section.name = stream.readCString(16);
    stream.readUint32(); // Skip 3 uint32 values
    stream.readUint32();
    stream.readUint32();
  }

  readSectionTailer(section, stream) {
    const startingSpanOffset = stream.readUint32();
    const endingSpanOffset = stream.readUint32();
    const dataSpanOffset = stream.readUint32();
    
    section.hvaMultiplier = stream.readFloat32();
    section.transfMatrix = this.readTransfMatrix(stream);
    section.minBounds = new THREE.Vector3(
      stream.readFloat32(),
      stream.readFloat32(),
      stream.readFloat32()
    );
    section.maxBounds = new THREE.Vector3(
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
      dataSpanOffset
    };
  }

  readTransfMatrix(stream) {
    let matrix = [];
    for (let i = 0; i < 3; ++i) {
      matrix.push(
        stream.readFloat32(),
        stream.readFloat32(),
        stream.readFloat32(),
        stream.readFloat32()
      );
    }
    matrix.push(0, 0, 0, 1);
    return new THREE.Matrix4().fromArray(matrix).transpose();
  }

  readSectionBodySpans(section, tailer, stream) {
    stream.seek(stream.position + tailer.startingSpanOffset);
    
    const { sizeX, sizeY, sizeZ } = section;
    
    // Read starting offsets
    let startingOffsets = new Array(sizeY);
    for (let y = 0; y < sizeY; ++y) {
      startingOffsets[y] = new Array(sizeX);
      for (let x = 0; x < sizeX; ++x) {
        startingOffsets[y][x] = stream.readInt32();
      }
    }

    // Read ending offsets
    let endingOffsets = new Array(sizeY);
    for (let y = 0; y < sizeY; ++y) {
      endingOffsets[y] = new Array(sizeX);
      for (let x = 0; x < sizeX; ++x) {
        endingOffsets[y][x] = stream.readInt32();
      }
    }

    // Read spans
    let spans = section.spans = [];
    let voxelCount = 0;
    
    for (let y = 0; y < sizeY; ++y) {
      for (let x = 0; x < sizeX; ++x) {
        const span = {
          x: x,
          y: y,
          voxels: this.readSpanVoxels(
            startingOffsets[y][x],
            endingOffsets[y][x],
            x,
            y,
            sizeZ,
            stream
          )
        };
        spans.push(span);
        voxelCount += span.voxels.length;
      }
    }

    return voxelCount;
  }

  readSpanVoxels(startOffset, endOffset, x, y, sizeZ, stream) {
    if (startOffset === -1 || endOffset === -1) {
      return [];
    }

    let voxels = [];
    
    for (let z = 0; z < sizeZ; ) {
      z += stream.readUint8(); // Skip count
      const voxelCount = stream.readUint8();
      
      for (let i = 0; i < voxelCount; ++i) {
        const voxel = {
          x: x,
          y: y,
          z: z++,
          colorIndex: stream.readUint8(),
          normalIndex: stream.readUint8()
        };
        voxels.push(voxel);
      }
      
      stream.readUint8(); // Skip end count
    }

    return voxels;
  }

  fromPlain(plainObject) {
    this.sections = plainObject.sections.map(sectionData => 
      new Section().fromPlain(sectionData)
    );
    this.voxelCount = plainObject.voxelCount;
    return this;
  }

  toPlain() {
    return {
      sections: this.sections.map(section => section.toPlain()),
      voxelCount: this.voxelCount
    };
  }

  getSection(index) {
    return this.sections[index];
  }
}