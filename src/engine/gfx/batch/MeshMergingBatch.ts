import * as THREE from 'three';
import { MergedSpriteMesh } from './MergedSpriteMesh';

/**
 * 网格合并批处理类，用于管理合并的精灵网格
 * 实现了批处理接口，提供阴影、裁剪平面等渲染属性的管理
 */
export class MeshMergingBatch {
  public maxInstances: number;
  private target?: THREE.Object3D;
  private mergedGeoMesh?: MergedSpriteMesh;
  
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
    if (this.mergedGeoMesh) {
      this.mergedGeoMesh.castShadow = value;
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
    if (this.mergedGeoMesh) {
      this.mergedGeoMesh.receiveShadow = value;
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
    if (this.mergedGeoMesh) {
      (this.mergedGeoMesh.material as any).clippingPlanes = value;
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
    if (this.mergedGeoMesh) {
      this.mergedGeoMesh.renderOrder = value;
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
      
      if (this.mergedGeoMesh) {
        object3D.add(this.mergedGeoMesh);
      }
    }
  }

  /**
   * 设置要合并的网格数组
   * @param meshes 网格数组
   */
  setMeshes(meshes: any[]): void {
    if (meshes.length > this.maxInstances) {
      throw new RangeError('Meshes array exceeds max number of instances');
    }

    if (meshes.length > 0) {
      // 如果还没有合并网格，创建一个
      if (!this.mergedGeoMesh) {
        this.mergedGeoMesh = new MergedSpriteMesh(
          meshes[0].geometry,
          meshes[0].material,
          this.maxInstances
        );
        
        // 应用当前的渲染属性
        this.mergedGeoMesh.castShadow = this._castShadow;
        this.mergedGeoMesh.receiveShadow = this._receiveShadow;
        this.mergedGeoMesh.renderOrder = this._renderOrder;
        (this.mergedGeoMesh.material as any).clippingPlanes = this._clippingPlanes;
        
        // 添加到目标对象
        if (this.target) {
          this.target.add(this.mergedGeoMesh);
        }
      }
      
      // 更新合并网格的数据
      this.mergedGeoMesh.updateFromMeshes(meshes);
    } else {
      // 如果没有网格，清理合并网格
      if (this.mergedGeoMesh) {
        if (this.target) {
          this.target.remove(this.mergedGeoMesh);
        }
        this.mergedGeoMesh.dispose();
        this.mergedGeoMesh = undefined;
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
    if (this.mergedGeoMesh) {
      this.mergedGeoMesh.dispose();
    }
  }
}
  