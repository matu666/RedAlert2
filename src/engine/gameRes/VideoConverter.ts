import type { VirtualFile } from '../../data/vfs/VirtualFile';
import type { DataStream } from '../../data/DataStream';

// Assuming FFmpeg type is defined similarly to how it was in GameResImporter.ts (placeholder)
interface FFmpeg {
    FS: (method: string, ...args: any[]) => any; 
    run: (...args: string[]) => Promise<void>;
}

export class VideoConverter {
  /**
   * Converts a Bink video file to a specified output format (defaulting to webm).
   * @param ffmpeg An initialized FFmpeg instance.
   * @param binkFile The Bink video file as a VirtualFile.
   * @param outputFormat The desired output format (e.g., "webm", "mp4"). Defaults to "webm".
   * @returns A Uint8Array containing the converted video data.
   */
  async convertBinkVideo(
    ffmpeg: FFmpeg,
    binkFile: VirtualFile, 
    outputFormat: "webm" | "mp4" = "webm" // Example output formats
  ): Promise<Uint8Array> {
    const inputFileName = binkFile.filename;
    const outputFileName = inputFileName.replace(/\.[^.]+$/, "") + "." + outputFormat;

    const binkDataStream = binkFile.stream as DataStream; // Assuming VirtualFile.stream is DataStream
    const binkFileData = new Uint8Array(
      binkDataStream.buffer,
      binkDataStream.byteOffset,
      binkDataStream.byteLength,
    );

    ffmpeg.FS("writeFile", inputFileName, binkFileData);

    if (outputFormat === "webm") {
      await ffmpeg.run(
        "-i", inputFileName,
        "-vcodec", "libvpx", // VP8 for WebM, libvpx-vp9 for VP9
        "-crf", "10",       // Constant Rate Factor (lower is better quality, 10 is high)
        "-b:v", "2M",       // Target video bitrate (2 Mbps)
        // "-deadline", "realtime", // May impact quality/speed balance for VP8/VP9
        // "-speed", "2",          // Encoding speed (0-5 for VP8, 0-8 for VP9, higher is faster/lower quality)
        "-an",              // No audio
        outputFileName,
      );
    } else if (outputFormat === "mp4") { // Example for MP4, might need libx264 if included in ffmpeg build
      await ffmpeg.run(
        "-i", inputFileName,
        "-vcodec", "libx264",
        "-crf", "25",
        "-b:v", "2M",
        "-an",
        outputFileName,
      );
    } else {
        ffmpeg.FS("unlink", inputFileName);
        throw new Error(`Unsupported video output format: ${outputFormat}`);
    }

    const convertedData = ffmpeg.FS("readFile", outputFileName) as Uint8Array;
    ffmpeg.FS("unlink", inputFileName);
    ffmpeg.FS("unlink", outputFileName);

    return convertedData;
  }
} 