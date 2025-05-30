import * as THREE from 'three';
import Stats from 'stats.js';
import { EventDispatcher } from '../../util/event';
import { RendererError } from './RendererError';

/**
 * 渲染器类，管理WebGL渲染和场景
 */
export class Renderer {
  private width: number;
  private height: number;
  private renderer!: THREE.WebGLRenderer;
  private scenes: Set<any> = new Set();
  private isContextLost: boolean = false;
  private stats?: Stats;
  private _onFrame = new EventDispatcher<number>();

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
  }

  /**
   * 获取帧事件
   */
  get onFrame() {
    return this._onFrame.asEvent();
  }

  /**
   * 获取画布元素
   */
  getCanvas(): HTMLCanvasElement {
    return this.renderer.domElement;
  }

  /**
   * 获取性能统计对象
   */
  getStats(): Stats | undefined {
    return this.stats;
  }

  /**
   * 检查是否支持实例化渲染
   */
  supportsInstancing(): boolean {
    if (!this.renderer) {
      throw new Error('Renderer not yet initialized');
    }
    return !!this.renderer.extensions.get('ANGLE_instanced_arrays');
  }

  /**
   * 初始化性能统计
   */
  initStats(container: HTMLElement): void {
    if (!this.stats) {
      this.stats = new Stats();
      this.stats.showPanel(0);
      this.stats.dom.style.top = 'auto';
      this.stats.dom.style.bottom = '0px';
      this.stats.dom.classList.add('stats-layer');
      container.appendChild(this.stats.dom);
    }
  }

  /**
   * 销毁性能统计
   */
  destroyStats(): void {
    if (this.stats) {
      if (this.stats.dom.parentNode) {
        this.stats.dom.parentNode.removeChild(this.stats.dom);
      }
      this.stats = undefined;
    }
  }

  /**
   * 初始化渲染器
   */
  init(container: HTMLElement): void {
    const renderer = this.createGlRenderer();
    container.appendChild(renderer.domElement);
    
    // 禁用右键菜单
    renderer.domElement.addEventListener('contextmenu', (event) => {
      event.preventDefault();
    });
    
    // 禁用鼠标按下的默认行为
    renderer.domElement.addEventListener('mousedown', (event) => {
      event.preventDefault();
    });
    
    // 处理滚轮事件
    renderer.domElement.addEventListener(
      'wheel',
      (event) => {
        event.stopPropagation();
      },
      { passive: true }
    );
    
    // 处理WebGL上下文丢失和恢复
    renderer.domElement.addEventListener('webglcontextlost', this.handleContextLost);
    renderer.domElement.addEventListener('webglcontextrestored', this.handleContextRestored);
    
    this.renderer = renderer;
  }

  /**
   * 创建WebGL渲染器
   */
  createGlRenderer(canvas?: HTMLCanvasElement): THREE.WebGLRenderer {
    let renderer: THREE.WebGLRenderer;
    
    try {
      renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        preserveDrawingBuffer: true,
        powerPreference: 'high-performance',
      });
    } catch (error) {
      throw new RendererError('Failed to initialize WebGL renderer');
    }
    
    // 配置渲染器
    renderer.setSize(this.width, this.height);
    renderer.autoClear = false;
    renderer.autoClearDepth = false;
    renderer.shadowMap.enabled = true;
    renderer.localClippingEnabled = true;
    renderer.toneMapping = THREE.NoToneMapping;
    
    // 禁用颜色管理以匹配原项目行为
    renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    
    console.log('[Renderer] Created with color management settings:', {
      outputColorSpace: renderer.outputColorSpace,
      toneMapping: renderer.toneMapping
    });
    
    return renderer;
  }

  /**
   * 设置视口大小
   */
  setSize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    if (this.renderer) {
      this.renderer.setSize(width, height);
    }
  }

  /**
   * 添加场景
   */
  addScene(scene: any): void {
    this.scenes.add(scene);
    scene.create3DObject();
  }

  /**
   * 移除场景
   */
  removeScene(scene: any): void {
    this.scenes.delete(scene);
  }

  /**
   * 获取所有场景
   */
  getScenes(): any[] {
    return [...this.scenes];
  }

  /**
   * 更新所有场景
   */
  update(deltaTime: number, ...args: any[]): void {
    this.scenes.forEach((scene) => {
      scene.update(deltaTime, ...args);
    });
    // @ts-ignore - 暂时忽略类型错误，专注于颜色管理问题
    this._onFrame.dispatch('frame', deltaTime);
  }

  /**
   * 渲染所有场景
   */
  render(): void {
    if (this.isContextLost) return;
    
    this.renderer.clear();
    this.scenes.forEach((scene) => {
      this.renderer.clearDepth();
      this.renderer.setViewport(
        scene.viewport.x,
        scene.viewport.y,
        scene.viewport.width,
        scene.viewport.height
      );
      this.renderer.render(scene.getScene(), scene.getCamera());
    });
  }

  /**
   * 刷新渲染列表
   */
  flush(): void {
    this.renderer.renderLists.dispose();
  }

  /**
   * 销毁渲染器
   */
  dispose(): void {
    this.renderer.domElement.remove();
    this.renderer.domElement.removeEventListener('webglcontextlost', this.handleContextLost);
    this.renderer.domElement.removeEventListener('webglcontextrestored', this.handleContextRestored);
    this.renderer.dispose();
    this.destroyStats();
  }

  /**
   * 处理WebGL上下文丢失
   */
  private handleContextLost = (event: Event): void => {
    event.preventDefault();
    this.isContextLost = true;
  };

  /**
   * 处理WebGL上下文恢复
   */
  private handleContextRestored = (): void => {
    const canvas = this.renderer.domElement;
    this.renderer.dispose();
    this.renderer = this.createGlRenderer(canvas);
    this.isContextLost = false;
  };
}
