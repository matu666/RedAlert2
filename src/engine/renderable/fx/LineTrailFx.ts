import { ObjectArt } from '@/game/art/ObjectArt';
import { Coords } from '@/game/Coords';
import * as THREE from 'three';

interface GameSpeed {
  value: number;
}

interface Container {
  get3DObject(): THREE.Object3D;
  remove(item: LineTrailFx): void;
}

export class LineTrailFx {
  private lazyTarget: () => THREE.Object3D | undefined;
  private trailColor: THREE.Color;
  private trailDecrement: number;
  private gameSpeed: GameSpeed;
  private camera: THREE.Camera;
  private trailInitialized: boolean = false;
  private container?: Container;
  private placeholderObj?: THREE.Object3D;
  private trail?: THREE.TrailRenderer;
  private timeLeft?: number;
  private prevUpdateMillis?: number;
  private lastTargetMatrix?: THREE.Matrix4;

  constructor(
    lazyTarget: () => THREE.Object3D | undefined,
    trailColor: THREE.Color,
    trailDecrement: number,
    gameSpeed: GameSpeed,
    camera: THREE.Camera
  ) {
    this.lazyTarget = lazyTarget;
    this.trailColor = trailColor;
    this.trailDecrement = trailDecrement;
    this.gameSpeed = gameSpeed;
    this.camera = camera;
  }

  setContainer(container: Container): void {
    this.container = container;
  }

  get3DObject(): THREE.Object3D | undefined {
    return this.placeholderObj;
  }

  create3DObject(): void {
    if (!this.placeholderObj) {
      this.placeholderObj = new THREE.Object3D();
      this.placeholderObj.name = "fx_linetrail_placeholder";
    }
  }

  update(timeMillis: number): void {
    if (this.timeLeft !== undefined) {
      const prevTime = this.prevUpdateMillis;
      this.prevUpdateMillis = timeMillis;
      if (prevTime) {
        this.timeLeft = Math.max(0, this.timeLeft - (timeMillis - prevTime) / 1000);
      }
    }

    if (!this.trailInitialized) {
      this.trailInitialized = true;
      const trail = this.createTrail(this.trailColor, this.trailDecrement);
      if (trail) {
        this.trail = trail;
      } else {
        this.timeLeft = 0;
      }
    }

    if (this.trail) {
      this.trail.advance();
      this.lastTargetMatrix = this.trail.targetObject.matrixWorld;
    }

    if (this.isFinished()) {
      this.container?.remove(this);
      this.dispose();
    }
  }

  private createTrail(color: THREE.Color, decrement: number): THREE.TrailRenderer | undefined {
    const target = this.lazyTarget();
    if (!target || !this.container) return undefined;

    const renderer = new THREE.TrailRenderer(this.container.get3DObject());
    const material = THREE.TrailRenderer.createBaseMaterial();
    
    material.uniforms.headColor.value.set(color.r, color.g, color.b, 1);
    material.uniforms.tailColor.value.set(color.r, color.g, color.b, 0);

    const numPoints = Math.floor(
      ((3 / this.gameSpeed.value) * 50) / 
      (decrement / ObjectArt.DEFAULT_LINE_TRAIL_DEC)
    );
    
    const size = 0.8 * Coords.ISO_WORLD_SCALE;
    const geometry = new THREE.PlaneGeometry(size, size);
    const quaternion = new THREE.Quaternion().setFromEuler(this.camera.rotation);
    
    geometry.applyMatrix4(
      new THREE.Matrix4().makeRotationFromQuaternion(quaternion)
    );

    renderer.initialize(material, numPoints, false, 0, geometry.vertices, target);
    renderer.activate();
    
    return renderer;
  }

  isFinished(): boolean {
    return this.timeLeft === 0;
  }

  requestFinishAndDispose(): void {
    this.timeLeft = 0.8 / this.gameSpeed.value;
  }

  stopTracking(): void {
    if (this.trail && this.lastTargetMatrix) {
      const dummy = new THREE.Object3D();
      dummy.updateMatrixWorld = () => {};
      dummy.matrixWorld = this.lastTargetMatrix;
      this.trail.targetObject = dummy;
    }
  }

  dispose(): void {
    if (this.trail) {
      this.trail.deactivate();
      this.trail.material.dispose();
      this.trail.geometry.dispose();
    }
  }
}