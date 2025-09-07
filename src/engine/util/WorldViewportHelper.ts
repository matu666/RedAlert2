import * as THREE from 'three';
import { IsoCoords } from '../IsoCoords';

interface Point {
  x: number;
  y: number;
}

interface Point3D extends Point {
  z: number;
}

interface Viewport {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface CameraPan {
  getPan(): Point;
}

interface Scene {
  viewport: Viewport;
  cameraPan: CameraPan;
}

export class WorldViewportHelper {
  private scene: Scene;

  constructor(scene: Scene) {
    this.scene = scene;
  }

  distanceToViewport(worldPosition: Point3D): number {
    const viewport = this.scene.viewport;
    const viewportBox = new THREE.Box2(
      new THREE.Vector2(viewport.x, viewport.y),
      new THREE.Vector2(viewport.x + viewport.width - 1, viewport.y + viewport.height - 1)
    );
    
    return this.distanceToScreenBox(worldPosition, viewportBox);
  }

  distanceToScreenBox(worldPosition: Point3D, screenBox: THREE.Box2): number {
    const screenPos = IsoCoords.vecWorldToScreen(worldPosition);
    const origin = IsoCoords.worldToScreen(0, 0);
    const pan = this.scene.cameraPan.getPan();
    
    const adjustedScreenPos = new THREE.Vector2(
      screenPos.x - origin.x - pan.x + this.scene.viewport.width / 2,
      screenPos.y - origin.y - pan.y + this.scene.viewport.height / 2
    );
    
    return screenBox.distanceToPoint(adjustedScreenPos);
  }

  distanceToViewportCenter(worldPosition: Point3D): THREE.Vector2 {
    const screenPos = IsoCoords.vecWorldToScreen(worldPosition);
    const origin = IsoCoords.worldToScreen(0, 0);
    const pan = this.scene.cameraPan.getPan();
    const viewport = this.scene.viewport;
    
    const adjustedScreenPos = new THREE.Vector2(
      screenPos.x - origin.x - pan.x + this.scene.viewport.width / 2,
      screenPos.y - origin.y - pan.y + this.scene.viewport.height / 2
    );
    
    const viewportCenter = new THREE.Vector2(
      viewport.x + viewport.width / 2,
      viewport.y + viewport.height / 2
    );
    
    return adjustedScreenPos.sub(viewportCenter);
  }

  intersectsScreenBox(worldPosition: Point3D, screenBox: THREE.Box2): boolean {
    return this.distanceToScreenBox(worldPosition, screenBox) === 0;
  }
}
