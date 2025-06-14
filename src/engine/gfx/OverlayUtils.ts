import * as THREE from 'three';
import { CanvasUtils } from './CanvasUtils';

export class OverlayUtils {
  static createGroundCircle(radius: number, color: THREE.ColorRepresentation): THREE.Line {
    const material = new THREE.LineBasicMaterial({
      color: color,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });
    
    const geometry = new THREE.CircleGeometry(radius, 64);
    geometry.vertices.shift();
    geometry.vertices.push(geometry.vertices[0]);
    
    const line = new THREE.Line(geometry, material);
    line.rotation.x = Math.PI / 2;
    line.renderOrder = 1000000;
    
    return line;
  }

  static createTextBox(text: string, options: any): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 0;
    
    const context = canvas.getContext('2d', {
      alpha: !options.backgroundColor || !!options.backgroundColor.match(/^rgba/),
    });
    
    CanvasUtils.drawText(context, text, 0, 0, {
      ...options,
      autoEnlargeCanvas: true,
    });
    
    return canvas;
  }
}