import React, { useEffect, useRef, useState } from 'react';
import { RealFileSystem } from '../data/vfs/RealFileSystem';
import { VirtualFileSystem } from '../data/vfs/VirtualFileSystem';
import AppLogger from '../util/logger';
import { FileNotFoundError } from '../data/vfs/FileNotFoundError';

// Global types are now in src/types/global.d.ts

interface ExplorerEntry {
  id: string;
  name: string;
  type: 'folder' | 'file';
  hash: string;
  attrs?: { [key: string]: any; canmodify?: boolean };
  size?: number;
  tooltip?: string;
  thumb?: string;
}

const FileExplorerTest: React.FC = () => {
  const [rfs, setRfs] = useState<RealFileSystem | null>(null);
  const [vfs, setVfs] = useState<VirtualFileSystem | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [explorerLoaded, setExplorerLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const fileExplorerContainerRef = useRef<HTMLDivElement>(null);
  const fileExplorerInstanceRef = useRef<any>(null);

  useEffect(() => {
    const cssLink = document.createElement('link');
    cssLink.href = '/other/file-explorer.css';
    cssLink.rel = 'stylesheet';
    cssLink.type = 'text/css';
    document.head.appendChild(cssLink);

    const script = document.createElement('script');
    script.src = '/other/file-explorer.js';
    script.async = true;
    script.onload = () => {
      AppLogger.info('file-explorer.js loaded');
      setExplorerLoaded(true);
    };
    script.onerror = () => {
      AppLogger.error('Failed to load file-explorer.js');
      setError('Failed to load file-explorer.js.');
    };
    document.body.appendChild(script);

    return () => {
      document.head.removeChild(cssLink);
      document.body.removeChild(script);
      if (fileExplorerInstanceRef.current && typeof fileExplorerInstanceRef.current.Destroy === 'function') {
        fileExplorerInstanceRef.current.Destroy();
      }
    };
  }, []);

  const getEntriesFromDirHandle = async (dirHandle: FileSystemDirectoryHandle, pathForAttrs: string): Promise<ExplorerEntry[]> => {
    const entries: ExplorerEntry[] = [];
    try {
      for await (const [name, handle] of dirHandle.entries()) {
        const fileHandle = handle as FileSystemFileHandle;
        const itemFile = handle.kind === 'file' ? await fileHandle.getFile() : null;
        const entry: ExplorerEntry = {
          id: name,
          name: name,
          type: handle.kind === 'directory' ? 'folder' : 'file',
          hash: name + (itemFile ? itemFile.lastModified : 'folder') + (itemFile ? itemFile.size : ''),
          size: itemFile?.size,
          attrs: { canmodify: true }, // Simplified for now
        };
        entries.push(entry);
      }
    } catch (e: any) {
      AppLogger.error(`Error reading entries from dirHandle ${dirHandle.name}:`, e);
      setError(`Error reading directory ${dirHandle.name}: ${e.message}`);
      // Do not re-throw, let onrefresh handle empty entries or display error
    }
    return entries.sort((a, b) => {
      if (a.type === b.type) return a.name.localeCompare(b.name);
      return a.type === 'folder' ? -1 : 1;
    });
  };

  const handleSelectDirectory = async () => {
    setError(null);
    setMessage(null);
    setIsLoading(true);

    if (!window.showDirectoryPicker) {
      setError('File System Access API is not supported by your browser.');
      setIsLoading(false);
      return;
    }

    try {
      const dirHandle = await window.showDirectoryPicker();
      const realFs = new RealFileSystem();
      const rootDirWrapper = realFs.addRootDirectoryHandle(dirHandle);
      setRfs(realFs);

      const virtualFs = new VirtualFileSystem(realFs, AppLogger);
      setVfs(virtualFs);
      AppLogger.info('RealFileSystem and VirtualFileSystem initialized.');
      setMessage(`VFS Initialized. Root: ${rootDirWrapper.name}`);

      if (window.FileExplorer && fileExplorerContainerRef.current) {
        if (fileExplorerInstanceRef.current && typeof fileExplorerInstanceRef.current.Destroy === 'function') {
          fileExplorerInstanceRef.current.Destroy();
        }

        const FE_ROOT_ID = '__explorer_root__';
        const initialPathSegments = [[FE_ROOT_ID, dirHandle.name, { canmodify: true }]];
        
        const explorerOptions = {
          initpath: initialPathSegments,
          onrefresh: async (feFolder: any, isFirstLoad: boolean) => {
            AppLogger.info(`FE onrefresh. Path from FE:`, JSON.parse(JSON.stringify(feFolder.GetPath())), `Is first load: ${isFirstLoad}`);
            feFolder.SetBusyRef(1);
            let entries: ExplorerEntry[] = [];
            try {
              const fePathSegments: [string, string, any][] = feFolder.GetPath();
              let currentActualDirHandle: FileSystemDirectoryHandle = dirHandle;
              let relativePathForVfs = '';

              if (fePathSegments.length > 0) {
                let pathParts: string[] = [];
                for (let i = 0; i < fePathSegments.length; i++) {
                  const segmentId = fePathSegments[i][0];
                  const segmentName = fePathSegments[i][1];
                  pathParts.push(segmentName);
                  if (i === 0 && segmentId === FE_ROOT_ID) {
                    currentActualDirHandle = dirHandle;
                  } else {
                    currentActualDirHandle = await currentActualDirHandle.getDirectoryHandle(segmentName);
                  }
                }
                if (pathParts.length > 0 && pathParts[0] === dirHandle.name && fePathSegments[0][0] === FE_ROOT_ID) {
                  relativePathForVfs = pathParts.slice(1).join('/');
                } else {
                  relativePathForVfs = pathParts.join('/');
                }
              }
              AppLogger.info(`Resolved RFS handle to: ${currentActualDirHandle.name}, Relative VFS path: '${relativePathForVfs}'`);

              entries = await getEntriesFromDirHandle(currentActualDirHandle, relativePathForVfs);
              AppLogger.info('Setting entries for FE:', entries);
              if (!fileExplorerInstanceRef.current?.IsDestroyed?.()) {
                feFolder.SetEntries(entries);
              }
            } catch (e: any) {
              AppLogger.error('Error during onrefresh:', e);
              setError(`onrefresh error: ${e.message}`);
              if (!fileExplorerInstanceRef.current?.IsDestroyed?.()) {
                feFolder.SetEntries([]);
              }
            } finally {
              if (!fileExplorerInstanceRef.current?.IsDestroyed?.()) {
                feFolder.SetBusyRef(-1);
              }
            }
          },
          onopenfile: (feFolder: any, entry: ExplorerEntry) => {
            AppLogger.info('FileExplorer onopenfile:', { folderPath: feFolder.GetPath(), entry });
            setMessage(`File open requested: ${entry.name}`);
            // TODO: vfs.openFile logic here
          },
          onnewfolder: async (callback: (result: any) => void, feFolder: any) => {
            AppLogger.info('FE onnewfolder. Path from FE:', JSON.parse(JSON.stringify(feFolder.GetPath())));
            const folderName = prompt("Enter new folder name for " + feFolder.GetPath().slice(-1)[0][1] + ":");
            if (folderName) {
              try {
                AppLogger.log('User activation state before getDirectoryHandle:', navigator.userActivation);
                AppLogger.log('Document has focus:', document.hasFocus());

                const fePathSegments: [string, string, any][] = feFolder.GetPath();
                let parentActualDirHandle: FileSystemDirectoryHandle = dirHandle;
                
                if (fePathSegments.length > 0) {
                  for (let i = 0; i < fePathSegments.length; i++) {
                    const segmentId = fePathSegments[i][0];
                    const segmentName = fePathSegments[i][1];
                    if (i === 0 && segmentId === FE_ROOT_ID) {
                      parentActualDirHandle = dirHandle;
                    } else {
                      parentActualDirHandle = await parentActualDirHandle.getDirectoryHandle(segmentName);
                    }
                  }
                }
                AppLogger.info(`Attempting to create folder '${folderName}' in RFS directory '${parentActualDirHandle.name}'. FE Root ID: ${FE_ROOT_ID}`);
                await parentActualDirHandle.getDirectoryHandle(folderName, { create: true });
                AppLogger.info(`Folder created: ${folderName} in ${parentActualDirHandle.name}`);
                callback({ id: folderName, name: folderName, type: 'folder', hash: folderName });
                if (explorerOptions.onrefresh) {
                  await explorerOptions.onrefresh(feFolder, false);
                }
              } catch(e:any) {
                AppLogger.error('Error creating folder:', e);
                setError(`Failed to create folder: ${e.message}`);
                callback(false);
              }
            } else {
              callback(false);
            }
          },
          ondelete: async (callback: (errorMsg: string | false) => void, feFolder: any, itemIds: string[]) => {
            AppLogger.info('FileExplorer ondelete', {folderPath: feFolder.GetPath(), itemIds});
            if (confirm(`Delete ${itemIds.join(', ')}?`)) {
              try {
                const fePathSegments: [string, string, any][] = feFolder.GetPath();
                let parentDirHandle: FileSystemDirectoryHandle = dirHandle;
                for (let i = 0; i < fePathSegments.length; i++) {
                  const segmentId = fePathSegments[i][0];
                  const segmentName = fePathSegments[i][1];
                  if (i === 0 && segmentId === FE_ROOT_ID) continue;
                  parentDirHandle = await parentDirHandle.getDirectoryHandle(segmentName);
                }
                for (const itemId of itemIds) {
                  await parentDirHandle.removeEntry(itemId, { recursive: true }); 
                  AppLogger.info(`Deleted: ${itemId} from ${parentDirHandle.name}`);
                }
                callback(false); 
                explorerOptions.onrefresh(feFolder, false);
              } catch (e:any) {
                AppLogger.error('Error deleting items:', e);
                setError(`Failed to delete: ${e.message}`);
                callback(e.message || 'Deletion failed');
              }
            } else {
              callback("Deletion cancelled by user.");
            }
          },
        };

        fileExplorerInstanceRef.current = new window.FileExplorer(fileExplorerContainerRef.current, explorerOptions);
        AppLogger.info('FileExplorer instance created.');

      } else if (!explorerLoaded) {
        setError('File explorer script not loaded yet.');
      }

    } catch (err: any) {
      AppLogger.error('Error selecting directory or initializing FileExplorer:', err);
      setError(`Error: ${err.message || 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <h2>File Explorer Test</h2>
      <p>
        Select a local directory to test the File Explorer integration with VFS/RFS.
      </p>
      {!explorerLoaded && <p>Loading file explorer assets...</p>}
      {error && <p style={{ color: 'red' }}>Error: {error}</p>}
      {message && <p style={{ color: 'green' }}>{message}</p>}
      
      {explorerLoaded && (
        <button onClick={handleSelectDirectory} disabled={isLoading}>
          {isLoading ? 'Loading...' : 'Select Directory & Initialize Explorer'}
        </button>
      )}

      {vfs && <p>Virtual File System is initialized. Root: {rfs?.getRootDirectory()?.name}</p>}
      
      <div ref={fileExplorerContainerRef} id="file-explorer-container" style={{ marginTop: '20px', border: '1px solid #ccc', minHeight: '400px', backgroundColor: '#f5f5f5' }}>
        {explorerLoaded && !vfs && <p style={{padding: '10px'}}>Select a directory to activate the file explorer.</p>}
      </div>
    </div>
  );
};

export default FileExplorerTest;
