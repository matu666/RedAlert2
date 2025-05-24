import { Section } from './hva/Section'; // Assuming Section will be in data/hva/
import type { VirtualFile } from './vfs/VirtualFile';
import type { DataStream } from './DataStream';
import { Matrix4 } from 'three'; // Added for THREE.Matrix4

export class HvaFile {
  public filename?: string;
  public sections: Section[] = [];

  constructor(source: VirtualFile | DataStream) {
    // It seems the original constructor only accepted VirtualFile.
    // Adapting to potentially accept DataStream directly if VirtualFile wraps it.
    if (typeof (source as VirtualFile).filename === 'string' && typeof (source as VirtualFile).stream === 'object') {
      this.fromVirtualFile(source as VirtualFile);
    } else if (typeof (source as DataStream).readInt32 === 'function') {
      // Looks like a DataStream
      this.parseHvaData(source as DataStream, (source as any).filename || 'unknown.hva');
    } else {
      throw new Error('Unsupported source type for HvaFile');
    }
  }

  private fromVirtualFile(file: VirtualFile): void {
    this.filename = file.filename;
    // Assuming VirtualFile.stream is a DataStream or compatible
    this.parseHvaData(file.stream as DataStream, file.filename);
  }

  private parseHvaData(stream: DataStream, filename: string): void {
    this.filename = filename;
    this.sections = [];
    stream.readCString(16); // Header, typically "HVATOOLSফো佄 மத்திய"
    const numFrames = stream.readInt32();
    const numSections = stream.readInt32();

    for (let i = 0; i < numSections; ++i) {
      const section = new Section();
      section.name = stream.readCString(16);
      section.matrices = new Array(numFrames);
      this.sections.push(section);
    }

    for (let frameIndex = 0; frameIndex < numFrames; ++frameIndex) {
      for (let sectionIndex = 0; sectionIndex < numSections; ++sectionIndex) {
        this.sections[sectionIndex].matrices[frameIndex] = this.readMatrix(stream);
      }
    }
  }

  private readMatrix(stream: DataStream): Matrix4 {
    const matrixElements: number[] = [];
    for (let i = 0; i < 3; ++i) {
      matrixElements.push(
        stream.readFloat32(),
        stream.readFloat32(),
        stream.readFloat32(),
        stream.readFloat32(),
      );
    }
    // HVA files store 3x4 matrices, THREE.Matrix4 is 4x4.
    // The last row is implicitly [0, 0, 0, 1] for affine transformations.
    matrixElements.push(0, 0, 0, 1);
    
    // THREE.Matrix4().fromArray() expects column-major order by default.
    // HVA data is likely row-major for each 3x4 part. Then it transposes.
    // Original code: new THREE.Matrix4().fromArray(t).transpose()
    // This implies 't' was row-major, fromArray filled it, then transpose made it effectively what THREE expects.
    // If readFloat32 reads them in sequence as m00, m01, m02, m03, m10, m11, m12, m13, ...
    // then fromArray would fill it like:
    // m00 m10 m20 0
    // m01 m11 m21 0
    // m02 m12 m22 0
    // m03 m13 m23 1
    // Transposing this gives the row-major matrix back.
    const matrix = new Matrix4();
    matrix.fromArray(matrixElements); // Fills in column-major
    matrix.transpose(); // Transpose to get the matrix as it's effectively stored/used
    return matrix;
  }
}
