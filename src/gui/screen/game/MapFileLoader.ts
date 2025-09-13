import { FileNotFoundError } from '@/data/vfs/FileNotFoundError';
import { VirtualFile } from '@/data/vfs/VirtualFile';

/**
 * Loads map files from various sources (VFS, resources)
 */
export class MapFileLoader {
  constructor(
    private resourceLoader: any,
    private vfs?: any
  ) {}

  async load(filename: string, cancellationToken?: any): Promise<VirtualFile> {
    let mapFile: VirtualFile | undefined;

    // Try to load from VFS first
    if (this.vfs) {
      try {
        mapFile = await this.vfs.openFileWithRfs(filename);
      } catch (error) {
        if (!(error instanceof FileNotFoundError)) {
          console.error(error);
        }
      }
    }

    // Fall back to resource loader if VFS load failed
    if (!mapFile) {
      const bytes = await this.resourceLoader.loadBinary(filename, cancellationToken);
      mapFile = VirtualFile.fromBytes(bytes, filename);
    }

    return mapFile;
  }
}
