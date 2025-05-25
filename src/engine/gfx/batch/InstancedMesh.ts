import * as THREE from 'three';

// 创建深度材质，用于阴影渲染
const depthMaterial = new THREE.MeshDepthMaterial();
depthMaterial.depthPacking = THREE.RGBADepthPacking;
(depthMaterial as any).clipping = true;
(depthMaterial as any).defines = { INSTANCE_TRANSFORM: "" };

// 创建距离材质，用于点光源阴影
const distanceShader = THREE.ShaderLib.distanceRGBA;
const distanceUniforms = THREE.UniformsUtils.clone(distanceShader.uniforms);
const distanceDefines = { USE_SHADOWMAP: "", INSTANCE_TRANSFORM: "" };
const distanceMaterial = new THREE.ShaderMaterial({
  defines: distanceDefines,
  uniforms: distanceUniforms,
  vertexShader: distanceShader.vertexShader,
  fragmentShader: distanceShader.fragmentShader,
  clipping: true,
});

// 实例化网格类，继承自THREE.Mesh
export class InstancedMesh extends THREE.Mesh {
  public maxInstances: number;
  public uniformScale: boolean;
  public useInstanceColor: boolean;
  private instanceMatrixAttributes: THREE.InstancedBufferAttribute[];

  constructor(
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    maxInstances: number,
    uniformScale: boolean,
    useInstanceColor: boolean = false
  ) {
    // 创建实例化几何体并复制原始几何体
    const instancedGeometry = new THREE.InstancedBufferGeometry();
    (instancedGeometry as any).copy(geometry);
    super(instancedGeometry);
    
    this.maxInstances = maxInstances;
    this.uniformScale = uniformScale;
    this.useInstanceColor = useInstanceColor;
    
    // 初始化实例属性
    this.initAttributes(this.geometry as THREE.InstancedBufferGeometry);
    
    // 装饰材质以支持实例化
    this.material = this.decorateMaterial(material.clone());
    
    // 禁用视锥体剔除，因为实例可能分布在很大范围内
    this.frustumCulled = false;
    
    // 设置自定义深度和距离材质
    this.customDepthMaterial = depthMaterial;
    this.customDistanceMaterial = distanceMaterial;
  }

  // 初始化实例属性
  private initAttributes(geometry: THREE.InstancedBufferGeometry): void {
    const attributes: Array<{
      name: string;
      data: Float32Array | Uint8Array;
      itemSize: number;
      normalized: boolean;
    }> = [];

    // 添加实例变换矩阵属性（4x4矩阵分为4个vec4）
    for (let i = 0; i < 4; i++) {
      attributes.push({
        name: "instanceMatrix" + i,
        data: new Float32Array(4 * this.maxInstances),
        itemSize: 4,
        normalized: true,
      });
    }

    // 如果使用实例颜色，添加颜色属性
    if (this.useInstanceColor) {
      attributes.push({
        name: "instanceColor",
        data: new Uint8Array(3 * this.maxInstances),
        itemSize: 3,
        normalized: true,
      });
    }

    // 添加实例透明度属性
    attributes.push({
      name: "instanceOpacity",
      data: new Float32Array(this.maxInstances).fill(1),
      itemSize: 1,
      normalized: true,
    });

    // 将属性添加到几何体
    for (const { name, data, itemSize, normalized } of attributes) {
      const attribute = new THREE.InstancedBufferAttribute(data, itemSize, normalized, 1);
      attribute.setUsage(THREE.DynamicDrawUsage);
      geometry.setAttribute(name, attribute);
    }

    // 保存矩阵属性的引用以便后续使用
    this.instanceMatrixAttributes = new Array(4)
      .fill(0)
      .map((_, i) => geometry.getAttribute("instanceMatrix" + i) as THREE.InstancedBufferAttribute);
  }

  // 装饰材质以支持实例化
  private decorateMaterial(material: THREE.Material): THREE.Material {
    const mat = material as any;
    
    // 确保材质有defines对象
    if (!mat.defines) {
      mat.defines = {};
    }
    
    // 添加实例变换定义
    mat.defines.INSTANCE_TRANSFORM = "";
    
    // 根据是否使用统一缩放添加相应定义
    if (this.uniformScale) {
      mat.defines.INSTANCE_UNIFORM = "";
    } else {
      delete mat.defines.INSTANCE_UNIFORM;
    }
    
    // 根据是否使用实例颜色添加相应定义
    if (this.useInstanceColor) {
      mat.defines.INSTANCE_COLOR = "";
    } else {
      delete mat.defines.INSTANCE_COLOR;
    }
    
    // 添加实例透明度定义
    mat.defines.INSTANCE_OPACITY = "";
    
    return material;
  }

  // 设置渲染实例数量
  public setRenderCount(count: number): void {
    if (count > this.maxInstances) {
      throw new RangeError("Exceeded maximum number of instances");
    }
    (this.geometry as THREE.InstancedBufferGeometry).instanceCount = count;
  }

  // 设置指定索引的变换矩阵
  public setMatrixAt(index: number, matrix: THREE.Matrix4): void {
    for (let row = 0; row < 4; row++) {
      let offset = 4 * row;
      this.instanceMatrixAttributes[row].setXYZW(
        index,
        matrix.elements[offset++],
        matrix.elements[offset++],
        matrix.elements[offset++],
        matrix.elements[offset]
      );
    }
  }

  // 从网格数组更新实例数据
  public updateFromMeshes(meshes: any[]): void {
    if (meshes.length === 0) return;

    const hasPalette = !!meshes[0].material.palette;
    const attributes = (this.geometry as THREE.InstancedBufferGeometry).attributes;
    
    const opacityAttr = attributes.instanceOpacity as THREE.InstancedBufferAttribute;
    const paletteOffsetAttr = attributes.instancePaletteOffset as THREE.InstancedBufferAttribute;
    const extraLightAttr = attributes.instanceExtraLight as THREE.InstancedBufferAttribute;

    for (let i = 0, len = meshes.length; i < len; i++) {
      const mesh = meshes[i];
      
      // 设置变换矩阵
      this.setMatrixAt(i, mesh.matrixWorld);
      
      // 更新透明度
      const opacity = mesh.getOpacity();
      if (opacityAttr.getX(i) !== opacity) {
        opacityAttr.setX(i, opacity);
        opacityAttr.needsUpdate = true;
      }
      
      // 如果有调色板，更新调色板相关属性
      if (hasPalette) {
        const paletteIndex = mesh.getPaletteIndex();
        if (paletteOffsetAttr.getX(i) !== paletteIndex) {
          paletteOffsetAttr.setX(i, paletteIndex);
          paletteOffsetAttr.needsUpdate = true;
        }
        
        const extraLight = mesh.getExtraLight();
        const x = Math.fround(extraLight.x);
        const y = Math.fround(extraLight.y);
        const z = Math.fround(extraLight.z);
        
        if (x !== extraLightAttr.getX(i) || y !== extraLightAttr.getY(i) || z !== extraLightAttr.getZ(i)) {
          extraLightAttr.setXYZ(i, x, y, z);
          extraLightAttr.needsUpdate = true;
        }
      }
    }
    
    // 设置渲染数量
    this.setRenderCount(meshes.length);
    
    // 标记矩阵属性需要更新
    for (const attr of this.instanceMatrixAttributes) {
      attr.needsUpdate = true;
    }
  }

  // 释放资源
  public dispose(): void {
    this.geometry.dispose();
    (this.material as THREE.Material).dispose();
  }
}
  