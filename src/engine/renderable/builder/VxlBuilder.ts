import { Coords } from '@/game/Coords';
import * as THREE from 'three';

// 定义相机接口
interface Camera {
  rotation: {
    y: number;
  };
}

export abstract class VxlBuilder {
  protected camera: Camera;
  protected object?: THREE.Object3D;
  protected sections?: Map<string, THREE.Mesh>;
  protected localBoundingBox?: THREE.Box3;

  constructor(camera: Camera) {
    this.camera = camera;
  }

  build(): THREE.Object3D {
    if (this.object) {
      return this.object;
    }

    const rootObject = this.object = new THREE.Object3D();
    
    // 计算缩放比例
    const scale = Math.cos(this.camera.rotation.y) * Coords.ISO_WORLD_SCALE;
    rootObject.scale.set(scale, scale, scale);

    // 创建旋转容器
    const rotationContainer = new THREE.Object3D();
    rotationContainer.rotation.x = -Math.PI / 2;
    rotationContainer.rotation.z = +Math.PI / 2;
    rotationContainer.matrixAutoUpdate = false;
    rotationContainer.updateMatrix();
    rootObject.add(rotationContainer);

    // 创建VXL网格
    const meshes = this.sections = this.createVxlMeshes();

    meshes.forEach((mesh) => {
      mesh.matrixAutoUpdate = false;
      rotationContainer.add(mesh);

      // 计算局部边界框（仅第一次）
      if (!this.localBoundingBox) {
        // 确保几何体有边界框
        if (!mesh.geometry.boundingBox) {
          mesh.geometry.computeBoundingBox();
        }

        if (mesh.geometry.boundingBox) {
          this.localBoundingBox = new THREE.Box3(
            mesh.geometry.boundingBox.min.clone().multiplyScalar(scale),
            mesh.geometry.boundingBox.max.clone().multiplyScalar(scale)
          );

          // 交换 x 和 y 坐标
          const tempMinX = this.localBoundingBox.min.x;
          this.localBoundingBox.min.x = this.localBoundingBox.min.y;
          this.localBoundingBox.min.y = tempMinX;

          const tempMaxX = this.localBoundingBox.max.x;
          this.localBoundingBox.max.x = this.localBoundingBox.max.y;
          this.localBoundingBox.max.y = tempMaxX;
        }
      }
    });

    rootObject.matrixAutoUpdate = false;
    rootObject.updateMatrix();

    return rootObject;
  }

  getSection(sectionName: string): THREE.Mesh | undefined {
    if (!this.sections) {
      throw new Error("Vxl object must be built first");
    }
    return this.sections.get(sectionName);
  }

  getLocalBoundingBox(): THREE.Box3 | undefined {
    return this.localBoundingBox;
  }

  // 抽象方法，由子类实现
  abstract createVxlMeshes(): Map<string, THREE.Mesh>;
}