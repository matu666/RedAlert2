import { Crc32 } from '../Crc32';
import { ZipUtils } from './ZipUtils';

interface FileRecord {
  name: string;
  sizeBig: bigint;
  crc: Crc32;
  done: boolean;
  date: Date;
  headerOffsetBig: bigint;
}

interface ByteArrayData {
  data: number | bigint | Uint8Array;
  size?: number;
}

export class Zip {
  private zip64: boolean;
  private fileRecord: FileRecord[];
  private finished: boolean;
  private byteCounterBig: bigint;
  private outputStream: ReadableStream<Uint8Array>;
  private outputController: ReadableStreamDefaultController<Uint8Array>;

  constructor(zip64: boolean = false) {
    this.zip64 = zip64;
    console.info("Started zip with zip64: " + this.zip64);
    this.fileRecord = [];
    this.finished = false;
    this.byteCounterBig = BigInt(0);
    
    this.outputStream = new ReadableStream<Uint8Array>({
      start: (controller) => {
        console.info("OutputStream has started!");
        this.outputController = controller;
      },
      cancel: () => {
        console.info("OutputStream has been canceled!");
      },
    });
  }

  private enqueue(data: Uint8Array): void {
    this.outputController.enqueue(data);
  }

  private close(): void {
    this.outputController.close();
  }

  private getZip64ExtraField(sizeBig: bigint, offsetBig: bigint): Uint8Array {
    return ZipUtils.createByteArray([
      { data: 1, size: 2 },
      { data: 28, size: 2 },
      { data: sizeBig, size: 8 },
      { data: sizeBig, size: 8 },
      { data: offsetBig, size: 8 },
      { data: 0, size: 4 },
    ]);
  }

  private isWritingFile(): boolean {
    return (
      0 < this.fileRecord.length &&
      false === this.fileRecord[this.fileRecord.length - 1].done
    );
  }

  public startFile(fileName: string, fileDate: Date): void {
    if (this.isWritingFile() || this.finished) {
      throw new Error(
        "Tried adding file while adding other file or while zip has finished"
      );
    }

    console.info("Start file: " + fileName);
    const date = new Date(fileDate);
    
    this.fileRecord = [
      ...this.fileRecord,
      {
        name: fileName,
        sizeBig: BigInt(0),
        crc: new Crc32(),
        done: false,
        date: date,
        headerOffsetBig: this.byteCounterBig,
      },
    ];

    const encodedFileName = new TextEncoder().encode(fileName);
    const headerData = ZipUtils.createByteArray([
      { data: 67324752, size: 4 }, // Local file header signature
      { data: 45, size: 2 }, // Version needed to extract
      { data: 2056, size: 2 }, // General purpose bit flag
      { data: 0, size: 2 }, // Compression method
      { data: ZipUtils.getTimeStruct(date), size: 2 },
      { data: ZipUtils.getDateStruct(date), size: 2 },
      { data: 0, size: 4 }, // CRC-32 (will be updated later)
      { data: this.zip64 ? 4294967295 : 0, size: 4 }, // Compressed size
      { data: this.zip64 ? 4294967295 : 0, size: 4 }, // Uncompressed size
      { data: encodedFileName.length, size: 2 }, // File name length
      { data: this.zip64 ? 32 : 0, size: 2 }, // Extra field length
      { data: encodedFileName },
      {
        data: this.zip64
          ? this.getZip64ExtraField(BigInt(0), this.byteCounterBig)
          : new Uint8Array(0),
      },
    ]);

    this.enqueue(headerData);
    this.byteCounterBig += BigInt(headerData.length);
  }

  public appendData(data: Uint8Array): void {
    if (!this.isWritingFile() || this.finished) {
      throw new Error(
        "Tried to append file data, but there is no open file!"
      );
    }

    this.enqueue(data);
    this.byteCounterBig += BigInt(data.length);
    this.fileRecord[this.fileRecord.length - 1].crc.append(data);
    this.fileRecord[this.fileRecord.length - 1].sizeBig += BigInt(data.length);
  }

  public endFile(): void {
    if (!this.isWritingFile() || this.finished) {
      throw new Error("Tried to end file, but there is no open file!");
    }

    const currentFile = this.fileRecord[this.fileRecord.length - 1];
    console.info("End file: " + currentFile.name);
    
    const dataDescriptor = ZipUtils.createByteArray([
      { data: currentFile.crc.get(), size: 4 },
      { data: currentFile.sizeBig, size: this.zip64 ? 8 : 4 },
      { data: currentFile.sizeBig, size: this.zip64 ? 8 : 4 },
    ]);

    this.enqueue(dataDescriptor);
    this.byteCounterBig += BigInt(dataDescriptor.length);
    this.fileRecord[this.fileRecord.length - 1].done = true;
  }

  public finish(): void {
    if (this.isWritingFile() || this.finished) {
      throw new Error("Empty zip, or there is still a file open");
    }

    console.info("Finishing zip");
    let centralDirectorySize = BigInt(0);
    const centralDirectoryOffset = this.byteCounterBig;

    // Write central directory records
    this.fileRecord.forEach((fileRecord) => {
      const {
        date,
        crc,
        sizeBig,
        name,
        headerOffsetBig,
      } = fileRecord;

      const encodedFileName = new TextEncoder().encode(name);
      const centralDirectoryRecord = ZipUtils.createByteArray([
        { data: 33639248, size: 4 }, // Central directory file header signature
        { data: 45, size: 2 }, // Version made by
        { data: 45, size: 2 }, // Version needed to extract
        { data: 2056, size: 2 }, // General purpose bit flag
        { data: 0, size: 2 }, // Compression method
        { data: ZipUtils.getTimeStruct(date), size: 2 },
        { data: ZipUtils.getDateStruct(date), size: 2 },
        { data: crc.get(), size: 4 },
        { data: this.zip64 ? 4294967295 : sizeBig, size: 4 }, // Compressed size
        { data: this.zip64 ? 4294967295 : sizeBig, size: 4 }, // Uncompressed size
        { data: encodedFileName.length, size: 2 }, // File name length
        { data: this.zip64 ? 32 : 0, size: 2 }, // Extra field length
        { data: 0, size: 2 }, // File comment length
        { data: 0, size: 2 }, // Disk number start
        { data: 0, size: 2 }, // Internal file attributes
        { data: 0, size: 4 }, // External file attributes
        { data: this.zip64 ? 4294967295 : headerOffsetBig, size: 4 }, // Relative offset of local header
        { data: encodedFileName },
        {
          data: this.zip64 ? this.getZip64ExtraField(sizeBig, headerOffsetBig) : new Uint8Array(0),
        },
      ]);

      this.enqueue(centralDirectoryRecord);
      this.byteCounterBig += BigInt(centralDirectoryRecord.length);
      centralDirectorySize += BigInt(centralDirectoryRecord.length);
    });

    // Write ZIP64 end of central directory record and locator if needed
    if (this.zip64) {
      const zip64EndOfCentralDirectoryOffset = this.byteCounterBig;
      
      const zip64EndOfCentralDirectoryRecord = ZipUtils.createByteArray([
        { data: 101075792, size: 4 }, // ZIP64 end of central dir signature
        { data: 44, size: 8 }, // Size of ZIP64 end of central directory record
        { data: 45, size: 2 }, // Version made by
        { data: 45, size: 2 }, // Version needed to extract
        { data: 0, size: 4 }, // Number of this disk
        { data: 0, size: 4 }, // Number of the disk with the start of the central directory
        { data: this.fileRecord.length, size: 8 }, // Total number of entries in the central directory on this disk
        { data: this.fileRecord.length, size: 8 }, // Total number of entries in the central directory
        { data: centralDirectorySize, size: 8 }, // Size of the central directory
        { data: centralDirectoryOffset, size: 8 }, // Offset of start of central directory
      ]);

      this.enqueue(zip64EndOfCentralDirectoryRecord);
      this.byteCounterBig += BigInt(zip64EndOfCentralDirectoryRecord.length);

      const zip64EndOfCentralDirectoryLocator = ZipUtils.createByteArray([
        { data: 117853008, size: 4 }, // ZIP64 end of central dir locator signature
        { data: 0, size: 4 }, // Number of the disk with the start of the ZIP64 end of central directory
        { data: zip64EndOfCentralDirectoryOffset, size: 8 }, // Relative offset of the ZIP64 end of central directory record
        { data: 1, size: 4 }, // Total number of disks
      ]);

      this.enqueue(zip64EndOfCentralDirectoryLocator);
      this.byteCounterBig += BigInt(zip64EndOfCentralDirectoryLocator.length);
    }

    // Write end of central directory record
    const endOfCentralDirectoryRecord = ZipUtils.createByteArray([
      { data: 101010256, size: 4 }, // End of central dir signature
      { data: 0, size: 2 }, // Number of this disk
      { data: 0, size: 2 }, // Number of the disk with the start of the central directory
      {
        data: this.zip64 ? 65535 : this.fileRecord.length,
        size: 2,
      }, // Total number of entries in the central directory on this disk
      {
        data: this.zip64 ? 65535 : this.fileRecord.length,
        size: 2,
      }, // Total number of entries in the central directory
      { data: this.zip64 ? 4294967295 : centralDirectorySize, size: 4 }, // Size of the central directory
      { data: this.zip64 ? 4294967295 : centralDirectoryOffset, size: 4 }, // Offset of start of central directory
      { data: 0, size: 2 }, // ZIP file comment length
    ]);

    this.enqueue(endOfCentralDirectoryRecord);
    this.close();
    this.byteCounterBig += BigInt(endOfCentralDirectoryRecord.length);
    this.finished = true;
    
    console.info(
      "Done writing zip file. " +
        `Wrote ${this.fileRecord.length} files and a total of ${this.byteCounterBig} bytes.`
    );
  }

  public getOutputStream(): ReadableStream<Uint8Array> {
    return this.outputStream;
  }
}