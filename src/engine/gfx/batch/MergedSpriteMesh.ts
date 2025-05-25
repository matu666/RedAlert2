import * as THREE from 'three';
import * as arrayUtils from '../../../util/array';
import { PaletteBasicMaterial } from '../material/PaletteBasicMaterial';

// 临时向量，用于位置计算
const tempVector3 = new THREE.Vector3();
const tempVector4 = new THREE.Vector4();

/**
 * 合并精灵网格类，将多个精灵网格合并为单个网格以提高渲染性能
 */
export class MergedSpriteMesh extends THREE.Mesh {
  public maxInstances: number;
  public verticesPerItem: number;
  public indicesPerItem: number | undefined;

  /**
   * 创建合并的几何体
   * @param sourceGeometry 源几何体
   * @param maxInstances 最大实例数量
   * @param material 材质
   * @returns 合并后的几何体
   */
  static createMergedGeometry(
    sourceGeometry: THREE.BufferGeometry,
    maxInstances: number,
    material: THREE.Material
  ): THREE.BufferGeometry {
    const mergedGeometry = new THREE.BufferGeometry();
    
    // 复制所有属性
    for (const attributeName of Object.keys(sourceGeometry.attributes)) {
      const sourceAttribute = sourceGeometry.getAttribute(attributeName);
      const ArrayConstructor = sourceAttribute.array.constructor as any;
      const mergedArray = new ArrayConstructor(maxInstances * sourceAttribute.array.length);
      
      mergedGeometry.setAttribute(
        attributeName,
        new THREE.BufferAttribute(mergedArray, sourceAttribute.itemSize, sourceAttribute.normalized)
      );
    }
    
    const vertexCount = sourceGeometry.getAttribute('position').count;
    
    // 如果是调色板材质，添加顶点颜色倍数属性
    if (material instanceof PaletteBasicMaterial) {
      mergedGeometry.setAttribute(
        'vertexColorMult',
        new THREE.BufferAttribute(new Float32Array(vertexCount * maxInstances * 4), 4)
      );
    }
    
    // 如果材质有调色板，添加顶点调色板偏移属性
    if ((material as any).palette) {
      mergedGeometry.setAttribute(
        'vertexPaletteOffset',
        new THREE.BufferAttribute(new Float32Array(vertexCount * maxInstances), 1)
      );
    }
    
    // 设置所有属性为动态更新
    for (const attribute of Object.values(mergedGeometry.attributes)) {
      (attribute as THREE.BufferAttribute).setUsage(THREE.DynamicDrawUsage);
    }
    
    // 处理索引
    if (sourceGeometry.index) {
      mergedGeometry.setIndex(
        new THREE.BufferAttribute(
          new Uint32Array(maxInstances * sourceGeometry.index.array.length),
          1
        )
      );
      
      for (let i = 0; i < maxInstances; i++) {
        const vertexOffset = i * vertexCount;
        const indexArray = mergedGeometry.index!.array as Uint32Array;
        const sourceIndexArray = sourceGeometry.index.array;
        
        indexArray.set(
          Uint32Array.from(sourceIndexArray, (index: number) => index + vertexOffset),
          i * sourceIndexArray.length
        );
      }
    }
    
    return mergedGeometry;
  }

  constructor(
    sourceGeometry: THREE.BufferGeometry,
    material: THREE.Material,
    maxInstances: number
  ) {
    super(MergedSpriteMesh.createMergedGeometry(sourceGeometry, maxInstances, material));
    
    this.maxInstances = maxInstances;
    this.material = this.decorateMaterial(material.clone());
    this.verticesPerItem = sourceGeometry.getAttribute('position').count;
    this.indicesPerItem = sourceGeometry.index?.count;
    this.frustumCulled = false;
  }

  /**
   * 装饰材质以支持合并网格的特殊功能
   */
  private decorateMaterial(material: THREE.Material): THREE.Material {
    const mat = material as any;
    
    if (!mat.defines) {
      mat.defines = {};
    }
    
    // 如果材质有调色板，添加顶点调色板偏移定义
    if (mat.palette) {
      mat.defines.VERTEX_PALETTE_OFFSET = '';
    }
    
    // 如果是调色板基础材质，启用顶点颜色倍数
    if (material instanceof PaletteBasicMaterial) {
      (mat as any).useVertexColorMult = true;
    }
    
    return material;
  }

  /**
   * 从网格数组更新合并网格的数据
   */
  public updateFromMeshes(meshes: any[]): void {
    const attributes = this.geometry.attributes;
    const positionAttr = attributes.position as THREE.BufferAttribute;
    const uvAttr = attributes.uv as THREE.BufferAttribute;
    const colorMultAttr = attributes.vertexColorMult as THREE.BufferAttribute;
    const paletteOffsetAttr = attributes.vertexPaletteOffset as THREE.BufferAttribute;
    const meshCount = meshes.length;
    
    if (meshCount > this.maxInstances) {
      throw new RangeError('Exceeded maximum number of instances');
    }
    
    for (let i = 0; i < meshCount; i++) {
      const vertexOffset = i * this.verticesPerItem;
      const mesh = meshes[i];
      
      // 设置几何体数据
      this.setGeometryAt(
        vertexOffset,
        mesh.geometry,
        tempVector3.setFromMatrixPosition(mesh.matrixWorld),
        positionAttr,
        uvAttr
      );
      
      // 设置额外光照和透明度
      const extraLight = mesh.getExtraLight();
      if (colorMultAttr) {
        this.setColorMultAt(
          vertexOffset,
          tempVector4.set(1 + extraLight.x, 1 + extraLight.y, 1 + extraLight.z, mesh.getOpacity()),
          colorMultAttr
        );
      }
      
      // 设置调色板索引
      if (paletteOffsetAttr) {
        this.setPaletteIndexAt(vertexOffset, mesh.getPaletteIndex(), paletteOffsetAttr);
      }
    }
    
    // 设置绘制范围
    this.geometry.setDrawRange(
      0,
      meshCount * (this.geometry.index ? this.indicesPerItem! : this.verticesPerItem)
    );
    
    // 更新属性的更新范围
    for (const attribute of Object.values(attributes)) {
      if ((attribute as any).usage === THREE.DynamicDrawUsage) {
        const bufferAttr = attribute as THREE.BufferAttribute;
        if (bufferAttr.updateRanges && bufferAttr.updateRanges.length > 0) {
          bufferAttr.updateRanges[0].count = 
            meshCount < this.maxInstances 
              ? meshCount * this.verticesPerItem * bufferAttr.itemSize
              : -1;
        }
      }
    }
  }

  /**
   * 在指定位置设置几何体数据
   */
  private setGeometryAt(
    vertexOffset: number,
    sourceGeometry: THREE.BufferGeometry,
    worldPosition: THREE.Vector3,
    positionAttr: THREE.BufferAttribute,
    uvAttr: THREE.BufferAttribute
  ): void {
    const sourceAttributes = sourceGeometry.attributes;
    const sourcePositions = sourceAttributes.position.array as Float32Array;
    const targetPositions = positionAttr.array as Float32Array;
    
    // 更新位置数据
    for (let i = 0; i < this.verticesPerItem; i++) {
      const targetIndex = 3 * (vertexOffset + i);
      const sourceIndex = 3 * i;
      
      const x = Math.fround(sourcePositions[sourceIndex] + Math.fround(worldPosition.x));
      const y = Math.fround(sourcePositions[sourceIndex + 1] + Math.fround(worldPosition.y));
      const z = Math.fround(sourcePositions[sourceIndex + 2] + Math.fround(worldPosition.z));
      
      if (x !== targetPositions[targetIndex] || 
          y !== targetPositions[targetIndex + 1] || 
          z !== targetPositions[targetIndex + 2]) {
        targetPositions[targetIndex] = x;
        targetPositions[targetIndex + 1] = y;
        targetPositions[targetIndex + 2] = z;
        positionAttr.needsUpdate = true;
      }
    }
    
    // 更新UV数据
    const targetUVs = uvAttr.array as Float32Array;
    const sourceUVs = sourceAttributes.uv.array as Float32Array;
    const uvStartIndex = 2 * vertexOffset;
    
    if (!arrayUtils.equals(
      Array.from(sourceUVs), 
      Array.from(targetUVs.subarray(uvStartIndex, uvStartIndex + sourceUVs.length))
    )) {
      targetUVs.set(sourceUVs, uvStartIndex);
      uvAttr.needsUpdate = true;
    }
  }

  /**
   * 设置颜色倍数
   */
  private setColorMultAt(
    vertexOffset: number,
    colorMult: THREE.Vector4,
    colorMultAttr: THREE.BufferAttribute
  ): void {
    if (colorMultAttr.getX(vertexOffset) !== colorMult.x ||
        colorMultAttr.getY(vertexOffset) !== colorMult.y ||
        colorMultAttr.getZ(vertexOffset) !== colorMult.z ||
        colorMultAttr.getW(vertexOffset) !== colorMult.w) {
      
      colorMultAttr.needsUpdate = true;
      for (let i = 0; i < this.verticesPerItem; i++) {
        colorMultAttr.setXYZW(vertexOffset + i, colorMult.x, colorMult.y, colorMult.z, colorMult.w);
      }
    }
  }

  /**
   * 设置调色板索引
   */
  private setPaletteIndexAt(
    vertexOffset: number,
    paletteIndex: number,
    paletteOffsetAttr: THREE.BufferAttribute
  ): void {
    if (paletteOffsetAttr.getX(vertexOffset) !== paletteIndex) {
      paletteOffsetAttr.needsUpdate = true;
      for (let i = 0; i < this.verticesPerItem; i++) {
        paletteOffsetAttr.setX(vertexOffset + i, paletteIndex);
      }
    }
  }

  /**
   * 释放资源
   */
  public dispose(): void {
    this.geometry.dispose();
    (this.material as THREE.Material).dispose();
  }
}
  