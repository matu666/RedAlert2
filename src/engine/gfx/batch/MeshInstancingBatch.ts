import * as THREE from 'three';
import { InstancedMesh } from './InstancedMesh';

/**
 * 网格实例化批处理类，用于管理实例化网格
 * 使用THREE.js的实例化渲染技术来提高性能
 */
export class MeshInstancingBatch {
  public maxInstances: number;
  private target?: THREE.Object3D;
  private instancedMesh?: InstancedMesh;
  
  // 私有属性用于存储渲染状态
  private _castShadow: boolean = false;
  private _receiveShadow: boolean = false;
  private _clippingPlanes: THREE.Plane[] = [];
  private _renderOrder: number = 0;

  constructor(maxInstances: number) {
    this.maxInstances = maxInstances;
  }

  /**
   * 获取是否投射阴影
   */
  get castShadow(): boolean {
    return this._castShadow;
  }

  /**
   * 设置是否投射阴影
   */
  set castShadow(value: boolean) {
    this._castShadow = value;
    if (this.instancedMesh) {
      this.instancedMesh.castShadow = value;
    }
  }

  /**
   * 获取是否接收阴影
   */
  get receiveShadow(): boolean {
    return this._receiveShadow;
  }

  /**
   * 设置是否接收阴影
   */
  set receiveShadow(value: boolean) {
    this._receiveShadow = value;
    if (this.instancedMesh) {
      this.instancedMesh.receiveShadow = value;
    }
  }

  /**
   * 获取裁剪平面
   */
  get clippingPlanes(): THREE.Plane[] {
    return this._clippingPlanes;
  }

  /**
   * 设置裁剪平面
   */
  set clippingPlanes(value: THREE.Plane[]) {
    this._clippingPlanes = value;
    if (this.instancedMesh) {
      (this.instancedMesh.material as any).clippingPlanes = value;
    }
  }

  /**
   * 获取渲染顺序
   */
  get renderOrder(): number {
    return this._renderOrder;
  }

  /**
   * 设置渲染顺序
   */
  set renderOrder(value: number) {
    this._renderOrder = value;
    if (this.instancedMesh) {
      this.instancedMesh.renderOrder = value;
    }
  }

  /**
   * 获取3D对象
   */
  get3DObject(): THREE.Object3D | undefined {
    return this.target;
  }

  /**
   * 创建3D对象
   */
  create3DObject(): void {
    if (!this.target) {
      const object3D = new THREE.Object3D();
      object3D.matrixAutoUpdate = false;
      this.target = object3D;
      
      if (this.instancedMesh) {
        object3D.add(this.instancedMesh);
      }
    }
  }

  /**
   * 设置要实例化的网格数组
   * @param meshes 网格数组
   */
  setMeshes(meshes: any[]): void {
    if (meshes.length > this.maxInstances) {
      throw new RangeError('Meshes array exceeds max number of instances');
    }

    if (meshes.length > 0) {
      const hasPalette = !!meshes[0].material.palette;
      
      // 如果还没有实例化网格，创建一个
      if (!this.instancedMesh) {
        this.instancedMesh = new InstancedMesh(
          meshes[0].geometry,
          meshes[0].material,
          this.maxInstances,
          true // uniformScale = true
        );
        
        // 应用当前的渲染属性
        this.instancedMesh.castShadow = this._castShadow;
        this.instancedMesh.renderOrder = this._renderOrder;
        (this.instancedMesh.material as any).clippingPlanes = this._clippingPlanes;
        
        // 如果材质有调色板，添加调色板相关属性
        if (hasPalette) {
          const geometry = this.instancedMesh.geometry as THREE.InstancedBufferGeometry;
          
          // 添加实例调色板偏移属性
          geometry.setAttribute(
            'instancePaletteOffset',
            new THREE.InstancedBufferAttribute(
              new Float32Array(this.maxInstances),
              1
            )
          );
          
          // 添加实例额外光照属性
          geometry.setAttribute(
            'instanceExtraLight',
            new THREE.InstancedBufferAttribute(
              new Float32Array(3 * this.maxInstances),
              3
            )
          );
        }
        
        // 添加到目标对象
        if (this.target) {
          this.target.add(this.instancedMesh);
        }
      }
      
      // 更新实例化网格的数据
      this.instancedMesh.updateFromMeshes(meshes);
    } else {
      // 如果没有网格，清理实例化网格
      if (this.instancedMesh) {
        if (this.target) {
          this.target.remove(this.instancedMesh);
        }
        this.instancedMesh.dispose();
        this.instancedMesh = undefined;
      }
    }
  }

  /**
   * 更新方法（当前为空实现）
   */
  update(): void {
    // 空实现，保持接口一致性
  }

  /**
   * 释放资源
   */
  dispose(): void {
    if (this.instancedMesh) {
      this.instancedMesh.dispose();
    }
  }
}
  