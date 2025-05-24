import { DataStream } from '../../data/DataStream';
import { Crc32 } from '../../data/Crc32';
import { VirtualFile } from '../../data/vfs/VirtualFile';
import { ResourceLoader } from '../ResourceLoader';
import { DownloadError } from '../../network/HttpRequest';
import type { CancellationToken } from '@puzzl/core/lib/async/cancellation';
import { RealFileSystemDir } from '../../data/vfs/RealFileSystemDir';
import type { RealFileSystem } from '../../data/vfs/RealFileSystem'; // For GameRes.ts constructor call

interface CdnManifest {
    version: number;
    format: string;
    checksums: { [fileName: string]: number }; // filename -> CRC32 checksum (as number)
    // Potentially other fields
}

interface CdnFetchOptions {
    onProgress?: (loadedBytesDelta: number, totalLength?: number) => void;
}

export class CdnResourceLoader extends ResourceLoader {
    private static readonly cachePrefix = "cdncache_";

    private cdnManifest: CdnManifest;
    private cacheDir?: RealFileSystemDir;
    private rfsForCache?: RealFileSystem; // For cache operations if needed

    static async clearCache(cacheDir: RealFileSystemDir): Promise<void> {
        try {
            for await (const entryName of cacheDir.getEntries()) {
                if (entryName.startsWith(CdnResourceLoader.cachePrefix)) {
                    await cacheDir.deleteFile(entryName, true); // skipCaseFix = true, as it's from listEntries
                }
            }
        } catch (e) {
            console.error("Error clearing CDN cache:", e);
            // Decide if this should throw or just log
        }
    }

    constructor(baseUrl: string, manifest: CdnManifest, cacheDirHandle?: FileSystemDirectoryHandle, rfsForCache?: RealFileSystem) {
        super(baseUrl);
        this.cdnManifest = manifest;
        if (cacheDirHandle) {
            this.cacheDir = new RealFileSystemDir(cacheDirHandle);
        }
        this.rfsForCache = rfsForCache; // Store RFS if provided for cache operations
    }

    private getFileNameFromUrl(url: string): string {
        const pathPart = url.split("?")[0];
        return pathPart.substring(pathPart.lastIndexOf('/') + 1);
    }

    protected async fetchResource(
        url: string, 
        cancellationToken?: CancellationToken, 
        options?: CdnFetchOptions
    ): Promise<ArrayBuffer> { // Override to return ArrayBuffer
        const fileName = this.getFileNameFromUrl(url);
        const cacheFileName = CdnResourceLoader.cachePrefix + fileName;
        const expectedChecksum = this.cdnManifest.checksums[fileName];

        // Try to load from cache first if conditions met
        if (this.cacheDir && fileName.endsWith(".mix") && expectedChecksum !== undefined) {
            try {
                if (await this.cacheDir.containsEntry(cacheFileName)) {
                    const cachedFile = await this.cacheDir.getRawFile(cacheFileName, true); // skipCaseFix true for cache name
                    const cachedData = await cachedFile.arrayBuffer();
                    const fileUint8Array = new Uint8Array(cachedData);
                    if (Crc32.calculateCrc(fileUint8Array) === expectedChecksum) {
                        options?.onProgress?.(fileUint8Array.length, fileUint8Array.length); // Report full progress
                        return cachedData; // Return ArrayBuffer
                    }
                    // Checksum mismatch, delete cached file
                    try {
                        await this.cacheDir.deleteFile(cacheFileName, true);
                    } catch (delError) {
                        console.error(`Couldn't delete stale cache file "${cacheFileName}"`, delError);
                    }
                }
            } catch (cacheReadError) {
                console.error(`Couldn't read file "${cacheFileName}" from local CDN cache`, cacheReadError);
            }
        }

        let urlToFetch = url;
        if (expectedChecksum !== undefined) {
            // Append checksum as query param for cache busting / versioning if server supports it
            // Original code used 'h' parameter.
            urlToFetch += (urlToFetch.includes("?") ? "&" : "?") + "h=" + expectedChecksum.toString(16);
        }
        
        // Fetch from network
        const networkDataBuffer = await super.fetchResource(urlToFetch, cancellationToken, options);
        const networkDataUint8 = new Uint8Array(networkDataBuffer);

        // Verify checksum if expected
        if (expectedChecksum !== undefined && Crc32.calculateCrc(networkDataUint8) !== expectedChecksum) {
            throw new DownloadError(`Checksum mismatch for URL "${urlToFetch}"`);
        }

        // Try to cache the newly downloaded file
        if (this.cacheDir && expectedChecksum !== undefined && fileName.endsWith(".mix")) {
            try {
                // Create a VirtualFile from the ArrayBuffer to use with writeFile
                const virtualFile = VirtualFile.fromBytes(networkDataUint8, cacheFileName);
                await this.cacheDir.writeFile(virtualFile);
            } catch (cacheWriteError) {
                console.error(`Couldn't write file "${cacheFileName}" to local CDN cache`, cacheWriteError);
            }
        }
        return networkDataBuffer;
    }
} 