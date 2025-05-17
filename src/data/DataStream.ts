// Helper type for static flipArrayEndianness and other methods if needed
type TypedArray =
  | Int8Array
  | Uint8Array
  | Int16Array
  | Uint16Array
  | Int32Array
  | Uint32Array
  | Float32Array
  | Float64Array;

export class DataStream {
  public static LITTLE_ENDIAN: boolean = true;
  public static BIG_ENDIAN: boolean = false;

  private _buffer: ArrayBuffer;
  private _dataView: DataView;
  private _byteOffset: number;
  private _byteLength: number; // Actual used length, can be less than _buffer.byteLength if not trimmed
  private _dynamicSize: boolean;
  
  public position: number;
  public endianness: boolean; // true for little-endian, false for big-endian

  constructor(
    bufferOrSize: ArrayBuffer | DataView | number = 0,
    byteOffset: number = 0,
    endianness: boolean = DataStream.LITTLE_ENDIAN
  ) {
    this.endianness = endianness;
    this.position = 0;
    this._dynamicSize = true;
    this._byteLength = 0;
    this._byteOffset = byteOffset;

    if (bufferOrSize instanceof ArrayBuffer) {
      this._buffer = bufferOrSize;
      // byteOffset in constructor is from the start of this provided buffer
      this._dataView = new DataView(this._buffer, this._byteOffset);
      this._byteLength = this._buffer.byteLength; 
    } else if (bufferOrSize instanceof DataView) {
      // byteOffset in constructor is an *additional* offset from the start of the DataView's underlying ArrayBuffer
      this._byteOffset = bufferOrSize.byteOffset + byteOffset; 
      this._buffer = bufferOrSize.buffer;
      // The new DataView for the stream starts at the combined offset, 
      // and its length is the original DataView's length minus the additional constructor byteOffset.
      this._dataView = new DataView(this._buffer, this._byteOffset, bufferOrSize.byteLength - byteOffset); 
      this._byteLength = this._byteOffset + (bufferOrSize.byteLength - byteOffset);
    } else { // bufferOrSize is a number (initial capacity)
      this._buffer = new ArrayBuffer(bufferOrSize || 0);
      // byteOffset here is from the start of the newly created buffer
      this._dataView = new DataView(this._buffer, this._byteOffset);
      this._byteLength = this._buffer.byteLength; 
    }
  }

  get dynamicSize(): boolean {
    return this._dynamicSize;
  }

  set dynamicSize(value: boolean) {
    if (!value) {
      this._trimAlloc();
    }
    this._dynamicSize = value;
  }

  get byteLength(): number {
    // This is the effective length of the stream segment being managed,
    // relative to the start of the underlying ArrayBuffer if _byteOffset > 0.
    // It represents the total span from _byteOffset to the end of used data.
    // So, the actual number of usable bytes in the stream is (_byteLength - _byteOffset).
    return this._byteLength - this._byteOffset;
  }

  get buffer(): ArrayBuffer {
    this._trimAlloc(); 
    return this._buffer;
  }

  set buffer(newBuffer: ArrayBuffer) {
    this._buffer = newBuffer;
    this._dataView = new DataView(this._buffer, this._byteOffset);
    this._byteLength = this._buffer.byteLength; 
  }

  get byteOffset(): number {
    return this._byteOffset;
  }

  set byteOffset(newOffset: number) {
    this._byteOffset = newOffset;
    this._dataView = new DataView(this._buffer, this._byteOffset);
    // _byteLength is the total span, should not change just by changing offset within the buffer
    // unless the intent is to redefine the stream boundaries, which is complex.
    // Original code set this._byteLength = this._buffer.byteLength here, which might be an oversight
    // if byteOffset was meant to view a sub-segment of an existing logical stream.
    // For now, assume _byteLength means total allocated/used from physical buffer start.
  }

  get dataView(): DataView {
    return this._dataView;
  }

  set dataView(newDataView: DataView) {
    this._byteOffset = newDataView.byteOffset;
    this._buffer = newDataView.buffer;
    this._dataView = new DataView(this._buffer, this._byteOffset); 
    this._byteLength = this._byteOffset + newDataView.byteLength; 
  }

  public bigEndian(): this {
    this.endianness = DataStream.BIG_ENDIAN;
    return this;
  }
  
  public littleEndian(): this {
    this.endianness = DataStream.LITTLE_ENDIAN;
    return this;
  }

  private _realloc(bytesNeededForOperation: number): void {
    const currentStreamPosRelativeToView = this.position;
    const requiredEffectivePos = currentStreamPosRelativeToView + bytesNeededForOperation;
    
    if (!this._dynamicSize) {
      if (requiredEffectivePos > this.byteLength) { // byteLength is (this._byteLength - this._byteOffset)
          throw new Error("DataStream buffer overflow: dynamicSize is false and operation exceeds buffer limit.");
      }
      return; 
    }

    // Total offset from the start of the physical ArrayBuffer to the end of the new data
    const requiredTotalAbsoluteOffset = this._byteOffset + requiredEffectivePos;
    
    if (requiredTotalAbsoluteOffset <= this._buffer.byteLength) {
        // Enough capacity in underlying ArrayBuffer, just update the logical _byteLength if needed
        if (requiredTotalAbsoluteOffset > this._byteLength) {
            this._byteLength = requiredTotalAbsoluteOffset;
        }
        // Re-create dataview to ensure its internal length is updated if _byteLength changed
        // This is important because _dataView.byteLength depends on how it was constructed.
        // The _dataView should span from _byteOffset to (_byteLength - _byteOffset)
        this._dataView = new DataView(this._buffer, this._byteOffset, this._byteLength - this._byteOffset);
        return;
    }

    // Need to reallocate the underlying ArrayBuffer
    let newCapacity = this._buffer.byteLength < 1 ? 1 : this._buffer.byteLength;
    while (requiredTotalAbsoluteOffset > newCapacity) {
      newCapacity *= 2;
    }

    const newBuffer = new ArrayBuffer(newCapacity);
    const oldUint8Array = new Uint8Array(this._buffer, 0, this._byteLength); // Copy only the used part of old buffer
    const newUint8Array = new Uint8Array(newBuffer);
    
    newUint8Array.set(oldUint8Array); 

    this._buffer = newBuffer;
    this._byteLength = requiredTotalAbsoluteOffset; // Update logical length to new required absolute offset
    // Re-create DataView based on the new buffer and existing _byteOffset
    this._dataView = new DataView(this._buffer, this._byteOffset, this._byteLength - this._byteOffset);
  }

  private _trimAlloc(): void {
    // Effective length of data within the stream view
    const effectiveStreamLength = this._byteLength - this._byteOffset;
    // Total capacity of the underlying buffer for the stream view
    const currentViewCapacity = this._dataView.byteLength;

    // If the logical end of data (_byteLength) is already at the physical end of the buffer,
    // or if the dataview itself is already minimal for the data it contains.
    // This logic is tricky. The original was: `this._byteLength !== this._buffer.byteLength`.
    // This means trim if the logical full length isn't the buffer full length.
    if (this._byteLength === this._buffer.byteLength) {
      return; 
    }
    
    // Create a new buffer that holds exactly from physical start (0) up to _byteLength.
    const newBuffer = new ArrayBuffer(this._byteLength); 
    const newUint8Array = new Uint8Array(newBuffer);
    // Copy from old buffer, from its start (0) up to the logical end of data (_byteLength).
    const oldUint8Array = new Uint8Array(this._buffer, 0, this._byteLength); 
    newUint8Array.set(oldUint8Array);
    
    this._buffer = newBuffer;
    // The _byteOffset remains the same relative to the start of this new, trimmed buffer.
    // The DataView now views this new buffer from _byteOffset, for a length of (_byteLength - _byteOffset).
    this._dataView = new DataView(this._buffer, this._byteOffset, this._byteLength - this._byteOffset);
  }

  public seek(offset: number): void {
    const newPosition = Math.max(0, Math.min(offset, this.byteLength)); 
    this.position = isNaN(newPosition) || !isFinite(newPosition) ? 0 : newPosition;
  }

  public isEof(): boolean {
    return this.position >= this.byteLength;
  }

  // --- Read methods ---
  public readInt8(): number {
    this._realloc(1);
    const value = this._dataView.getInt8(this.position);
    this.position += 1;
    return value;
  }

  public readUint8(): number {
    this._realloc(1);
    const value = this._dataView.getUint8(this.position);
    this.position += 1;
    return value;
  }

  public readInt16(endianness?: boolean): number {
    this._realloc(2);
    const value = this._dataView.getInt16(this.position, endianness ?? this.endianness);
    this.position += 2;
    return value;
  }

  public readUint16(endianness?: boolean): number {
    this._realloc(2);
    const value = this._dataView.getUint16(this.position, endianness ?? this.endianness);
    this.position += 2;
    return value;
  }

  public readInt32(endianness?: boolean): number {
    this._realloc(4);
    const value = this._dataView.getInt32(this.position, endianness ?? this.endianness);
    this.position += 4;
    return value;
  }

  public readUint32(endianness?: boolean): number {
    this._realloc(4);
    const value = this._dataView.getUint32(this.position, endianness ?? this.endianness);
    this.position += 4;
    return value;
  }

  public readFloat32(endianness?: boolean): number {
    this._realloc(4);
    const value = this._dataView.getFloat32(this.position, endianness ?? this.endianness);
    this.position += 4;
    return value;
  }

  public readFloat64(endianness?: boolean): number {
    this._realloc(8);
    const value = this._dataView.getFloat64(this.position, endianness ?? this.endianness);
    this.position += 8;
    return value;
  }

  // --- Write methods ---
  public writeInt8(value: number): void {
    this._realloc(1);
    this._dataView.setInt8(this.position, value);
    this.position += 1;
  }

  public writeUint8(value: number): void {
    this._realloc(1);
    this._dataView.setUint8(this.position, value);
    this.position += 1;
  }

  public writeInt16(value: number, endianness?: boolean): void {
    this._realloc(2);
    this._dataView.setInt16(this.position, value, endianness ?? this.endianness);
    this.position += 2;
  }

  public writeUint16(value: number, endianness?: boolean): void {
    this._realloc(2);
    this._dataView.setUint16(this.position, value, endianness ?? this.endianness);
    this.position += 2;
  }

  public writeInt32(value: number, endianness?: boolean): void {
    this._realloc(4);
    this._dataView.setInt32(this.position, value, endianness ?? this.endianness);
    this.position += 4;
  }

  public writeUint32(value: number, endianness?: boolean): void {
    this._realloc(4);
    this._dataView.setUint32(this.position, value, endianness ?? this.endianness);
    this.position += 4;
  }

  public writeFloat32(value: number, endianness?: boolean): void {
    this._realloc(4);
    this._dataView.setFloat32(this.position, value, endianness ?? this.endianness);
    this.position += 4;
  }

  public writeFloat64(value: number, endianness?: boolean): void {
    this._realloc(8);
    this._dataView.setFloat64(this.position, value, endianness ?? this.endianness);
    this.position += 8;
  }
  
  // --- String methods ---
  public readString(length?: number, encoding: string = 'utf-8'): string {
    if (length === undefined) {
        length = this.byteLength - this.position; // byteLength is effective length of stream view
    }
    if (length <= 0) return "";
    this._realloc(length);
    // Read from the view's current position, within the view's underlying buffer segment
    const uint8Array = new Uint8Array(this._dataView.buffer, this._dataView.byteOffset + this.position, length);
    this.position += length;
    return new TextDecoder(encoding).decode(uint8Array);
  }

  public writeString(str: string, encoding: string = 'utf-8'): void {
    const uint8Array = new TextEncoder().encode(str);
    this._realloc(uint8Array.length);
    // Write into the view's current position, within the view's underlying buffer segment
    new Uint8Array(this._dataView.buffer, this._dataView.byteOffset + this.position).set(uint8Array);
    this.position += uint8Array.length;
  }

  public readCString(maxLength?: number): string {
    const bytes: number[] = [];
    let charCode = -1;
    let count = 0;

    while (this.position < this.byteLength && (maxLength === undefined || count < maxLength)) {
      // Use this.readUint8() to ensure _realloc is called and position is advanced correctly
      const currentByte = this.readUint8(); 
      if (currentByte === 0) break; 
      bytes.push(currentByte);
      count++;
    }
    // If loop terminated by null, readUint8 already advanced position past null.
    // If by EOF or maxLength, position is at EOF or after last char read.

    if (maxLength !== undefined && bytes.length === maxLength && charCode !== 0) {
        // charCode here would be from the last iteration before loop check, which isn't quite right.
        // Better to check if the loop terminated *before* finding a null, if maxLength was a constraint.
        // The main check is if we read maxLength bytes and didn't end on a null.
        // However, if the *last* byte read to fill maxLength *was* a null, it would have broken loop.
        // So, if bytes.length === maxLength, it implies no null was found *within* those maxLength bytes.
        console.warn("DataStream.readCString: MaxLength reached without a null terminator.");
    }
    return String.fromCharCode(...bytes); 
  }

  public writeCString(str: string): void {
    for (let i = 0; i < str.length; i++) {
      this.writeUint8(str.charCodeAt(i) & 0xFF); 
    }
    this.writeUint8(0); 
  }
  
  // --- Array methods ---
  public readUint8Array(length: number): Uint8Array {
    if (length < 0) throw new Error("Length cannot be negative.");
    this._realloc(length);
    // Create a view on the relevant segment of the DataView's buffer
    const subArray = new Uint8Array(this._dataView.buffer, this._dataView.byteOffset + this.position, length);
    this.position += length;
    return new Uint8Array(subArray); // Return a copy
  }
  
  public writeUint8Array(array: Uint8Array): void {
    this._realloc(array.length);
    // Set into the DataView's buffer at the current position
    new Uint8Array(this._dataView.buffer, this._dataView.byteOffset + this.position).set(array);
    this.position += array.length;
  }

  public readInt32Array(count: number, endianness?: boolean): Int32Array {
    if (count < 0) throw new Error("Count cannot be negative.");
    const byteLength = count * 4;
    this._realloc(byteLength);
    const result = new Int32Array(count);
    const specifiedEndian = endianness ?? this.endianness;
    for (let i = 0; i < count; i++) {
        result[i] = this._dataView.getInt32(this.position + i * 4, specifiedEndian);
    }
    this.position += byteLength;
    return result;
  }

  public writeInt32Array(array: Int32Array | number[], endianness?: boolean): void {
    const byteLength = array.length * 4;
    this._realloc(byteLength);
    const specifiedEndian = endianness ?? this.endianness;
    for (let i = 0; i < array.length; i++) {
        this._dataView.setInt32(this.position + i * 4, array[i], specifiedEndian);
    }
    this.position += byteLength;
  }

  public readUint32Array(count: number, endianness?: boolean): Uint32Array {
    if (count < 0) throw new Error("Count cannot be negative.");
    const byteLength = count * 4;
    this._realloc(byteLength);
    const result = new Uint32Array(count);
    const specifiedEndian = endianness ?? this.endianness;
    for (let i = 0; i < count; i++) {
        result[i] = this._dataView.getUint32(this.position + i * 4, specifiedEndian);
    }
    this.position += byteLength;
    return result;
  }
  
  public static memcpy(dst: ArrayBuffer, dstOffset: number, src: ArrayBuffer, srcOffset: number, byteLength: number): void {
    if (byteLength === 0) return;
    const dstU8 = new Uint8Array(dst, dstOffset, byteLength);
    const srcU8 = new Uint8Array(src, srcOffset, byteLength);
    dstU8.set(srcU8);
  }

  public static flipArrayEndianness(array: TypedArray): void {
    const bytesPerElement = array.BYTES_PER_ELEMENT;
    if (bytesPerElement === 1) return; 

    const buffer = array.buffer;
    const byteOffset = array.byteOffset;
    const length = array.length;
    const view = new DataView(buffer, byteOffset, length * bytesPerElement);
    const isCurrentlyLittleEndian = DataStream.LITTLE_ENDIAN; // Or determine from system/target if relevant

    for (let i = 0; i < length; i++) {
      const offset = i * bytesPerElement;
      switch (bytesPerElement) {
        case 2:
          // Read with one endian, write with the other to flip
          view.setUint16(offset, view.getUint16(offset, isCurrentlyLittleEndian), !isCurrentlyLittleEndian);
          break;
        case 4:
          if (array instanceof Float32Array) {
            view.setFloat32(offset, view.getFloat32(offset, isCurrentlyLittleEndian), !isCurrentlyLittleEndian);
          } else { // Int32Array, Uint32Array
            view.setUint32(offset, view.getUint32(offset, isCurrentlyLittleEndian), !isCurrentlyLittleEndian);
          }
          break;
        case 8:
          if (array instanceof Float64Array) {
            view.setFloat64(offset, view.getFloat64(offset, isCurrentlyLittleEndian), !isCurrentlyLittleEndian);
          }
          break;
      }
    }
  }
  
  public toUint8Array(): Uint8Array {
    this._trimAlloc();
    // Create a Uint8Array view of the effective part of the stream
    // This should be relative to the DataView's own view on the buffer.
    return new Uint8Array(this._dataView.buffer, this._dataView.byteOffset, this._dataView.byteLength);
  }
} 