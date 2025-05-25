import React, { useEffect, useState } from 'react';
import { Engine } from '../../engine/Engine';

interface GameResourcesViewerProps {}

interface ResourceInfo {
  type: 'VFS Archive' | 'VFS File' | 'RFS Directory' | 'RFS File';
  name: string;
  path: string;
  size?: number;
}

const GameResourcesViewer: React.FC<GameResourcesViewerProps> = () => {
  const [resources, setResources] = useState<ResourceInfo[]>([]);
  const [currentPath, setCurrentPath] = useState<string>('/');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadResources();
  }, [currentPath]);

  const loadResources = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const resourceList: ResourceInfo[] = [];
      
      // List VFS Archives
      if (Engine.vfs) {
        console.log('[GameResourcesViewer] VFS found, listing archives...');
        const archives = Engine.vfs.listArchives();
        console.log('[GameResourcesViewer] VFS archives:', archives);
        archives.forEach(archiveName => {
          resourceList.push({
            type: 'VFS Archive',
            name: archiveName,
            path: `/vfs/${archiveName}`
          });
        });
      } else {
        console.log('[GameResourcesViewer] No VFS found');
      }
      
      // List RFS Directories and Files
      if (Engine.rfs) {
        console.log('[GameResourcesViewer] RFS found, listing entries...');
        const rootDir = Engine.rfs.getRootDirectory();
        if (rootDir) {
          try {
            const entries = await rootDir.listEntries();
            console.log('[GameResourcesViewer] RFS entries:', entries);
            entries.forEach(entryName => {
              resourceList.push({
                type: 'RFS File',
                name: entryName,
                path: `/rfs/${entryName}`
              });
            });
          } catch (e) {
            console.warn('Failed to list RFS entries:', e);
          }
        }
      } else {
        console.log('[GameResourcesViewer] No RFS found');
      }
      
      console.log('[GameResourcesViewer] Total resources found:', resourceList.length);
      setResources(resourceList);
    } catch (err) {
      console.error('[GameResourcesViewer] Error loading resources:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleResourceClick = (resource: ResourceInfo) => {
    console.log('Resource clicked:', resource);
    // TODO: Implement resource viewing logic
  };

  const getSystemStatus = () => {
    const vfsStatus = Engine.vfs ? '✅ 已初始化' : '❌ 未初始化';
    const rfsStatus = Engine.rfs ? '✅ 已初始化' : '❌ 未初始化';
    const rulesStatus = (() => {
      try {
        Engine.getRules();
        return '✅ 已加载';
      } catch {
        return '❌ 未加载';
      }
    })();
    const artStatus = (() => {
      try {
        Engine.getArt();
        return '✅ 已加载';
      } catch {
        return '❌ 未加载';
      }
    })();

    return { vfsStatus, rfsStatus, rulesStatus, artStatus };
  };

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h2>加载游戏资源中...</h2>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: 'red' }}>
        <h2>错误</h2>
        <p>{error}</p>
      </div>
    );
  }

  const { vfsStatus, rfsStatus, rulesStatus, artStatus } = getSystemStatus();

  return (
    <div style={{ 
      height: '100vh',
      overflow: 'auto',
      padding: '20px', 
      fontFamily: 'Arial, sans-serif',
      boxSizing: 'border-box'
    }}>
      <h1>RA2 Web - 游戏资源浏览器</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <h2>系统状态</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
          <div style={{ padding: '10px', border: '1px solid #ccc', borderRadius: '5px' }}>
            <strong>虚拟文件系统 (VFS)</strong>
            <div>状态: {vfsStatus}</div>
            <div>归档数量: {Engine.vfs ? Engine.vfs.listArchives().length : 0}</div>
          </div>
          
          <div style={{ padding: '10px', border: '1px solid #ccc', borderRadius: '5px' }}>
            <strong>真实文件系统 (RFS)</strong>
            <div>状态: {rfsStatus}</div>
          </div>
          
          <div style={{ padding: '10px', border: '1px solid #ccc', borderRadius: '5px' }}>
            <strong>游戏规则</strong>
            <div>状态: {rulesStatus}</div>
          </div>
          
          <div style={{ padding: '10px', border: '1px solid #ccc', borderRadius: '5px' }}>
            <strong>艺术资源</strong>
            <div>状态: {artStatus}</div>
          </div>
        </div>
      </div>

      <div>
        <h2>游戏资源 ({resources.length} 项)</h2>
        
        {resources.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
            <p>没有找到游戏资源。</p>
            <p>请确保已正确导入 Red Alert 2 游戏文件。</p>
            <button 
              onClick={loadResources}
              style={{ 
                padding: '10px 20px', 
                fontSize: '16px',
                backgroundColor: '#007cba',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
                marginTop: '10px'
              }}
            >
              🔄 刷新资源列表
            </button>
          </div>
        ) : (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', 
            gap: '10px',
            marginBottom: '20px'
          }}>
            {resources.map((resource, index) => (
              <div
                key={index}
                onClick={() => handleResourceClick(resource)}
                style={{
                  padding: '15px',
                  border: '1px solid #ddd',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  backgroundColor: '#f9f9f9',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e9e9e9'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f9f9f9'}
              >
                <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
                  {getResourceIcon(resource.type)} {resource.name}
                </div>
                <div style={{ fontSize: '0.9em', color: '#666' }}>
                  类型: {resource.type}
                </div>
                <div style={{ fontSize: '0.8em', color: '#888' }}>
                  路径: {resource.path}
                </div>
                {resource.size && (
                  <div style={{ fontSize: '0.8em', color: '#888' }}>
                    大小: {formatFileSize(resource.size)}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      
      <div style={{ marginTop: '40px', padding: '20px', backgroundColor: '#f0f0f0', borderRadius: '5px' }}>
        <h3>说明</h3>
        <ul>
          <li><strong>VFS Archive</strong>: 虚拟文件系统中的归档文件 (如 .mix 文件)</li>
          <li><strong>RFS File</strong>: 真实文件系统中的文件 (用户导入的文件)</li>
          <li>点击资源项可查看详细信息</li>
        </ul>
        
        <div style={{ marginTop: '15px', fontSize: '0.9em' }}>
          <strong>调试信息:</strong>
          <div>Engine.vfs: {Engine.vfs ? '存在' : '不存在'}</div>
          <div>Engine.rfs: {Engine.rfs ? '存在' : '不存在'}</div>
        </div>
      </div>
    </div>
  );
};

function getResourceIcon(type: ResourceInfo['type']): string {
  switch (type) {
    case 'VFS Archive': return '📦';
    case 'VFS File': return '📄';
    case 'RFS Directory': return '📁';
    case 'RFS File': return '📄';
    default: return '❓';
  }
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export default GameResourcesViewer; 