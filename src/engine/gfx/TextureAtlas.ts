import { IndexedBitmap } from '../../data/Bitmap';
import * as THREE from 'three';

// GrowingPacker implementation (from original project)
class GrowingPacker {
  public root: any;

  fit(blocks: any[]): void {
    let w = blocks.length > 0 ? blocks[0].w : 0;
    let h = blocks.length > 0 ? blocks[0].h : 0;
    
    this.root = { x: 0, y: 0, w: w, h: h };
    
    for (let block of blocks) {
      let node = this.findNode(this.root, block.w, block.h);
      if (node) {
        block.fit = this.splitNode(node, block.w, block.h);
      } else {
        block.fit = this.growNode(block.w, block.h);
      }
    }
  }

  private findNode(root: any, w: number, h: number): any {
    if (root.used) {
      return this.findNode(root.right, w, h) || this.findNode(root.down, w, h);
    } else if ((w <= root.w) && (h <= root.h)) {
      return root;
    } else {
      return null;
    }
  }

  private splitNode(node: any, w: number, h: number): any {
    node.used = true;
    node.down = { x: node.x, y: node.y + h, w: node.w, h: node.h - h };
    node.right = { x: node.x + w, y: node.y, w: node.w - w, h: h };
    return node;
  }

  private growNode(w: number, h: number): any {
    let canGrowDown = (w <= this.root.w);
    let canGrowRight = (h <= this.root.h);

    let shouldGrowRight = canGrowRight && (this.root.h >= (this.root.w + w));
    let shouldGrowDown = canGrowDown && (this.root.w >= (this.root.h + h));

    if (shouldGrowRight) {
      return this.growRight(w, h);
    } else if (shouldGrowDown) {
      return this.growDown(w, h);
    } else if (canGrowRight) {
      return this.growRight(w, h);
    } else if (canGrowDown) {
      return this.growDown(w, h);
    } else {
      return null;
    }
  }

  private growRight(w: number, h: number): any {
    this.root = {
      used: true,
      x: 0,
      y: 0,
      w: this.root.w + w,
      h: this.root.h,
      down: this.root,
      right: { x: this.root.w, y: 0, w: w, h: this.root.h }
    };
    let node = this.findNode(this.root, w, h);
    if (node) {
      return this.splitNode(node, w, h);
    } else {
      return null;
    }
  }

  private growDown(w: number, h: number): any {
    this.root = {
      used: true,
      x: 0,
      y: 0,
      w: this.root.w,
      h: this.root.h + h,
      down: { x: 0, y: this.root.h, w: this.root.w, h: h },
      right: this.root
    };
    let node = this.findNode(this.root, w, h);
    if (node) {
      return this.splitNode(node, w, h);
    } else {
      return null;
    }
  }
}

function disposeHandler(event: any): void {
  const target = event.target;
  target.isDisposed = true;
  target.removeEventListener('dispose', disposeHandler);
}

function createAtlasBitmap(
  blocks: any[], 
  width: number, 
  height: number, 
  imageRects?: Map<IndexedBitmap, any>
): IndexedBitmap {
  const atlasBitmap = new IndexedBitmap(width, height);
  
  blocks.forEach(block => {
    if (!block.fit) {
      throw new Error("Couldn't fit all images in a single texture");
    }
    
    const image = block.image;
    const x = block.fit.x;
    const y = block.fit.y;
    
    imageRects?.set(image, { x, y, width: block.w, height: block.h });
    atlasBitmap.drawIndexedImage(image, x, y);
  });
  
  return atlasBitmap;
}

export class TextureAtlas {
  private texture?: THREE.DataTexture;
  private imageRects?: Map<IndexedBitmap, any>;
  private width: number = 0;
  private height: number = 0;

  getTexture(): THREE.DataTexture {
    if (!this.texture) {
      throw new Error('Texture atlas not initialized');
    }
    return this.texture;
  }

  getImageRect(image: IndexedBitmap): any {
    if (!this.imageRects) {
      throw new Error('Texture atlas not initialized');
    }
    const rect = this.imageRects.get(image);
    if (!rect) {
      throw new Error('Image not found in atlas');
    }
    return rect;
  }

  pack(images: IndexedBitmap[]): void {
    const blocks: any[] = [];
    
    images.forEach(image => {
      blocks.push({
        w: image.width + (image.width % 2),
        h: image.height + (image.height % 2),
        image: image
      });
    });
    
    // Sort blocks by size (largest first)
    blocks.sort((a, b) => (b.w - a.w) * 10000 + b.h - a.h);
    
    const packer = new GrowingPacker();
    packer.fit(blocks);
    
    const width = packer.root.w;
    const height = packer.root.h;
    const imageRects = new Map<IndexedBitmap, any>();
    
    const atlasBitmap = createAtlasBitmap(blocks, width, height, imageRects);
    
    const texture = new THREE.DataTexture(
      atlasBitmap.data, 
      width, 
      height, 
      THREE.RedFormat
    );
    
    texture.needsUpdate = true;
    texture.flipY = true;
    texture.minFilter = THREE.NearestFilter;
    texture.magFilter = THREE.NearestFilter;
    
    // Set up onUpdate handler (like original)
    texture.onUpdate = (texture: THREE.DataTexture) => {
      (texture as any).image = {
        width: (texture as any).image.width,
        height: (texture as any).image.height,
        get data() {
          if ((texture as any).isDisposed) {
            return new Uint8Array(this.width * this.height);
          } else {
            console.log('TextureAtlas: Rebuilding texture for upload to GPU...');
            return createAtlasBitmap(blocks, width, height).data;
          }
        }
      };
      texture.addEventListener('dispose', disposeHandler);
    };
    
    this.width = width;
    this.height = height;
    this.imageRects = imageRects;
    this.texture = texture;
  }

  dispose(): void {
    this.texture?.dispose();
  }
} 