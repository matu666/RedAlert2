import * as THREE from 'three';

/**
 * Manages the visual grid overlay for building placement
 */
export class PlacementGrid {
  private target?: any;
  private tilesObject?: any;
  private rangeObject?: any;
  private tileOverlays = new Map();
  private textureCache?: any;
  private lastRangeCircle?: any;

  constructor(
    private viewModel: any,
    private camera: any,
    private mapTiles: any
  ) {}

  get3DObject(): any {
    return this.target;
  }

  create3DObject(): void {
    const obj = new THREE.Object3D();
    obj.name = 'placement_grid';
    this.target = obj;
    this.createTileOverlays();
  }

  update(): void {
    this.refreshRangeCircle();
    
    if (this.viewModel.visible || !this.tilesObject) {
      const tilesContainer = new THREE.Object3D();
      tilesContainer.visible = true;

      for (const tile of this.viewModel.tiles) {
        const mapTile = this.mapTiles.getByMapCoords(tile.rx, tile.ry);
        if (!mapTile) {
          throw new Error(`Map tile not found for coords (${tile.rx}, ${tile.ry})`);
        }

        const overlay = this.tileOverlays.get(mapTile.rampType);
        if (!overlay) {
          throw new Error('Missing overlay mesh for rampType ' + mapTile.rampType);
        }

        const mesh = overlay.clone();
        mesh.material = mesh.material.clone();
        
        const color = tile.buildable
          ? (this.viewModel.showBusy ? 0xffff00 : 0x00ff00)
          : 0xff0000;
        
        mesh.material.color.set(color);
        
        const position = this.getTilePosition(mapTile);
        mesh.position.copy(position);
        tilesContainer.add(mesh);
      }

      const container = this.get3DObject();
      container.remove(this.tilesObject);
      this.tilesObject = tilesContainer;
      container.add(tilesContainer);
    } else {
      this.tilesObject.visible = false;
    }
  }

  private refreshRangeCircle(): void {
    // Range circle logic - simplified
  }

  private createTileOverlays(): void {
    // Create tile overlay meshes for different ramp types
  }

  private getTilePosition(tile: any): any {
    // Convert tile coordinates to world position
    return new THREE.Vector3(tile.rx * 32, 0, tile.ry * 32);
  }

  dispose(): void {
    this.tileOverlays.forEach((overlay) => {
      overlay.material?.dispose();
      overlay.geometry?.dispose();
    });
  }
}
