import { DataStream } from "./DataStream";
import { VirtualFile } from "./vfs/VirtualFile";
import type { IdxFile } from "./IdxFile";
import type { IdxEntry } from "./IdxEntry"; // Corrected: Import IdxEntry directly from its source

export class AudioBagFile {
  private fileData: Map<string, DataStream>;

  constructor() {
    this.fileData = new Map<string, DataStream>();
  }

  // The method in VirtualFileSystem.ts calls this with (bagVirtualFile, idxData)
  // and expects it to be async and modify the instance.
  public async fromVirtualFile(bagFile: VirtualFile, idx: IdxFile): Promise<this> {
    // Assuming idx.entries is a Map<string, IdxEntry> or similar iterable
    for (const [filename, entry] of idx.entries) {
      // Make sure bagFile.stream is ready to be read from if it's not already a fully loaded stream
      // This might involve async operations if bagFile.stream is not yet fully in memory
      // For now, assuming bagFile.stream is a readily available DataStream from a fully loaded VirtualFile
      const wavDataStream = this.buildWavData(bagFile.stream, entry);
      wavDataStream.dynamicSize = false; // The created WAV data is fixed
      this.fileData.set(filename, wavDataStream);
    }
    return this;
  }

  public getFileList(): string[] {
    return [...this.fileData.keys()];
  }

  public containsFile(filename: string): boolean {
    return this.fileData.has(filename);
  }

  public openFile(filename: string): VirtualFile {
    if (!this.containsFile(filename)) {
      // Consider using a specific error type like FileNotFoundError
      throw new Error(`File "${filename}" not found in AudioBagFile`);
    }
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const dataStream = this.fileData.get(filename)!;
    // Reset position for new VirtualFile consumers
    dataStream.seek(0);
    return new VirtualFile(dataStream, filename);
  }

  private buildWavData(sourceStream: DataStream, idxEntry: IdxEntry): DataStream {
    const outStream = new DataStream();
    outStream.littleEndian(); // WAV files are typically little-endian

    const channels = (idxEntry.flags & 0x01) > 0 ? 2 : 1; // Flag 1: Stereo
    let paddingBytes = 0;

    if ((idxEntry.flags & 0x02) > 0) { // Flag 2: PCM audio data
      outStream.writeString("RIFF");
      outStream.writeUint32(idxEntry.length + 36); // ChunkSize
      outStream.writeString("WAVE");
      outStream.writeString("fmt ");
      outStream.writeUint32(16); // Subchunk1Size (PCM)
      outStream.writeUint16(1); // AudioFormat (PCM)
      outStream.writeUint16(channels);
      outStream.writeUint32(idxEntry.sampleRate);
      // ByteRate = SampleRate * NumChannels * BitsPerSample/8
      // Assuming 16 BitsPerSample (2 bytes)
      outStream.writeUint32(idxEntry.sampleRate * channels * 2);
      outStream.writeUint16(channels * 2); // BlockAlign = NumChannels * BitsPerSample/8
      outStream.writeUint16(16); // BitsPerSample
      outStream.writeString("data");
      outStream.writeUint32(idxEntry.length); // Subchunk2Size (data length)
    } else if ((idxEntry.flags & 0x08) > 0) { // Flag 8: Westwood ADPCM
      // Values from original code, Westwood ADPCM specific
      const byteRate = 11100 * channels * Math.floor(idxEntry.sampleRate / 22050);
      const blockAlign = idxEntry.chunkSize; // Or a calculated value?
      const samplesPerBlock = 1017; // Westwood specific constant?
      
      const numBlocks = Math.max(2, Math.ceil(idxEntry.length / blockAlign));
      const totalDataBytesInAdpcm = numBlocks * blockAlign;
      paddingBytes = totalDataBytesInAdpcm - idxEntry.length;

      outStream.writeString("RIFF");
      outStream.writeUint32(52 + totalDataBytesInAdpcm); // ChunkSize
      outStream.writeString("WAVE");
      outStream.writeString("fmt ");
      outStream.writeUint32(20); // Subchunk1Size for MS ADPCM (or Westwood extended)
      outStream.writeUint16(17); // AudioFormat (IMA ADPCM = 0x0011 -> 17 decimal)
      outStream.writeUint16(channels);
      outStream.writeUint32(idxEntry.sampleRate);
      outStream.writeUint32(byteRate); // ByteRate
      outStream.writeUint16(blockAlign); // BlockAlign
      outStream.writeUint16(4); // BitsPerSample (for ADPCM, this is compressed)
      // Extra Bytes for ADPCM format extension
      outStream.writeUint16(2); // cbSize (size of extra info)
      outStream.writeUint16(samplesPerBlock); // wSamplesPerBlock
      
      outStream.writeString("fact");
      outStream.writeUint32(4); // Subchunk Size for fact
      // Total number of samples: original had `1017 * (n = Math.max(2, Math.ceil(t.length / s)))`
      // which is `samplesPerBlock * numBlocks`
      outStream.writeUint32(samplesPerBlock * numBlocks); // dwSampleLength (uncompressed samples)
      
      outStream.writeString("data");
      outStream.writeUint32(totalDataBytesInAdpcm); // Subchunk2Size (compressed data length)
    } else {
      // Unknown flag combination for WAV header, this case should be handled.
      // Maybe throw an error or log a warning.
      // For now, proceed without header, just raw data (likely incorrect for WAV player)
      console.warn(`AudioBagFile: Unknown flags ${idxEntry.flags} for WAV header generation for entry referencing offset ${idxEntry.offset}.`);
    }

    sourceStream.seek(idxEntry.offset);
    const audioData = sourceStream.readUint8Array(idxEntry.length);
    outStream.writeUint8Array(audioData);

    for (let i = 0; i < paddingBytes; i++) {
      outStream.writeUint8(0);
    }

    outStream.seek(0);
    return outStream;
  }
} 