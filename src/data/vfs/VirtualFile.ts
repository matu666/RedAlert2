import { DataStream } from '../DataStream'; // Adjusted path
import { IOError } from './IOError';

export class VirtualFile {
  public stream: DataStream;
  public filename: string;

  /**
   * Creates a VirtualFile from a browser File object.
   * @param realFile The browser File object.
   * @returns A Promise resolving to a VirtualFile instance.
   * @throws IOError if the file cannot be read.
   */
  public static async fromRealFile(realFile: File): Promise<VirtualFile> {
    try {
      const arrayBuffer = await realFile.arrayBuffer();
      const dataStream = new DataStream(arrayBuffer);
      // Original code did: (e._trimAlloc = () => {}), where e is the DataStream instance.
      // This disables trimming. We can achieve a similar effect by setting dynamicSize to false
      // after construction, or if _trimAlloc was public, we could override it.
      // For now, let's ensure dynamicSize is false for streams from fixed sources.
      dataStream.dynamicSize = false; 
      return new VirtualFile(dataStream, realFile.name);
    } catch (error) {
      if (error instanceof DOMException) {
        throw new IOError(
          `File "${realFile.name}" could not be read (${error.name})`,
          // Pass the original error as cause if supported by target environment or polyfill
          // { cause: error } 
        );
      }
      throw error; // Re-throw other errors
    }
  }

  /**
   * Creates a VirtualFile from an ArrayBuffer and a filename.
   * @param bytes The ArrayBuffer containing the file data.
   * @param filename The name of the file.
   * @returns A VirtualFile instance.
   */
  public static fromBytes(bytes: ArrayBuffer, filename: string): VirtualFile {
    const dataStream = new DataStream(bytes);
    dataStream.dynamicSize = false; // Data is fixed
    return new VirtualFile(dataStream, filename);
  }

  /**
   * Factory method to create a VirtualFile from a portion of a DataView.
   * @param sourceDataView The source DataView.
   * @param filename The name of the file.
   * @param offset The offset within the sourceDataView to start from. Defaults to 0.
   * @param length The length of the segment to use from the sourceDataView. Defaults to the DataView's remaining length from offset.
   * @returns A VirtualFile instance.
   */
  public static factory(
    sourceDataView: DataView,
    filename: string,
    offset: number = 0,
    length?: number
  ): VirtualFile {
    const effectiveLength = length === undefined ? sourceDataView.byteLength - offset : length;
    if (offset < 0 || effectiveLength < 0 || offset + effectiveLength > sourceDataView.byteLength) {
        throw new RangeError("Invalid offset or length for DataView segment.");
    }
    // Create a new DataView that is a slice of the original, if DataStream constructor doesn't handle this well enough.
    // DataStream constructor now takes DataView and an *additional* offset.
    // To use a segment of sourceDataView starting at `offset` with `effectiveLength`:
    // We want DataStream to use sourceDataView.buffer, with a total offset of sourceDataView.byteOffset + offset,
    // and a length of effectiveLength.
    
    // Construct DataStream with the underlying buffer, and specify the precise slice using byteOffset and length for the view.
    const slicedView = new DataView(sourceDataView.buffer, sourceDataView.byteOffset + offset, effectiveLength);
    const dataStream = new DataStream(slicedView); // Pass the view directly
    dataStream.dynamicSize = false;
    return new VirtualFile(dataStream, filename);
  }

  constructor(dataStream: DataStream, filename: string) {
    this.stream = dataStream;
    this.filename = filename;
  }

  /**
   * Reads the entire file content as a string.
   * @param encoding The text encoding to use (e.g., 'utf-8'). Defaults to 'utf-8'.
   * @returns The file content as a string.
   */
  public readAsString(encoding: string = 'utf-8'): string {
    this.stream.seek(0);
    return this.stream.readString(this.stream.byteLength, encoding);
  }

  /**
   * Gets all bytes of the file as a Uint8Array.
   * This returns a view on the internal buffer. For a copy, use .slice().
   * @returns A Uint8Array representing the file content.
   */
  public getBytes(): Uint8Array {
    // DataStream.toUint8Array() returns a view of its effective part.
    return this.stream.toUint8Array();
  }

  /**
   * Gets the size of the file in bytes.
   * @returns The size of the file.
   */
  public getSize(): number {
    return this.stream.byteLength;
  }

  /**
   * Converts the VirtualFile to a browser File object.
   * @param mimeType The MIME type of the file.
   * @returns A browser File object.
   */
  public asFile(mimeType?: string): File {
    // getBytes() should return a Uint8Array representing the actual content.
    // If getBytes() returns a view that might change, a copy is needed: new Uint8Array(this.getBytes())
    return new File([this.getBytes()], this.filename, { type: mimeType });
  }
} 