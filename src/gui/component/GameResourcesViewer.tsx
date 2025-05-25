import React, { useEffect, useRef, useState } from 'react';
import { Engine } from '../../engine/Engine';
import AppLogger from '../../util/logger';

// Global types are defined in src/types/global.d.ts

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

interface VFSArchiveInfo {
  name: string;
  fileCount: number;
  handle?: any;
}

const GameResourcesViewer: React.FC = () => {
  const [explorerLoaded, setExplorerLoaded] = useState(false);
  const [fsalibLoaded, setFsalibLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [currentMode, setCurrentMode] = useState<'vfs' | 'rfs' | null>(null);
  const [vfsArchives, setVfsArchives] = useState<VFSArchiveInfo[]>([]);
  const [idbRootHandle, setIdbRootHandle] = useState<FileSystemDirectoryHandle | null>(null);

  const fileExplorerContainerRef = useRef<HTMLDivElement>(null);
  const fileExplorerInstanceRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Load file-explorer assets
    const cssLink = document.createElement('link');
    cssLink.href = '/other/file-explorer.css';
    cssLink.rel = 'stylesheet';
    cssLink.type = 'text/css';
    document.head.appendChild(cssLink);

    const script = document.createElement('script');
    script.src = '/other/file-explorer.js';
    script.async = true;
    script.onload = () => {
      AppLogger.info('[GameResourcesViewer] file-explorer.js loaded');
      setExplorerLoaded(true);
      if (window.FileSystemAccess && window.FileSystemAccess.adapters?.indexeddb) {
        AppLogger.info('[GameResourcesViewer] fsalib available');
        setFsalibLoaded(true);
      } else {
        AppLogger.warn('[GameResourcesViewer] fsalib not immediately available, checking...');
        setTimeout(() => {
          if (window.FileSystemAccess && window.FileSystemAccess.adapters?.indexeddb) {
            AppLogger.info('[GameResourcesViewer] fsalib became available');
            setFsalibLoaded(true);
          } else {
            AppLogger.error('[GameResourcesViewer] fsalib still not available');
            setError('fsalib.min.js not loaded. IndexedDB features unavailable.');
          }
        }, 1000);
      }
    };
    script.onerror = () => {
      AppLogger.error('[GameResourcesViewer] Failed to load file-explorer.js');
      setError('Failed to load file-explorer.js.');
    };
    document.body.appendChild(script);

    // Check VFS status on mount
    loadVFSInfo();

    return () => {
      document.head.removeChild(cssLink);
      document.body.removeChild(script);
      if (fileExplorerInstanceRef.current && typeof fileExplorerInstanceRef.current.Destroy === 'function') {
        fileExplorerInstanceRef.current.Destroy();
        fileExplorerInstanceRef.current = null;
      }
    };
  }, []);

  const loadVFSInfo = () => {
    if (Engine.vfs) {
      const archives = Engine.vfs.listArchives();
      const archiveInfos: VFSArchiveInfo[] = archives.map(archiveName => ({
        name: archiveName,
        fileCount: 0, // VFS doesn't directly expose file count
      }));
      setVfsArchives(archiveInfos);
      AppLogger.info('[GameResourcesViewer] VFS archives loaded:', archiveInfos);
    } else {
      AppLogger.warn('[GameResourcesViewer] VFS not available');
      setVfsArchives([]);
    }
  };

  const getVFSEntriesForArchive = async (archiveName: string): Promise<ExplorerEntry[]> => {
    const entries: ExplorerEntry[] = [];
    
    if (!Engine.vfs) {
      AppLogger.error('[GameResourcesViewer] VFS not available for archive browsing');
      return entries;
    }

    try {
      // This is a simplified approach - in a real implementation, we'd need
      // to enhance VFS to provide directory listing capabilities
      AppLogger.info(`[GameResourcesViewer] Attempting to browse VFS archive: ${archiveName}`);
      
      // For now, we'll create a placeholder entry indicating this is a VFS archive
      entries.push({
        id: `${archiveName}_info`,
        name: `${archiveName} (VFS Archive)`,
        type: 'file',
        hash: `vfs_${archiveName}`,
        attrs: { canmodify: false },
        tooltip: `Virtual File System Archive: ${archiveName}`,
      });

      // TODO: Implement proper VFS directory browsing
      // This would require extending the VFS interface to expose file listings
      
    } catch (e: any) {
      AppLogger.error(`[GameResourcesViewer] Error browsing VFS archive ${archiveName}:`, e);
    }

    return entries;
  };

  const getIDBEntries = async (dirHandle: FileSystemDirectoryHandle): Promise<ExplorerEntry[]> => {
    const entries: ExplorerEntry[] = [];
    
    try {
      AppLogger.debug(`[GameResourcesViewer] Reading IDB entries from: ${dirHandle.name}`);
      
      for await (const [name, handle] of dirHandle.entries()) {
        AppLogger.debug(`[GameResourcesViewer] IDB entry found - Name: ${name}, Kind: ${handle.kind}`);
        
        const fileHandle = handle as FileSystemFileHandle;
        const itemFile = handle.kind === 'file' ? await fileHandle.getFile() : null;
        
        const entry: ExplorerEntry = {
          id: name,
          name: name,
          type: handle.kind === 'directory' ? 'folder' : 'file',
          hash: name + (itemFile ? itemFile.lastModified : 'folder') + (itemFile ? itemFile.size : ''),
          size: itemFile?.size,
          attrs: { canmodify: true },
          tooltip: handle.kind === 'file' ? `File: ${name} (${formatFileSize(itemFile?.size || 0)})` : `Folder: ${name}`,
        };
        entries.push(entry);
      }
    } catch (e: any) {
      AppLogger.error(`[GameResourcesViewer] Error reading IDB entries:`, e);
      setError(`Error reading directory: ${e.message}`);
    }

    return entries.sort((a, b) => {
      if (a.type === b.type) return a.name.localeCompare(b.name);
      return a.type === 'folder' ? -1 : 1;
    });
  };

  const initializeVFSExplorer = async () => {
    if (!explorerLoaded) {
      setError('File explorer not loaded yet');
      return;
    }

    setError(null);
    setMessage(null);
    setIsLoading(true);

    try {
      if (fileExplorerInstanceRef.current) {
        fileExplorerInstanceRef.current.Destroy();
        fileExplorerInstanceRef.current = null;
      }

      setCurrentMode('vfs');
      setMessage('VFS Resource Explorer Initialized');

      if (window.FileExplorer && fileExplorerContainerRef.current) {
        const explorerOptions = {
          initpath: [['__vfs_root__', 'Virtual File System', { canmodify: false }]],
          onrefresh: async (feFolder: any, isFirstLoad: boolean) => {
            AppLogger.info('[GameResourcesViewer] VFS onrefresh', feFolder.GetPath());
            feFolder.SetBusyRef(1);
            
            try {
              const path = feFolder.GetPath();
              let entries: ExplorerEntry[] = [];

              if (path.length === 1 && path[0][0] === '__vfs_root__') {
                // Root level - show VFS archives
                entries = vfsArchives.map(archive => ({
                  id: archive.name,
                  name: archive.name,
                  type: 'folder' as const,
                  hash: `vfs_archive_${archive.name}`,
                  attrs: { canmodify: false },
                  tooltip: `VFS Archive: ${archive.name}`,
                }));
              } else if (path.length === 2) {
                // Archive level - show archive contents
                const archiveName = path[1][1];
                entries = await getVFSEntriesForArchive(archiveName);
              }

              feFolder.SetEntries(entries);
            } catch (e: any) {
              AppLogger.error('[GameResourcesViewer] VFS onrefresh error:', e);
              feFolder.SetEntries([]);
            } finally {
              feFolder.SetBusyRef(-1);
            }
          },
          onopenfile: (feFolder: any, entry: ExplorerEntry) => {
            AppLogger.info('[GameResourcesViewer] VFS file open:', entry);
            setMessage(`VFS File: ${entry.name} (${entry.tooltip || 'No details available'})`);
          }
        };

        fileExplorerInstanceRef.current = new window.FileExplorer(fileExplorerContainerRef.current, explorerOptions);
        AppLogger.info('[GameResourcesViewer] VFS FileExplorer created');
      }
    } catch (err: any) {
      AppLogger.error('[GameResourcesViewer] Error initializing VFS explorer:', err);
      setError(`VFS Explorer Error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const initializeIDBExplorer = async () => {
    if (!explorerLoaded || !fsalibLoaded) {
      setError('File explorer or fsalib not loaded');
      return;
    }

    setError(null);
    setMessage(null);
    setIsLoading(true);

    try {
      AppLogger.info('[GameResourcesViewer] Initializing IndexedDB explorer...');
      const dbName = "ra2webUserFileSystem";
      const rootHandle = await window.FileSystemAccess.adapters.indexeddb({ name: dbName, rootName: "Game Resources" });
      
      if (!rootHandle || typeof rootHandle.getDirectoryHandle !== 'function') {
        throw new Error('Failed to get valid IndexedDB root handle');
      }

      setIdbRootHandle(rootHandle);
      setCurrentMode('rfs');
      setMessage('IndexedDB Resource Explorer Initialized');

      if (fileExplorerInstanceRef.current) {
        fileExplorerInstanceRef.current.Destroy();
        fileExplorerInstanceRef.current = null;
      }

      if (window.FileExplorer && fileExplorerContainerRef.current) {
        const explorerOptions = {
          initpath: [['__idb_root__', 'Game Resources', { canmodify: true }]],
          onrefresh: async (feFolder: any, isFirstLoad: boolean) => {
            AppLogger.info('[GameResourcesViewer] IDB onrefresh', feFolder.GetPath());
            feFolder.SetBusyRef(1);
            
            try {
              let currentDirHandle = rootHandle;
              const path = feFolder.GetPath();
              
              // Navigate to current path
              for (let i = 1; i < path.length; i++) {
                const segmentName = path[i][1];
                currentDirHandle = await currentDirHandle.getDirectoryHandle(segmentName);
              }
              
              const entries = await getIDBEntries(currentDirHandle);
              feFolder.SetEntries(entries);
            } catch (e: any) {
              AppLogger.error('[GameResourcesViewer] IDB onrefresh error:', e);
              feFolder.SetEntries([]);
            } finally {
              feFolder.SetBusyRef(-1);
            }
          },
          onopenfile: (feFolder: any, entry: ExplorerEntry) => {
            AppLogger.info('[GameResourcesViewer] IDB file open:', entry);
            setMessage(`File: ${entry.name} (${formatFileSize(entry.size || 0)})`);
          },
          onnewfolder: async (callback: (result: any) => void, feFolder: any) => {
            const folderName = prompt('Enter new folder name:');
            if (folderName) {
              try {
                let currentDirHandle = rootHandle;
                const path = feFolder.GetPath();
                
                for (let i = 1; i < path.length; i++) {
                  const segmentName = path[i][1];
                  currentDirHandle = await currentDirHandle.getDirectoryHandle(segmentName);
                }
                
                await currentDirHandle.getDirectoryHandle(folderName, { create: true });
                callback({ id: folderName, name: folderName, type: 'folder', hash: folderName });
              } catch (e: any) {
                AppLogger.error('[GameResourcesViewer] Error creating folder:', e);
                callback(false);
              }
            } else {
              callback(false);
            }
          },
          ondelete: async (callback: (errorMsg: string | false) => void, feFolder: any, itemIds: string[]) => {
            if (confirm(`Delete ${itemIds.join(', ')}?`)) {
              try {
                let currentDirHandle = rootHandle;
                const path = feFolder.GetPath();
                
                for (let i = 1; i < path.length; i++) {
                  const segmentName = path[i][1];
                  currentDirHandle = await currentDirHandle.getDirectoryHandle(segmentName);
                }
                
                for (const itemId of itemIds) {
                  await currentDirHandle.removeEntry(itemId, { recursive: true });
                }
                callback(false);
              } catch (e: any) {
                AppLogger.error('[GameResourcesViewer] Error deleting items:', e);
                callback(e.message);
              }
            } else {
              callback('Deletion cancelled');
            }
          }
        };

        fileExplorerInstanceRef.current = new window.FileExplorer(fileExplorerContainerRef.current, explorerOptions);
        AppLogger.info('[GameResourcesViewer] IDB FileExplorer created');
      }
    } catch (err: any) {
      AppLogger.error('[GameResourcesViewer] Error initializing IDB explorer:', err);
      setError(`IDB Explorer Error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async () => {
    if (!fileInputRef.current?.files?.length || !idbRootHandle) {
      setMessage('Please select a file and initialize IndexedDB explorer first');
      return;
    }

    const file = fileInputRef.current.files[0];
    setIsLoading(true);
    setMessage(`Uploading ${file.name}...`);

    try {
      const fileHandle = await idbRootHandle.getFileHandle(file.name, { create: true });
      const writable = await fileHandle.createWritable({ keepExistingData: false });
      await writable.write(file);
      await writable.close();
      
      setMessage(`File ${file.name} uploaded successfully!`);
      
      // Refresh the current view
      if (fileExplorerInstanceRef.current?.Refresh) {
        fileExplorerInstanceRef.current.Refresh();
      }
      
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err: any) {
      AppLogger.error('[GameResourcesViewer] Upload error:', err);
      setError(`Upload failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const getSystemStatus = () => {
    const vfsStatus = Engine.vfs ? '✅ 已初始化' : '❌ 未初始化';
    const rfsStatus = Engine.rfs ? '✅ 已初始化' : '❌ 未初始化';
    const vfsArchiveCount = Engine.vfs ? Engine.vfs.listArchives().length : 0;
    
    return { vfsStatus, rfsStatus, vfsArchiveCount };
  };

  const { vfsStatus, rfsStatus, vfsArchiveCount } = getSystemStatus();

  return (
    <div style={{ 
      height: '100vh',
      overflow: 'auto',
      padding: '20px', 
      fontFamily: 'Arial, sans-serif',
      boxSizing: 'border-box'
    }}>
      <h1>RA2 Web - 游戏资源文件浏览器</h1>
      
      {/* System Status */}
      <div style={{ marginBottom: '20px' }}>
        <h2>系统状态</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
          <div style={{ padding: '10px', border: '1px solid #ccc', borderRadius: '5px' }}>
            <strong>虚拟文件系统 (VFS)</strong>
            <div>状态: {vfsStatus}</div>
            <div>归档数量: {vfsArchiveCount}</div>
          </div>
          
          <div style={{ padding: '10px', border: '1px solid #ccc', borderRadius: '5px' }}>
            <strong>真实文件系统 (RFS)</strong>
            <div>状态: {rfsStatus}</div>
          </div>

          <div style={{ padding: '10px', border: '1px solid #ccc', borderRadius: '5px' }}>
            <strong>文件浏览器</strong>
            <div>状态: {explorerLoaded ? '✅ 已加载' : '❌ 未加载'}</div>
            <div>IndexedDB: {fsalibLoaded ? '✅ 可用' : '❌ 不可用'}</div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div style={{ marginBottom: '20px' }}>
        <h2>文件浏览器控制</h2>
        <div style={{ marginBottom: '10px' }}>
          <button 
            onClick={initializeVFSExplorer} 
            disabled={!explorerLoaded || isLoading}
            style={{ 
              marginRight: '10px',
              padding: '10px 20px',
              backgroundColor: currentMode === 'vfs' ? '#007cba' : '#f0f0f0',
              color: currentMode === 'vfs' ? 'white' : 'black',
              border: '1px solid #ccc',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            浏览VFS资源
          </button>
          
          <button 
            onClick={initializeIDBExplorer} 
            disabled={!explorerLoaded || !fsalibLoaded || isLoading}
            style={{ 
              padding: '10px 20px',
              backgroundColor: currentMode === 'rfs' ? '#007cba' : '#f0f0f0',
              color: currentMode === 'rfs' ? 'white' : 'black',
              border: '1px solid #ccc',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            浏览IndexedDB资源
          </button>
        </div>

        {currentMode === 'rfs' && idbRootHandle && (
          <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#f0f0f0', borderRadius: '5px' }}>
            <input type="file" ref={fileInputRef} style={{ marginRight: '10px' }} />
            <button 
              onClick={handleFileUpload} 
              disabled={isLoading}
              style={{ 
                padding: '5px 15px',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '3px',
                cursor: 'pointer'
              }}
            >
              {isLoading ? '上传中...' : '上传文件到当前目录'}
            </button>
          </div>
        )}
      </div>

      {/* Messages */}
      {error && (
        <div style={{ 
          padding: '10px', 
          backgroundColor: '#ffebee', 
          color: '#c62828', 
          borderRadius: '5px', 
          marginBottom: '10px',
          border: '1px solid #ffcdd2'
        }}>
          错误: {error}
        </div>
      )}
      
      {message && (
        <div style={{ 
          padding: '10px', 
          backgroundColor: '#e8f5e8', 
          color: '#2e7d32', 
          borderRadius: '5px', 
          marginBottom: '10px',
          border: '1px solid #c8e6c9'
        }}>
          {message}
        </div>
      )}

      {/* File Explorer Container */}
      <div 
        ref={fileExplorerContainerRef} 
        style={{ 
          marginTop: '20px', 
          border: '2px solid #ccc', 
          borderRadius: '5px',
          minHeight: '500px', 
          backgroundColor: '#f9f9f9'
        }}
      >
        {!explorerLoaded && (
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <p>正在加载文件浏览器组件...</p>
          </div>
        )}
        {explorerLoaded && !currentMode && (
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <p>请选择要浏览的资源类型：</p>
            <ul style={{ textAlign: 'left', display: 'inline-block' }}>
              <li><strong>VFS资源</strong>: 浏览已加载的游戏归档文件 (.mix文件等)</li>
              <li><strong>IndexedDB资源</strong>: 浏览浏览器存储中的游戏文件</li>
            </ul>
          </div>
        )}
      </div>

      {/* Help Information */}
      <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f0f0f0', borderRadius: '5px' }}>
        <h3>使用说明</h3>
        <ul>
          <li><strong>VFS资源浏览</strong>: 查看已加载到虚拟文件系统的游戏归档文件</li>
          <li><strong>IndexedDB资源浏览</strong>: 管理浏览器存储中的游戏文件，支持上传、删除等操作</li>
          <li><strong>文件操作</strong>: 在IndexedDB模式下可以创建文件夹、上传文件、删除文件</li>
          <li><strong>调试工具</strong>: 此组件主要用于调试和资源管理，不是最终游戏界面</li>
        </ul>
      </div>
    </div>
  );
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export default GameResourcesViewer; 