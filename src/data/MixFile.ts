import { DataStream } from "./DataStream";
import { Blowfish } from "./encoding/Blowfish";
import { BlowfishKey } from "./encoding/BlowfishKey";
import { MixEntry } from "./MixEntry";
import { VirtualFile } from "./vfs/VirtualFile";
import { IOError } from "./vfs/IOError"; // Included from previous attempts, might be useful for error handling

enum MixFileFlags {
  Checksum = 0x00010000, // 65536
  Encrypted = 0x00020000, // 131072
}

export class MixFile {
  private stream: DataStream;
  private headerStart = 84; // For RA encrypted headers, from original constructor
  private index: Map<number, MixEntry>;
  private dataStart: number = 0; // Offset where the actual file data begins

  constructor(stream: DataStream) {
    this.stream = stream;
    this.index = new Map<number, MixEntry>();
    this.parseHeader();
  }

  private parseHeader(): void {
    const flags = this.stream.readUint32();
    // Original logic: t = 0 == (e & ~(r.Checksum | r.Encrypted));
    // This checks if flags, after clearing Checksum and Encrypted bits, is zero.
    // Meaning, flags only contains Checksum, Encrypted, or both, or is zero.
    const isWestwoodMix = (flags & ~(MixFileFlags.Checksum | MixFileFlags.Encrypted)) === 0;

    if (isWestwoodMix) {
      if ((flags & MixFileFlags.Encrypted) !== 0) {
        // RA/TS Encrypted header
        this.dataStart = this.parseRaHeader();
        return; // Successfully parsed encrypted header
      }
      // else TD/RA unencrypted header (or flags = 0), continue to parseTdHeader with current stream
    } else {
      // Not a Westwood MIX file based on flags, or potentially a TD/RA file with no flags set (stream was 0).
      // Original logic: else this.stream.seek(0);
      // Try to parse as TD header from the beginning of the file.
      this.stream.seek(0);
    }
    // For unencrypted Westwood Mix or non-Westwood (seeked to 0)
    this.dataStart = this.parseTdHeader(this.stream);
  }

  private parseRaHeader(): number {
    const currentStream = this.stream; // Alias for clarity, 'e' in original
    
    const rsaKeyMaterial = currentStream.readUint8Array(80); // 't' in original
    const blowfishKeyBytes = new BlowfishKey().decryptKey(rsaKeyMaterial); // 'i' in original, BlowfishKey instance created and used
    const blowfishKeyNumericArray = Array.from(blowfishKeyBytes); // Blowfish constructor expects number[]

    const encryptedHeaderInfo = currentStream.readUint32Array(2); // 'r' in original, reads numFiles and encryptedIndexLength

    const blowfish = new Blowfish(blowfishKeyNumericArray); // 's' in original Blowfish instance
    
    // Decrypt numFiles and encryptedIndexLength
    // 'a' in original: let a = new n.DataStream(s.decrypt(r));
    let decryptedInfoStream = new DataStream(blowfish.decrypt(encryptedHeaderInfo).buffer);

    const numFiles = decryptedInfoStream.readUint16(); // 't' in original was re-assigned
    /* const encryptedIndexBodyLength = */ decryptedInfoStream.readUint32(); // Original: a.readUint32()

    currentStream.position = this.headerStart; // Original: e.position = this.headerStart;

    // Calculate size of the encrypted index body
    // 'i' in original: (i = 6 + t * c.MixEntry.size)
    const indexBodySize = 6 + numFiles * MixEntry.size; 
    
    // 't' in original: (t = ((3 + i) / 4) | 0) - calculate dword blocks for Blowfish
    // This is equivalent to Math.ceil(indexBodySize / 4) for positive integers.
    const numDwordBlocks = Math.ceil(indexBodySize / 4); 
    
    // 'r' in original: (r = e.readUint32Array(t + (t % 2))); Read possibly padded dword blocks
    const encryptedIndexBody = currentStream.readUint32Array(numDwordBlocks + (numDwordBlocks % 2));
    
    // 'a' in original: a = new n.DataStream(s.decrypt(r)); Decrypt the index body
    const decryptedIndexStream = new DataStream(blowfish.decrypt(encryptedIndexBody).buffer);

    // Calculate where actual file data starts after header and padded index
    // 'i' in original: i = this.headerStart + i + ((1 + (~i >>> 0)) & 7);
    // ((1 + (~indexBodySize >>> 0)) & 7) is a way to get padding to 8-byte boundary
    // (~indexBodySize >>> 0) is like -indexBodySize (unsigned). (1 - indexBodySize) & 7.
    // A simpler way for 8-byte alignment padding: (8 - (indexBodySize % 8)) % 8
    // Or, if indexBodySize is multiple of 8, padding is 0. Otherwise 8 - (indexBodySize % 8).
    // Let's use the original bitwise logic for exactness:
    const dataAreaStartOffset = this.headerStart + indexBodySize + ((1 + (~indexBodySize >>> 0)) & 7);

    this.parseTdHeader(decryptedIndexStream); // Parse the decrypted index entries
    return dataAreaStartOffset; // This is the start of the actual file data content
  }

  private parseTdHeader(indexStream: DataStream): number { // 'e' in original
    const numEntries = indexStream.readUint16(); // 't' in original
    /* const totalSizeOfIndexEntries = */ indexStream.readUint32(); // Original just read it, might be useful for validation

    for (let i = 0; i < numEntries; i++) { // 'r' in original loop was loop counter
      const entry = new MixEntry( // 'i' in original was the MixEntry instance
        indexStream.readUint32(), // hash
        indexStream.readUint32(), // offset
        indexStream.readUint32()  // length
      );
      this.index.set(entry.hash, entry);
    }
    // For an unencrypted MIX, this is the stream position after header, which is dataStart.
    // For an encrypted MIX, this is the position within the decryptedIndexStream after reading entries.
    // The return value is assigned to this.dataStart if it's the main call from parseHeader,
    // or it's the return from parseRaHeader.
    return indexStream.position; 
  }

  public containsFile(filename: string): boolean { // 'e' in original
    // Filenames in MIX are typically case-insensitive. MixEntry.hashFilename handles uppercasing.
    return this.index.has(MixEntry.hashFilename(filename));
  }

  public openFile(filename: string): VirtualFile { // 'e' in original filename
    // Filenames in MIX are typically case-insensitive.
    const fileId = MixEntry.hashFilename(filename);
    const entry = this.index.get(fileId); // 't' in original

    if (!entry) {
      // Using IOError for consistency if other parts of VFS might throw it.
      throw new IOError(`File "${filename}" (hash ${fileId}) not found in MIX archive.`);
    }

    // The 'this.stream' here is the DataStream of the entire MIX file.
    // 'VirtualFile.factory' in original was i.VirtualFile.factory
    // It expects the source DataStream (or DataView), filename, absolute offset, and length.
    return VirtualFile.factory(
      this.stream.dataView, // Pass the DataView from the full MixFile's DataStream
      filename,
      this.dataStart + entry.offset, // entry.offset is relative to dataStart
      entry.length
    );
  }
} 