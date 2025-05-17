import { DataStream } from "./DataStream";
import { IdxEntry } from "./IdxEntry";

export class IdxFile {
  public entries: Map<string, IdxEntry>;

  constructor(stream: DataStream) {
    this.entries = new Map<string, IdxEntry>();
    this.parse(stream);
  }

  private parse(stream: DataStream): void {
    const magicId = stream.readCString(4);
    if (magicId !== "GABA") {
      throw new Error(
        `Unable to load Idx file, did not find magic id "GABA", found "${magicId}" instead`,
      );
    }

    const magicNumber = stream.readInt32(); // Assuming little-endian based on typical file formats
    if (magicNumber !== 2) {
      throw new Error(
        `Unable to load Idx file, did not find magic number 2, found ${magicNumber} instead`,
      );
    }

    const numEntries = stream.readInt32(); // Assuming little-endian
    for (let i = 0; i < numEntries; i++) {
      const entry = new IdxEntry();
      
      // Original JS read a fixed-length string (16 bytes) and then found null terminator.
      // DataStream.readString(16) will read 16 bytes and decode them.
      // We need to handle potential null terminators within these 16 bytes if that's the format.
      // A safer way is to read byte by byte until null or 16 bytes are read for the filename part.
      // However, the original was `let e = t.readString(16); var r = e.indexOf("\0");`
      // This implies `readString(16)` might not be null-terminated aware in the old DataStream.
      // Our current DataStream.readString is for UTF-8 by default. If this is raw bytes interpreted as chars:
      
      let rawFilenameBytes = stream.readUint8Array(16);
      let firstNull = rawFilenameBytes.indexOf(0);
      if (firstNull === -1) firstNull = 16; // No null found, use all 16 bytes
      
      // Decode only the part before null using ASCII or Latin1, as typical for such filenames.
      // TextDecoder with 'ascii' or 'windows-1251' (latin1 like) might be appropriate.
      // For simplicity, if it's mostly English chars, fromCharCode might work for basic ASCII range.
      let filename = "";
      for(let k=0; k < firstNull; k++) {
          filename += String.fromCharCode(rawFilenameBytes[k]);
      }

      entry.filename = filename + ".wav";
      entry.offset = stream.readUint32();     // Assuming little-endian
      entry.length = stream.readUint32();     // Assuming little-endian
      entry.sampleRate = stream.readUint32(); // Assuming little-endian
      entry.flags = stream.readUint32();      // Assuming little-endian
      entry.chunkSize = stream.readUint32();  // Assuming little-endian
      
      this.entries.set(entry.filename, entry);
    }
  }
} 