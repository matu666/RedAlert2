import React, { useEffect, useRef, useState } from 'react';
// import { RealFileSystem } from '../data/vfs/RealFileSystem'; // Not directly used for IDB primary test
// import { VirtualFileSystem } from '../data/vfs/VirtualFileSystem'; // Not directly used for IDB primary test
import AppLogger from '../util/logger';
// import { FileNotFoundError } from '../data/vfs/FileNotFoundError';
import { RealFileSystemDir } from '../data/vfs/RealFileSystemDir'; // Import RealFileSystemDir
import { RealFileSystem } from '../data/vfs/RealFileSystem'; // Import RealFileSystem
import { VirtualFileSystem } from '../data/vfs/VirtualFileSystem'; // Import VirtualFileSystem
import { VirtualFile } from '../data/vfs/VirtualFile'; // For type checking if needed

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
  // const [rfs, setRfs] = useState<RealFileSystem | null>(null); // Keep for later, focus on direct IDB
  // const [vfs, setVfs] = useState<VirtualFileSystem | null>(null); // Keep for later
  const [isLoading, setIsLoading] = useState(false);
  const [explorerLoaded, setExplorerLoaded] = useState(false);
  const [fsalibLoaded, setFsalibLoaded] = useState(false); 
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const fileExplorerContainerRef = useRef<HTMLDivElement>(null);
  const fileExplorerInstanceRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null); 

  const [currentRootHandle, setCurrentRootHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [currentFsName, setCurrentFsName] = useState<string | null>(null); 
  const [currentFsType, setCurrentFsType] = useState<'local' | 'idb' | null>(null);
  const [currentFePathSegments, setCurrentFePathSegments] = useState<[string, string, any][] | null>(null);


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
      if (window.FileSystemAccess && window.FileSystemAccess.adapters?.indexeddb) {
        AppLogger.info('fsalib seems to be loaded.');
        setFsalibLoaded(true);
      } else {
        AppLogger.warn('fsalib not immediately available. Will check again shortly.');
        setTimeout(() => {
            if (window.FileSystemAccess && window.FileSystemAccess.adapters?.indexeddb) {
                AppLogger.info('fsalib became available after a short delay.');
                setFsalibLoaded(true);
            } else {
                AppLogger.error('fsalib still not available. IndexedDB functionality will fail.');
                setError('fsalib.min.js (FileSystemAccess polyfill) not loaded. IndexedDB features unavailable.');
            }
        }, 1000);
      }
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
        AppLogger.info('Destroying FileExplorer instance during cleanup or root change.');
        fileExplorerInstanceRef.current.Destroy();
        fileExplorerInstanceRef.current = null;
      }
    };
  }, [currentRootHandle]); 

  const getEntriesFromDirHandle = async (dirHandle: FileSystemDirectoryHandle): Promise<ExplorerEntry[]> => {
    const entries: ExplorerEntry[] = [];
    try {
      AppLogger.debug(`(${currentFsType || 'fs'}) Reading entries from dirHandle: ${dirHandle.name}, kind: ${dirHandle.kind}`);
      let count = 0;
      for await (const [name, handle] of dirHandle.entries()) {
        count++;
        AppLogger.debug(`(${currentFsType || 'fs'}) Entry found - Name: ${name}, Kind: ${handle.kind}`);
        // Potentially filter out unwanted entries if fsalib adds hidden/meta ones for IDB
        // For example, if (name === '.' || name === '..') continue;
        
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

  const initializeFileExplorer = (rootHandle: FileSystemDirectoryHandle, fsName: string, fsType: 'local' | 'idb') => {
    if (fileExplorerInstanceRef.current && typeof fileExplorerInstanceRef.current.Destroy === 'function') {
      fileExplorerInstanceRef.current.Destroy();
      fileExplorerInstanceRef.current = null;
    }
    
    setCurrentRootHandle(rootHandle);
    setCurrentFsName(fsName);
    setCurrentFsType(fsType);
    setCurrentFePathSegments(null); // Reset path when root changes
    setMessage(`${fsName} File Explorer Initialized. Root: ${rootHandle.name}`);

    if (window.FileExplorer && fileExplorerContainerRef.current) {
      const FE_ROOT_ID = `__explorer_root_${fsType}__`;
      const rootDisplayName = rootHandle.name || (fsType === 'idb' ? 'IndexedDB' : 'Root');
      const initialPathSegments: [string, string, any][] = [[FE_ROOT_ID, rootDisplayName, { canmodify: true }]];
      setCurrentFePathSegments(initialPathSegments);

      const explorerOptions = {
        initpath: initialPathSegments,
        onrefresh: async (feFolder: any, isFirstLoad: boolean) => {
          AppLogger.info(`FE onrefresh (${fsType}). Path from FE:`, JSON.parse(JSON.stringify(feFolder.GetPath())), `Is first load: ${isFirstLoad}`);
          if (!rootHandle) { 
            AppLogger.error('onrefresh called but rootHandle for this instance (from closure) is null.');
            feFolder.SetEntries([]);
            feFolder.SetBusyRef(-1);
            return;
          }
          feFolder.SetBusyRef(1);
          let entries: ExplorerEntry[] = [];
          let currentActualDirHandle: FileSystemDirectoryHandle = rootHandle; 

          try {
            const fePath: [string, string, any][] = feFolder.GetPath();
            setCurrentFePathSegments(fePath);

            for (let i = 0; i < fePath.length; i++) {
              const segmentId = fePath[i][0];
              const segmentName = fePath[i][1];
              if (i === 0 && segmentId === FE_ROOT_ID) {
                currentActualDirHandle = rootHandle;
              } else if (segmentName && segmentName !== (rootHandle.name || (fsType === 'idb' ? 'IndexedDB' : 'Root'))) {
                currentActualDirHandle = await currentActualDirHandle.getDirectoryHandle(segmentName);
              } else if (segmentName && segmentName === (rootHandle.name || (fsType === 'idb' ? 'IndexedDB' : 'Root')) && currentActualDirHandle === rootHandle && !rootHandle.name) {
                // If current is the empty-named root, and segment is its display name, stay on rootHandle
                // This handles the case where root is "" but displayed as "IndexedDB"
              } else if (segmentName) {
                currentActualDirHandle = await currentActualDirHandle.getDirectoryHandle(segmentName);
              }
            }
            AppLogger.info(`(${fsType}) Resolved handle for refresh to: ${currentActualDirHandle.name}`);

            entries = await getEntriesFromDirHandle(currentActualDirHandle);
            AppLogger.info(`(${fsType}) Setting entries for FE:`, entries);
            if (!fileExplorerInstanceRef.current?.IsDestroyed?.()) {
              feFolder.SetEntries(entries);
            }
          } catch (e: any) {
            AppLogger.error(`(${fsType}) Error during onrefresh (Path: ${currentActualDirHandle?.name}):`, e);
            setError(`onrefresh error (${fsType} - ${currentActualDirHandle?.name || 'unknown dir'}): ${e.message}`);
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
          setCurrentFePathSegments(feFolder.GetPath());
          AppLogger.info(`(${fsType}) FileExplorer onopenfile:`, { folderPath: feFolder.GetPath(), entry });
          setMessage(`(${fsType}) File open requested: ${entry.name}. Path: ${feFolder.GetPath().map((p: any) => p[1]).join('/')}/${entry.name}`);
          // TODO: Implement actual file opening logic
        },
        onnewfolder: async (callback: (result: any) => void, feFolder: any) => {
          AppLogger.info(`(${fsType}) FE onnewfolder. Path from FE:`, JSON.parse(JSON.stringify(feFolder.GetPath())));
          if (!rootHandle) { callback(false); return; }

          const currentPathForPrompt = feFolder.GetPath().map((p: any) => p[1]).join('/');
          const folderName = prompt(`Enter new folder name in "${currentPathForPrompt}":`);
          if (folderName) {
            let parentActualDirHandle: FileSystemDirectoryHandle = rootHandle;
            try {
              const fePath: [string, string, any][] = feFolder.GetPath();
              setCurrentFePathSegments(fePath);

              for (let i = 0; i < fePath.length; i++) {
                const segmentId = fePath[i][0];
                const segmentName = fePath[i][1];
                if (i === 0 && segmentId === FE_ROOT_ID) { parentActualDirHandle = rootHandle; }
                else { parentActualDirHandle = await parentActualDirHandle.getDirectoryHandle(segmentName); }
              }
              
              AppLogger.info(`(${fsType}) Attempting to create folder '${folderName}' in directory '${parentActualDirHandle.name}'.`);
              await parentActualDirHandle.getDirectoryHandle(folderName, { create: true });
              AppLogger.info(`(${fsType}) Folder created: ${folderName} in ${parentActualDirHandle.name}`);
              callback({ id: folderName, name: folderName, type: 'folder', hash: folderName }); // Simplified hash
              if (explorerOptions.onrefresh) { // Refresh current view
                await explorerOptions.onrefresh(feFolder, false);
              }
            } catch(e:any) {
              AppLogger.error(`(${fsType}) Error creating folder '${folderName}' in '${parentActualDirHandle?.name}':`, e);
              setError(`(${fsType}) Failed to create folder: ${e.message}`);
              callback(false);
            }
          } else {
            callback(false);
          }
        },
        ondelete: async (callback: (errorMsg: string | false) => void, feFolder: any, itemIds: string[]) => {
          AppLogger.info(`(${fsType}) FileExplorer ondelete`, {folderPath: feFolder.GetPath(), itemIds});
          if (!rootHandle) { callback('Internal error: root handle not set.'); return; }

          const currentPathForConfirm = feFolder.GetPath().map((p: any) => p[1]).join('/');
          if (confirm(`Delete ${itemIds.join(', ')} from ${fsName} path "${currentPathForConfirm}"?`)) {
            let parentDirHandle: FileSystemDirectoryHandle = rootHandle;
            try {
              const fePath: [string, string, any][] = feFolder.GetPath();
              setCurrentFePathSegments(fePath);
              for (let i = 0; i < fePath.length; i++) {
                const segmentId = fePath[i][0];
                const segmentName = fePath[i][1];
                if (i === 0 && segmentId === FE_ROOT_ID) { parentDirHandle = rootHandle; }
                else { parentDirHandle = await parentDirHandle.getDirectoryHandle(segmentName); }
              }

              for (const itemId of itemIds) {
                await parentDirHandle.removeEntry(itemId, { recursive: true }); 
                AppLogger.info(`(${fsType}) Deleted: ${itemId} from ${parentDirHandle.name}`);
              }
              callback(false); 
              if (explorerOptions.onrefresh) { // Refresh current view
                 await explorerOptions.onrefresh(feFolder, false);
              }
            } catch (e:any) {
              AppLogger.error(`(${fsType}) Error deleting items from '${parentDirHandle?.name}':`, e);
              setError(`(${fsType}) Failed to delete: ${e.message}`);
              callback(e.message || `(${fsType}) Deletion failed`);
            }
          } else {
            callback("Deletion cancelled by user.");
          }
        },
        // Add other callbacks like onrename, ondownload if FileExplorer.js supports them and we need them
      };

      fileExplorerInstanceRef.current = new window.FileExplorer(fileExplorerContainerRef.current, explorerOptions);
      AppLogger.info(`(${fsType}) FileExplorer instance created for ${fsName}.`);

    } else if (!explorerLoaded) {
      setError('File explorer script not loaded yet. Cannot initialize.');
    } else if (!fileExplorerContainerRef.current) {
      setError('File explorer container not available. Cannot initialize.');
    }
  };

  const handleSelectDirectory = async () => {
    setError(null); setMessage(null); setIsLoading(true);
    if (!window.showDirectoryPicker) {
      setError('File System Access API (showDirectoryPicker) is not supported.');
      setIsLoading(false); return;
    }
    try {
      const dirHandle = await window.showDirectoryPicker();
      AppLogger.info('Local directory selected:', dirHandle.name);
      // const realFs = new RealFileSystem(); // We are not using RealFileSystem/VFS for this direct test
      // setRfs(realFs.addRootDirectoryHandle(dirHandle) ? realFs : null);
      initializeFileExplorer(dirHandle, `Local Directory (${dirHandle.name})`, 'local');
    } catch (err: any) {
      AppLogger.error('Error selecting local directory:', err);
      if (err.name !== 'AbortError') {
        setError(`Error selecting local directory: ${err.message || 'User cancelled or error'}`);
      }
    } finally { setIsLoading(false); }
  };

  const handleInitializeIdbExplorer = async () => {
    setError(null); setMessage(null); setIsLoading(true);
    if (!fsalibLoaded || !window.FileSystemAccess || !window.FileSystemAccess.adapters?.indexeddb) {
      setError('fsalib.min.js is not loaded. Cannot initialize IndexedDB explorer.');
      AppLogger.error('Attempted to init IDB explorer but fsalib is not ready.');
      setIsLoading(false); return;
    }
    try {
      AppLogger.info('Initializing IndexedDB file system adapter...');
      const dbName = "ra2webUserFileSystem"; // Or some other unique name
      const idbRootHandle = await window.FileSystemAccess.adapters.indexeddb({ name: dbName, rootName: "IndexedDB" });
      AppLogger.info('IndexedDB adapter obtained, root handle:', idbRootHandle);
      if (!idbRootHandle || typeof idbRootHandle.getDirectoryHandle !== 'function') {
         AppLogger.error('IndexedDB adapter did not return a valid directory handle.', idbRootHandle);
         setError('Failed to get a valid root handle from IndexedDB adapter.');
         setIsLoading(false); return;
      }
      initializeFileExplorer(idbRootHandle, `IndexedDB (${dbName})`, 'idb');

      // --- Direct fsalib Handle Test (after page refresh/re-init) ---
      if (idbRootHandle) {
        AppLogger.info('[FSALIB_TEST] Starting direct fsalib handle test...');
        const filesToTest = ["test.ini", "test.mix", "TEST.INI", "TEST.MIX"];
        for (const fname of filesToTest) {
          try {
            AppLogger.info(`[FSALIB_TEST] Attempting idbRootHandle.getFileHandle("${fname}")`);
            const handle = await idbRootHandle.getFileHandle(fname);
            AppLogger.info(`[FSALIB_TEST] SUCCESS: Got handle for "${handle.name}" when querying for "${fname}"`);
          } catch (e: any) {
            AppLogger.error(`[FSALIB_TEST] FAILED: Error getting handle for "${fname}": ${e.name} - ${e.message}`);
          }
        }
        AppLogger.info('[FSALIB_TEST] Listing all entries directly from idbRootHandle:');
        try {
          for await (const [name, handleValue] of idbRootHandle.entries()) { // Renamed handle to handleValue
            AppLogger.info(`[FSALIB_TEST]   - Entry: Name: "${name}", Kind: ${handleValue.kind}`);
          }
        } catch(e:any) {
            AppLogger.error(`[FSALIB_TEST] Error listing entries from idbRootHandle: ${e.message}`, e);
        }
        AppLogger.info('[FSALIB_TEST] Finished direct fsalib handle test.');
      }
      // --- End of Direct fsalib Handle Test ---

      // --- VFS Integration Test Code --- 
      if (idbRootHandle) {
        AppLogger.info('[VFS_TEST] Starting VFS integration test with IDB root handle...');
        try {
          AppLogger.info('[VFS_TEST] Please ensure "test.ini" and "test.mix" are uploaded to the IDB root for full testing.');

          const rfs = new RealFileSystem();
          rfs.addRootDirectoryHandle(idbRootHandle); 
          AppLogger.info('[VFS_TEST] RealFileSystem created and IDB root handle added (caseSensitive=true).');

          const vfs = new VirtualFileSystem(rfs, AppLogger);
          AppLogger.info('[VFS_TEST] VirtualFileSystem instance created.');

          // Test 1: vfs.fileExists
          const iniExists = vfs.fileExists("test.ini");
          AppLogger.info(`[VFS_TEST] vfs.fileExists("test.ini"): ${iniExists}`);
          const mixExists = vfs.fileExists("test.mix");
          AppLogger.info(`[VFS_TEST] vfs.fileExists("test.mix"): ${mixExists}`);
          const nonExistentExists = vfs.fileExists("nonexistent.file");
          AppLogger.info(`[VFS_TEST] vfs.fileExists("nonexistent.file"): ${nonExistentExists}`);

          // Test 2: vfs.openFile for INI
          if (iniExists) {
            try {
              const virtualIni = vfs.openFile("test.ini");
              AppLogger.info(`[VFS_TEST] vfs.openFile("test.ini") success. Name: ${virtualIni.filename}, Size: ${virtualIni.getSize()}, Stream Pos: ${virtualIni.stream.position}`);
            } catch (e:any) {
              AppLogger.error('[VFS_TEST] Error opening "test.ini" via VFS:', e.message);
            }
          } else {
            AppLogger.warn('[VFS_TEST] Skipping vfs.openFile("test.ini") because file does not exist according to vfs.fileExists.');
          }

          // Test 3: vfs.loadStandaloneFiles (will try to load test.ini into mem.archive)
          AppLogger.info('[VFS_TEST] Attempting vfs.loadStandaloneFiles()...');
          await vfs.loadStandaloneFiles();
          if (vfs.hasArchive("mem.archive")) {
            AppLogger.info('[VFS_TEST] mem.archive found after loadStandaloneFiles().');
            try {
                const iniFromMem = vfs.openFile("test.ini"); // Should pick from mem.archive if present
                AppLogger.info(`[VFS_TEST] Re-opened "test.ini" (presumably from mem.archive). Name: ${iniFromMem.filename}, Size: ${iniFromMem.getSize()}`);
            } catch (e:any) {
                 AppLogger.error('[VFS_TEST] Error re-opening "test.ini" after loadStandaloneFiles:', e.message);
            }
          } else {
            AppLogger.warn('[VFS_TEST] mem.archive NOT found after loadStandaloneFiles().');
          }

          // Test 4: vfs.addMixFile
          if (mixExists) {
            AppLogger.info('[VFS_TEST] Attempting vfs.addMixFile("test.mix")...');
            await vfs.addMixFile("test.mix");
            if (vfs.hasArchive("test.mix")) {
              AppLogger.info('[VFS_TEST] "test.mix" successfully added to VFS archives.');
              const hypotheticalFile = "entry.shp";
              try {
                const fileFromMix = vfs.openFile(hypotheticalFile);
                AppLogger.info(`[VFS_TEST] Successfully opened "${hypotheticalFile}" from "test.mix". Size: ${fileFromMix.getSize()}`);
              } catch (e:any) {
                if (e.message.includes('not found')) { 
                    AppLogger.info(`[VFS_TEST] "${hypotheticalFile}" correctly not found in "test.mix" (or test.mix is empty/doesn't contain it).`);
                } else {
                    AppLogger.error(`[VFS_TEST] Error opening "${hypotheticalFile}" from "test.mix":`, e.message);
                }
              }
            } else {
              AppLogger.warn('[VFS_TEST] "test.mix" NOT added to VFS archives. Check for errors during addMixFile.');
            }
          } else {
            AppLogger.warn('[VFS_TEST] Skipping vfs.addMixFile("test.mix") because file does not exist according to vfs.fileExists.');
          }

        } catch (testError: any) {
          AppLogger.error('[VFS_TEST] Error during VFS integration test:', testError);
        }
        AppLogger.info('[VFS_TEST] Finished VFS integration test.');
      }
      // --- End of VFS Integration Test Code ---

    } catch (err: any) {
      AppLogger.error('Error initializing IndexedDB FileExplorer:', err);
      setError(`Error initializing IndexedDB: ${err.message || 'Unknown error'}`);
    } finally { setIsLoading(false); }
  };

  const handleFileUpload = async () => {
    if (!fileInputRef.current || !fileInputRef.current.files || fileInputRef.current.files.length === 0) {
      setMessage('Please select a file to upload.');
      return;
    }
    if (!currentRootHandle || currentFsType !== 'idb') {
      setError('File upload is only supported for the IndexedDB file system. Please initialize it first.');
      return;
    }

    const file = fileInputRef.current.files[0];
    setIsLoading(true);
    setMessage(`Uploading ${file.name}...`);
    setError(null);

    try {
      let targetDirHandle: FileSystemDirectoryHandle = currentRootHandle;
      const fePath = currentFePathSegments; // Use the stored path from onrefresh/onopenfile etc.
      const FE_ROOT_ID = `__explorer_root_${currentFsType}__`;
      const fsType = currentFsType; // For use in root name comparison

      if (fePath && fePath.length > 0 && currentRootHandle) {
        for (let i = 0; i < fePath.length; i++) {
          const segmentId = fePath[i][0];
          const segmentName = fePath[i][1];
          if (i === 0 && segmentId === FE_ROOT_ID) {
            targetDirHandle = currentRootHandle; 
          }
          // Adjust similar to onrefresh for empty rootHandle.name case
          else if (segmentName && segmentName !== (currentRootHandle.name || (fsType === 'idb' ? 'IndexedDB' : 'Root'))) {
            targetDirHandle = await targetDirHandle.getDirectoryHandle(segmentName, { create: false });
          } else if (segmentName && segmentName === (currentRootHandle.name || (fsType === 'idb' ? 'IndexedDB' : 'Root')) && targetDirHandle === currentRootHandle && !currentRootHandle.name) {
            // Stay on root handle
          } else if (segmentName) {
            targetDirHandle = await targetDirHandle.getDirectoryHandle(segmentName, { create: false });
          }
        }
      }
      
      AppLogger.info(`Upload: Resolved target directory in IDB: ${targetDirHandle.name} (actual name: '${targetDirHandle.name}') for file ${file.name}`);
      const newFileHandle = await targetDirHandle.getFileHandle(file.name, { create: true });
      const writable = await newFileHandle.createWritable({ keepExistingData: false });
      await writable.write(file);
      await writable.close();
      setMessage(`File ${file.name} uploaded successfully to ${targetDirHandle.name || 'root'}!`);
      AppLogger.info(`File ${file.name} written to IndexedDB path: ${fePath ? fePath.map(p=>p[1]).join('/') : (currentRootHandle?.name || 'root')}`);

      if (targetDirHandle && file && file.name) {
        try {
          AppLogger.info(`[DIAGNOSTIC] Immediately after writing "${file.name}", attempting targetDirHandle.getFileHandle("${file.name}")`);
          const checkHandle = await targetDirHandle.getFileHandle(file.name);
          AppLogger.info(`[DIAGNOSTIC] Successfully got handle for "${checkHandle.name}" immediately after write.`);
          if (checkHandle.name !== file.name) {
            AppLogger.warn(`[DIAGNOSTIC] !!! Name mismatch: Original was "${file.name}", handle name is "${checkHandle.name}"`);
          }
        } catch (e:any) {
          AppLogger.error(`[DIAGNOSTIC] Error getting handle for "${file.name}" immediately after write: ${e.message}`, e);
        }
      }

      // Force refresh by re-initializing the FileExplorer
      if (currentRootHandle && currentFsName && currentFsType) {
        AppLogger.info('Force refreshing FileExplorer by re-initializing after upload...');
        initializeFileExplorer(currentRootHandle, currentFsName, currentFsType);
      } else {
        AppLogger.warn('Could not force refresh FileExplorer: missing currentRootHandle, currentFsName, or currentFsType.');
      }

      if (fileInputRef.current) fileInputRef.current.value = ''; // Clear file input

    } catch (e: any) {
      AppLogger.error(`Error uploading file ${file.name}:`, e);
      setError(`Failed to upload ${file.name}: ${e.message}`);
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
        <div style={{ marginBottom: '10px' }}>
          <button onClick={handleSelectDirectory} disabled={isLoading || !explorerLoaded} style={{ marginRight: '10px' }}>
            {isLoading && currentFsType !== 'idb' ? 'Loading...' : 'Select Local Directory'}
          </button>
          <button onClick={handleInitializeIdbExplorer} disabled={isLoading || !explorerLoaded || !fsalibLoaded}>
            {isLoading && currentFsType === 'idb' ? 'Loading...' : (fsalibLoaded ? 'Initialize IndexedDB Explorer' : 'Loading fsalib...')}
          </button>
        </div>
      )}

      {currentRootHandle && (
        <div style={{ marginTop: '10px', marginBottom: '10px', padding: '10px', border: '1px solid #eee'}}>
          <p><b>{currentFsName}</b> is initialized. Root: <b>{currentRootHandle.name}</b></p>
          {currentFsType === 'idb' && explorerLoaded && (
            <div>
              <input type="file" ref={fileInputRef} style={{ marginRight: '10px' }} />
              <button onClick={handleFileUpload} disabled={isLoading || !currentRootHandle}>
                {isLoading ? 'Uploading...' : 'Upload File to Current IDB Directory'}
              </button>
            </div>
          )}
        </div>
      )}
      
      <div ref={fileExplorerContainerRef} id="file-explorer-container" style={{ marginTop: '20px', border: '1px solid #ccc', minHeight: '400px', backgroundColor: '#f5f5f5' }}>
        {explorerLoaded && !currentRootHandle && <p style={{padding: '10px'}}>Select a local directory or initialize IndexedDB to activate the file explorer.</p>}
        {!explorerLoaded && <p style={{padding: '10px'}}>Loading File Explorer component...</p>} 
      </div>
    </div>
  );
};

export default FileExplorerTest;
