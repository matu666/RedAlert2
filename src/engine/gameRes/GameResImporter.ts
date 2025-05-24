import { MixFile } from '../../data/MixFile';
import { Engine, EngineType } from '../Engine'; // Engine might be needed for rfsSettings, etc.
import { sleep } from '../../util/time';
import { ChecksumError } from './importError/ChecksumError';
import { FileNotFoundError as GameResFileNotFoundError } from './importError/FileNotFoundError';
import { ArchiveExtractionError } from './importError/ArchiveExtractionError';
import { VirtualFile } from '../../data/vfs/VirtualFile';
import { mixDatabase } from '../mixDatabase';
import { Palette } from '../../data/Palette';
import { ShpFile } from '../../data/ShpFile';
import { ImageUtils } from '../gfx/ImageUtils';
import * as stringUtils from '../../util/string';
import { VideoConverter } from './VideoConverter';
import { InvalidArchiveError } from './importError/InvalidArchiveError';
import { FileNotFoundError as VfsFileNotFoundError } from '../../data/vfs/FileNotFoundError'; // VFS specific
import { IOError } from '../../data/vfs/IOError';
import { RealFileSystemDir } from '../../data/vfs/RealFileSystemDir';
import { NoWebAssemblyError } from './importError/NoWebAssemblyError';
import { HttpRequest, DownloadError } from '../../network/HttpRequest';
import { ArchiveDownloadError } from './importError/ArchiveDownloadError';
import type { AppConfig } from '../../Config';
import type { Strings } from '../../data/Strings';
import type { SentryLike } from '../../util/SentryLike';
import type { DataStream } from '../../data/DataStream';

// Types for 7z-wasm (these are simplified placeholders)
declare let SystemJS: {
    import: (moduleId: string) => Promise<any>;
};
interface SevenZipWasmModule {
    FS: any; // Emscripten File System API
    callMain: (args: string[]) => void;
    // ... other methods/properties if used
}
interface SevenZipWasmOptions {
    quit?: (code: number, message?: string) => void;
    // ... other options
}
declare function createSevenZipWasm(options?: SevenZipWasmOptions): Promise<SevenZipWasmModule>;

// Types for @ffmpeg/ffmpeg (simplified placeholders)
interface FFmpeg {
    FS: (method: string, ...args: any[]) => any; // Method for file system operations
    run: (...args: string[]) => Promise<void>; // Method to run ffmpeg commands
    load: () => Promise<void>;
}
declare function createFFmpeg(options: { corePath: string, log?: boolean }): FFmpeg;


const REQUIRED_MIX_SIZES = new Map<string, number>()
    .set("ra2.mix", 281895456)
    .set("language.mix", 53116040)
    .set("multi.mix", 25856283)
    .set("theme.mix", 76862662);

function formatBytes(bytes: number): string {
    return (bytes / 1024 / 1024).toFixed(2) + " MB";
}

// Helper to wrap FS.open for pre-filling content (used in original JS for 7zip)
function wrapFsOpen(originalFsOpen: any, prefilledContents: Map<string, Uint8Array>) {
    return function(this: any, path: string, flags: string, mode?: any, unknown1?: any, unknown2?: any) {
        let stream = originalFsOpen.call(this, path, flags, mode, unknown1, unknown2);
        const prefilledData = prefilledContents.get(stream.node.name);
        if (prefilledData) {
            stream.node.contents = new Uint8Array(prefilledData); // Pre-fill content
            const originalWrite = stream.stream_ops.write;
            stream.stream_ops = { ...stream.stream_ops }; // Clone to modify
            stream.stream_ops.write = function(this: any, str: any, buffer: any, offset: number, length: number, position?: number, canOwn?: boolean) {
                if (!position) { // Position is undefined or 0 for initial write to pre-filled file
                    str.node.usedBytes = str.node.contents.byteLength;
                }
                const bytesWritten = originalWrite.call(this, str, buffer, offset, length, position, canOwn);
                if (!position) {
                    str.node.usedBytes = bytesWritten; // Update usedBytes after actual write if it happened
                }
                return bytesWritten;
            };
        }
        return stream;
    };
}

export type ImportProgressCallback = (text?: string, backgroundImage?: Blob | string) => void;
export type ImportSource = URL | File | FileSystemDirectoryHandle; // FileSystemFileHandle for file, or just File

export class GameResImporter {
    private appConfig: AppConfig;
    private strings: Strings;
    private sentry?: SentryLike;

    constructor(appConfig: AppConfig, strings: Strings, sentry?: SentryLike) {
        this.appConfig = appConfig;
        this.strings = strings;
        this.sentry = sentry;
    }

    async import(source: ImportSource | undefined, targetRfsRootDir: RealFileSystemDir, onProgress: ImportProgressCallback): Promise<void> {
        const essentialMixes = ["ra2.mix", "language.mix", "multi.mix", "theme.mix"];
        const optionalMixes = new Set(["theme.mix"]); // theme.mix content (music) is handled differently
        const tauntsDirName = Engine.rfsSettings.tauntsDir;
        const S = this.strings;

        onProgress(S.get("ts:import_preparing_for_import"));

        if (!source) {
            // This case should ideally be handled before calling import, e.g. by re-prompting user.
            throw new Error("Import source is undefined."); 
        }

        if (source instanceof URL || source instanceof File) {
            if (typeof WebAssembly !== 'object' || typeof WebAssembly.instantiate !== 'function') {
                throw new NoWebAssemblyError("WebAssembly is not available or not an object.");
            }

            let sevenZipModule: SevenZipWasmModule;
            let sevenZipExitCode: number | undefined;
            let sevenZipErrorMessage: string | undefined;

            try {
                const sevenZipFactory = await SystemJS.import("7z-wasm") as typeof createSevenZipWasm;
                sevenZipModule = await sevenZipFactory({
                    quit: (code, message) => {
                        sevenZipExitCode = code;
                        sevenZipErrorMessage = message;
                    },
                });
            } catch (e: any) {
                if (e.message?.match(/Load failed|Failed to fetch/i)) {
                    throw new DownloadError("Failed to load 7z-wasm module", { cause: e });
                }
                if (e instanceof WebAssembly.RuntimeError) {
                    throw new IOError("Couldn't load 7z-wasm due to runtime error", { cause: e });
                }
                throw e;
            }

            let archiveData: Uint8Array;
            let archiveName: string;

            if (source instanceof URL) {
                let downloadedBytes = 0;
                const urlStr = source.toString();
                const corsProxy = this.appConfig.getCorsProxy?.(source.hostname);
                let effectiveUrl = urlStr;
                if (corsProxy) {
                    effectiveUrl = `${corsProxy}${encodeURIComponent(urlStr)}`;
                }
                try {
                    const buffer = await new HttpRequest().fetchBinary(effectiveUrl, undefined, {
                        onProgress: (delta, total) => {
                            downloadedBytes += delta;
                            const progressText = total
                                ? S.get("ts:downloadingpgsize", formatBytes(downloadedBytes), formatBytes(total), (downloadedBytes / total) * 100)
                                : S.get("ts:downloadingpgunkn", formatBytes(downloadedBytes));
                            onProgress(progressText);
                        },
                    });
                    archiveData = new Uint8Array(buffer);
                    archiveName = source.pathname.split('/').pop() || "archive.7z";
                } catch (e: any) {
                    if (downloadedBytes === 0 && e instanceof DownloadError) {
                        throw new ArchiveDownloadError(urlStr, "Archive download failed at start", { cause: e });
                    }
                    throw e;
                }
            } else { // source is File
                archiveData = new Uint8Array(await source.arrayBuffer());
                archiveName = source.name;
            }

            onProgress(S.get("ts:import_loading_archive"));
            sevenZipModule.FS.chdir("/tmp");
            try {
                const fileStream = sevenZipModule.FS.open(archiveName, "w+");
                sevenZipModule.FS.write(fileStream, archiveData, 0, archiveData.byteLength, 0, true);
                sevenZipModule.FS.close(fileStream);
            } catch (e: any) {
                if (e instanceof DOMException) { // Should be EmscriptenFS.ErrnoError or similar
                    throw new IOError(`Could not write archive to Emscripten FS "${archiveName}" (${e.name})`, { cause: e });
                }
                throw e;
            }
            
            // The prefilledContents map seems specific to how the original game might have used 7zip
            // For a generic archive, this might not be applicable or needs a different approach.
            // sevenZipModule.FS.open = wrapFsOpen(sevenZipModule.FS.open, REQUIRED_MIX_SIZES); // Example usage

            const entriesToExtract = [...essentialMixes, tauntsDirName];
            for (const entryName of entriesToExtract) {
                onProgress(S.get("ts:import_extracting", entryName));
                await sleep(100);
                sevenZipExitCode = undefined; // Reset before call
                sevenZipErrorMessage = undefined;
                sevenZipModule.callMain(["x", "-ssc-", "-aoa", archiveName, entryName]); // -aoa: overwrite existing files without prompt

                if (sevenZipExitCode !== 0 && sevenZipExitCode !== undefined) { // 0 is success
                     // Code 1 can be warning (e.g. file not found in archive), 2 is fatal error.
                    if (sevenZipExitCode === 1 && entryName === tauntsDirName) {
                        console.warn(`Taunts directory "${entryName}" not found in archive, or non-fatal extraction issue. Skipping.`);
                        // continue; // Allow skipping optional taunts
                    } else if (sevenZipExitCode === 1 && optionalMixes.has(entryName)) {
                        console.warn(`Optional mix file "${entryName}" not found in archive or non-fatal extraction issue. Skipping.`);
                        // continue;
                    } else {
                        const baseErrorMsg = `7-Zip exited with code ${sevenZipExitCode} for ${entryName}`;
                        if (sevenZipErrorMessage?.match(/out of memory|allocation/i)) {
                            throw new RangeError(`${baseErrorMsg} - Out of memory`, { cause: new Error(sevenZipErrorMessage) });
                        }
                        throw new ArchiveExtractionError(`${baseErrorMsg}`, { cause: new Error(sevenZipErrorMessage) });
                    }
                }

                const emFsCurrentDirContents = sevenZipModule.FS.lookupPath(sevenZipModule.FS.cwd())["node"].contents;
                const extractedEntryNames = Object.keys(emFsCurrentDirContents);

                if (entryName !== tauntsDirName) {
                    const mixFileNameInFs = extractedEntryNames.find(name => stringUtils.equalsIgnoreCase(name, entryName)) || entryName;
                    onProgress(S.get("ts:import_importing", mixFileNameInFs));
                    let fileData;
                    try {
                        fileData = this.readFileFromEmFs(sevenZipModule.FS, mixFileNameInFs);
                        sevenZipModule.FS.unlink(mixFileNameInFs);
                    } catch (e: any) {
                        // FS.ErrnoError has e.errno
                        if (e.errno === 44 /* ENOENT */ && optionalMixes.has(entryName)) {
                            console.warn(`Optional Mix file "${entryName}" not found in Emscripten FS after extraction. Skipping.`);
                            continue;
                        }
                        if (e.errno === 44 && !REQUIRED_MIX_SIZES.has(entryName.toLowerCase())) {
                             console.warn(`File "${entryName}" not found in Emscripten FS and not strictly required. Skipping.`);
                             continue;
                        }
                        throw new GameResFileNotFoundError(entryName, `Error during Emscripten FS read: ${e.message}`);
                    }
                    await this.importMixArchive(fileData, targetRfsRootDir, onProgress, S);
                } else { // Handling tauntsDirName
                    const tauntsDirInFs = extractedEntryNames.find(name => stringUtils.equalsIgnoreCase(name, tauntsDirName));
                    if (tauntsDirInFs) {
                        const tauntsDirNode = sevenZipModule.FS.lookupPath(tauntsDirInFs)["node"];
                        const tauntFileNames = Object.keys(tauntsDirNode.contents).map(name => `${tauntsDirInFs}/${name}`);
                        try {
                            const targetTauntsDir = await targetRfsRootDir.getOrCreateDirectory(tauntsDirName, true);
                            for (const tauntFilePath of tauntFileNames) {
                                onProgress(S.get("ts:import_importing", tauntFilePath));
                                const fileData = this.readFileFromEmFs(sevenZipModule.FS, tauntFilePath);
                                sevenZipModule.FS.unlink(tauntFilePath);
                                await targetTauntsDir.writeFile(fileData, fileData.filename.toLowerCase());
                            }
                        } catch (e: any) {
                            if (!(e instanceof DOMException || e instanceof IOError || e.errno === 44)) throw e;
                            console.warn("Failed to copy taunts folder. Skipping.", e);
                        }
                    } else {
                        console.warn("Taunts folder not found in archive after extraction. Skipping.");
                    }
                }
            }
            sevenZipModule.FS.unlink(archiveName);
            try {
                // Verify one of the essential files exists to confirm import worked to some extent.
                await targetRfsRootDir.openFile("ra2.mix");
            } catch(e) {
                if (e instanceof VfsFileNotFoundError || e instanceof IOError) {
                    onProgress(this.strings.get("GUI:LoadingEx"));
                    console.error("Essential file ra2.mix not found after import. Reloading might be necessary.");
                    // location.reload(); // Potentially too disruptive here.
                    // await new Promise(() => {}); // Stall if reload is chosen.
                    throw new Error("Import verification failed: ra2.mix not found.");
                }
                throw e;
            }

        } else { // Source is FileSystemDirectoryHandle (local game files)
            const sourceDirWrapper = new RealFileSystemDir(source as FileSystemDirectoryHandle, true); // Assume case-sensitive match from user's FS
            const sourceEntries = await sourceDirWrapper.listEntries();

            for (const mixName of essentialMixes) {
                onProgress(S.get("ts:import_importing", mixName));
                const actualFileName = sourceEntries.find(entry => stringUtils.equalsIgnoreCase(entry, mixName)) || mixName;
                let virtualFile;
                try {
                    virtualFile = await sourceDirWrapper.openFile(actualFileName);
                } catch (e: any) {
                    if (e instanceof VfsFileNotFoundError) {
                        if (optionalMixes.has(mixName)) {
                            console.warn(`Optional Mix file "${mixName}" not found in source directory. Skipping.`);
                            continue;
                        }
                        throw new GameResFileNotFoundError(mixName);
                    }
                    throw e;
                }
                await this.importMixArchive(virtualFile, targetRfsRootDir, onProgress, S);
            }

            const tauntsDirInSource = sourceEntries.find(entry => stringUtils.equalsIgnoreCase(entry, tauntsDirName)) || tauntsDirName;
            let sourceTauntsDir: RealFileSystemDir | undefined;
            try {
                sourceTauntsDir = await sourceDirWrapper.getDirectory(tauntsDirInSource);
            } catch (e: any) {
                if (!(e instanceof VfsFileNotFoundError || e instanceof IOError)) throw e;
                console.warn(`Taunts directory "${tauntsDirInSource}" not found in source (${e.name}). Skipping.`);
            }

            if (sourceTauntsDir) {
                try {
                    const targetTauntsRfsDir = await targetRfsRootDir.getOrCreateDirectory(tauntsDirName, true);
                    for await (const rawFile of sourceTauntsDir.getRawFiles()) {
                        onProgress(S.get("ts:import_importing", `${targetTauntsRfsDir.name}/${rawFile.name}`));
                        // Create VirtualFile from RawFile to use writeFile, or adapt writeFile.
                        // For now, assuming RealFileSystemDir.writeFile can take a File object.
                        await targetTauntsRfsDir.writeFile(VirtualFile.fromRealFile(rawFile), rawFile.name.toLowerCase());
                    }
                } catch (e:any) {
                    if (!(e instanceof IOError)) throw e;
                    console.warn("Failed to copy taunts folder from source. Skipping.", e);
                }
            }
        }
        onProgress(S.get("TS:ImportComplete"));
    }

    private readFileFromEmFs(emFs: any, filePath: string): VirtualFile {
        emFs.chmod(filePath, 0o700); // -rwx------ (448 decimal)
        const fileNode = emFs.lookupPath(filePath)["node"];
        if (!fileNode || !fileNode.contents) {
            throw new VfsFileNotFoundError(`File node or contents missing in Emscripten FS for ${filePath}`);
        }
        const fileData = fileNode.contents.subarray(0, fileNode.usedBytes);
        const fileName = filePath.slice(filePath.lastIndexOf('/') + 1);
        return VirtualFile.fromBytes(fileData, fileName);
    }

    private async importMixArchive(mixVirtualFile: VirtualFile, targetRfsRootDir: RealFileSystemDir, onProgress: ImportProgressCallback, S: Strings): Promise<void> {
        const mixFileNameLower = mixVirtualFile.filename.toLowerCase();
        const isThemeMix = !!mixFileNameLower.match(/^theme[^.]*\.mix$/);

        if (mixVirtualFile.getSize() === 0) {
            if (isThemeMix) {
                console.warn(`Mix file ${mixVirtualFile.filename} is empty. Skipping theme import.`);
                return;
            }
            throw new ChecksumError(`Mix file "${mixFileNameLower}" is empty`, mixFileNameLower);
        }

        if (!isThemeMix) { // Theme (music) MIX is not directly written, its contents are extracted
            await targetRfsRootDir.writeFile(mixVirtualFile, mixFileNameLower);
        }

        if (isThemeMix) {
            const musicDirName = Engine.rfsSettings.musicDir;
            const targetMusicDir = await targetRfsRootDir.getOrCreateDirectory(musicDirName, true);
            await this.importMusic(mixVirtualFile, targetMusicDir, (percent) => 
                onProgress(S.get("ts:import_importing_pg", mixFileNameLower, percent.toFixed(0)))
            );
        } else if (mixFileNameLower.match(/language\.mix$/)) {
            onProgress(S.get("ts:import_importing_long", mixFileNameLower));
            await this.importVideo(mixVirtualFile, targetRfsRootDir);
        } else if (mixFileNameLower.match(/ra2\.mix$/)) {
            const splashImageBlob = await this.importSplashImage(mixVirtualFile, targetRfsRootDir);
            if (splashImageBlob) onProgress(undefined, splashImageBlob);
        }
    }

    private async importMusic(mixVirtualFile: VirtualFile, targetMusicDir: RealFileSystemDir, onProgressPercent: (percent: number) => void): Promise<void> {
        let mixFileInstance: MixFile;
        try {
            mixFileInstance = new MixFile(mixVirtualFile.stream as DataStream);
        } catch (e) {
            console.warn(`Failed to read music mix archive "${mixVirtualFile.filename}". Skipping.`, e);
            return;
        }

        const knownMusicFiles = mixDatabase.get(mixVirtualFile.filename.toLowerCase());
        if (!knownMusicFiles) {
            console.warn(`File "${mixVirtualFile.filename}" not found in mix database. Skipping music import.`);
            return;
        }
        
        const totalFiles = knownMusicFiles.length;
        let processedFiles = 0;

        for (const wavFileNameInMix of knownMusicFiles) {
            processedFiles++;
            onProgressPercent((processedFiles / totalFiles) * 100);

            if (!wavFileNameInMix.toLowerCase().endsWith('.wav')) {
                console.warn(`Music file "${wavFileNameInMix}" in mix ${mixVirtualFile.filename} is not a WAV file. Skipping.`);
                continue;
            }
            
            const mp3FileName = wavFileNameInMix.replace(/\.wav$/i, ".mp3");

            if (mixFileInstance.containsFile(wavFileNameInMix)) {
                const wavFileEntry = mixFileInstance.openFile(wavFileNameInMix);
                if (wavFileEntry.stream.byteLength > 0) {
                    let mp3Data: Uint8Array | undefined;
                    try {
                        const ffmpeg = await this.createFFmpeg();
                        const wavData = new Uint8Array(wavFileEntry.stream.buffer, wavFileEntry.stream.byteOffset, wavFileEntry.stream.byteLength);
                        ffmpeg.FS("writeFile", wavFileNameInMix, wavData);
                        await ffmpeg.run("-i", wavFileNameInMix, "-vn", "-ar", "22050", "-q:a", "5", /*"-b:a", "96k",*/ mp3FileName); // q:a 5 for VBR
                        mp3Data = ffmpeg.FS("readFile", mp3FileName) as Uint8Array;
                        ffmpeg.FS("unlink", wavFileNameInMix);
                        ffmpeg.FS("unlink", mp3FileName);
                    } catch (e) {
                        console.warn(`Failed to convert music file "${wavFileNameInMix}" to MP3. Skipping.`, e);
                        this.sentry?.captureException(new Error(`FFmpeg conversion failed for ${wavFileNameInMix}`), { extra: { error: e } });
                        continue;
                    }

                    if (mp3Data) {
                        const mp3Blob = new Blob([mp3Data], { type: "audio/mpeg" });
                        try {
                            // Create VirtualFile to use writeFile
                            const virtualMp3 = VirtualFile.fromBytes(mp3Data, mp3FileName);
                            await targetMusicDir.writeFile(virtualMp3); 
                        } catch (e) {
                            console.warn(`Failed to write music file "${mp3FileName}" to target. Skipping.`, e);
                        }
                    }
                } else {
                    console.warn(`Music file "${wavFileNameInMix}" is empty in the mix archive. Skipping.`);
                }
            } else {
                console.warn(`Music file "${wavFileNameInMix}" was not found in mix archive "${mixVirtualFile.filename}". Skipping.`);
            }
        }
    }

    private async importVideo(languageMixVirtualFile: VirtualFile, targetRfsRootDir: RealFileSystemDir): Promise<void> {
        let ffmpeg: FFmpeg;
        try {
             ffmpeg = await this.createFFmpeg();
        } catch (e:any) {
            if (e.message?.match(/Load failed|Failed to fetch/i)) {
                throw new DownloadError("Failed to load FFmpeg for video conversion", { cause: e });
            }
            this.sentry?.captureException(new Error("FFmpeg creation failed for video import"), { extra: { error: e }});
            console.error("Skipping video import due to FFmpeg creation failure.", e);
            return; 
        }
        
        const langMix = new MixFile(languageMixVirtualFile.stream as DataStream);
        const binkFileName = "ra2ts_l.bik";
        const webmFileName = Engine.rfsSettings.menuVideoFileName;

        if (!langMix.containsFile(binkFileName)) {
            throw new GameResFileNotFoundError(binkFileName, `from ${languageMixVirtualFile.filename}`);
        }
        const binkFileEntry = langMix.openFile(binkFileName);
        let webmBuffer: Uint8Array;
        try {
            webmBuffer = await new VideoConverter().convertBinkVideo(ffmpeg, binkFileEntry);
        } catch(e) {
            this.sentry?.captureException(new Error(`Bink to WebM conversion failed for ${binkFileName}`), { extra: { error: e }});
            console.error("Bink video conversion failed, skipping menu video.", e);
            return;
        }
        
        const webmBlob = new Blob([webmBuffer], { type: "video/webm" });
        const virtualWebmFile = VirtualFile.fromBytes(webmBuffer, webmFileName);
        await targetRfsRootDir.writeFile(virtualWebmFile);
    }

    private async createFFmpeg(): Promise<FFmpeg> {
        const ffmpegFactory = (await SystemJS.import("@ffmpeg/ffmpeg"))["createFFmpeg"] as typeof createFFmpeg;
        // Correct corePath might need to be relative to the deployed app structure or an absolute CDN URL.
        // Example: /static/js/ffmpeg-core.js or a full CDN path.
        // For now, using a placeholder that assumes it's served from lib/
        const corePath = `${this.appConfig.baseUrl || ''}lib/ffmpeg-core.js?v=1`; 
        const ffmpeg = ffmpegFactory({ corePath: corePath, log: true });
        
        // Workaround for SystemJS compatibility with FFmpeg.js loading its own scripts.
        // Temporarily undefine `define` if it's from SystemJS, load ffmpeg, then restore.
        const systemJsDefine = (window as any).define?.amd?.System ? (window as any).define : undefined;
        if (systemJsDefine) (window as any).define = undefined;
        
        await ffmpeg.load();
        
        if (systemJsDefine) (window as any).define = systemJsDefine;
        return ffmpeg;
    }

    private async importSplashImage(ra2MixVirtualFile: VirtualFile, targetRfsRootDir: RealFileSystemDir): Promise<Blob | undefined> {
        const ra2Mix = new MixFile(ra2MixVirtualFile.stream as DataStream);
        if (!ra2Mix.containsFile("local.mix")) {
            throw new GameResFileNotFoundError("local.mix", `from ${ra2MixVirtualFile.filename}`);
        }
        const localMixStream = ra2Mix.openFile("local.mix").stream as DataStream;
        const localMix = new MixFile(localMixStream);

        const shpFileName = "glsl.shp";
        const palFileName = "gls.pal";

        if (!localMix.containsFile(shpFileName)) throw new GameResFileNotFoundError(shpFileName, "from local.mix");
        const shpFile = new ShpFile(localMix.openFile(shpFileName));
        
        if (!localMix.containsFile(palFileName)) throw new GameResFileNotFoundError(palFileName, "from local.mix");
        const palFile = new Palette(localMix.openFile(palFileName));

        let splashBlob: Blob | undefined;
        try {
            splashBlob = await ImageUtils.convertShpToPng(shpFile, palFile);
            const targetFileName = Engine.rfsSettings.splashImgFileName;
            const virtualSplashFile = VirtualFile.fromBytes(new Uint8Array(await splashBlob.arrayBuffer()), targetFileName);
            await targetRfsRootDir.writeFile(virtualSplashFile);
            return splashBlob;
        } catch (e: any) {
            console.error("Failed to convert or write splash image. Skipping.", e);
            this.sentry?.captureException(
                new Error(`Failed to convert splash image (type=${splashBlob?.type})`, { cause: e })
            );
            return undefined; // Return undefined if conversion or write failed
        }
    }
} 