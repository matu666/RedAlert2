import { renderJsx } from "./jsx";
import { UiObjectSprite } from "../UiObjectSprite";
import { UiObject } from "../UiObject";
import { HtmlContainer } from "../HtmlContainer";
import { ShpSpriteBatch } from "../ShpSpriteBatch";
import * as THREE from 'three';
import { Camera } from 'three';
import { PointerEvents } from '../PointerEvents';

interface SpriteProps {
  images?: any;
  image?: string | any;
  palette?: string | any;
  alignX?: number;
  alignY?: number;
  x?: number;
  y?: number;
  frame?: number;
  animationRunner?: any;
  hidden?: boolean;
  zIndex?: number;
  opacity?: number;
  transparent?: boolean;
  tooltip?: string;
  onFrame?: () => void;
  static?: boolean;
  [key: string]: any;
}

interface ContainerProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  hidden?: boolean;
  zIndex?: number;
  onFrame?: () => void;
  [key: string]: any;
}

interface MeshProps {
  x?: number;
  y?: number;
  hidden?: boolean;
  zIndex?: number;
  children?: any;
  [key: string]: any;
}

const hasImages = (props: SpriteProps): boolean => !!props.images;

export class JsxRenderer {
  private images: Map<string, any> | any;
  private palettes: Map<string, any> | any;
  private camera: Camera;
  private jsxIntrinsicRenderers: {
    [key: string]: (props: any) => { obj: any; children?: any[] };
  };

  constructor(images: Map<string, any> | any, palettes: Map<string, any> | any  , camera: Camera, pointerEvents?: PointerEvents) {
    this.images = images;
    this.palettes = palettes;
    this.camera = camera;
    
    this.jsxIntrinsicRenderers = {
      sprite: (props: SpriteProps) => {
        try {
          const imageName = typeof props.image === "string" ? props.image : (props.image?.filename ?? props.image?.name);
          const paletteName = typeof props.palette === "string" ? props.palette : (props.palette?.filename ?? props.palette?.name);
          const hasImage = typeof props.image === "string" ? this.images.has?.(props.image as string) : props.image !== undefined;
          const hasPalette = typeof props.palette === "string" ? this.palettes.has?.(props.palette as string) : props.palette !== undefined;
          console.log('[JsxRenderer] <sprite> request', { image: imageName, palette: paletteName, hasImage, hasPalette, x: props.x, y: props.y });
          if (!hasImage || !hasPalette) {
            console.warn('[JsxRenderer] Missing sprite props (image/palette). Full props:', props);
            // 打印堆栈用于定位调用方
            try { console.trace('[JsxRenderer] sprite trace'); } catch {}
          }
        } catch {}
        let sprite: UiObjectSprite;
        
        if (hasImages(props)) {
          // CanvasSpriteBuilder path not used by loading screen; keep unchanged here.
          const placeholder = new UiObject(new THREE.Object3D(), new HtmlContainer());
          return { obj: placeholder };
        } else {
          let image: any;
          let palette: any;
          try {
            console.log('[JsxRenderer] Resolving SHP resources...');
            console.log('[JsxRenderer] props.image:', props.image, 'props.palette:', props.palette);
            const imgName = props.image && typeof props.image === "string" ? props.image : (props.image?.filename ?? props.image?.name);
            const palName = props.palette && typeof props.palette === "string" ? props.palette : (props.palette?.filename ?? props.palette?.name);
            console.log('[JsxRenderer] names ->', { imgName, palName });
            image = props.image
              ? (typeof props.image === "string" ? this.getImage(props.image) : props.image)
              : undefined;
            palette = props.palette
              ? (typeof props.palette === "string" ? this.getPalette(props.palette) : props.palette)
              : undefined;
            console.log('[JsxRenderer] resolved ->', { image, palette, camera: this.camera });
            if (!image || !palette) {
              console.warn('[JsxRenderer] SHP resources unresolved (image/palette undefined).', { image, palette, props });
              try { console.trace('[JsxRenderer] unresolved trace'); } catch {}
            }
          } catch (e) {
            console.error('[JsxRenderer] Failed resolving SHP resources', e);
            throw e;
          }
          // Align with original: rely on getImage/getPalette throwing if missing
          sprite = UiObjectSprite.fromShpFile(image, palette, this.camera);
          // If UI asks for center anchor, setAlign(0,-1) at builder-level before first build
          if ((sprite as any).builder && (props.alignX !== undefined || props.alignY !== undefined)) {
            try {
              (sprite as any).builder.setAlign?.(props.alignX ?? 0, props.alignY ?? 0);
            } catch {}
          }
        }
        
        if (pointerEvents) {
          sprite.setPointerEvents(pointerEvents);
        }
        
        this.setupListeners(sprite, props);
        
        if (props.onFrame) {
          sprite.onFrame.subscribe(props.onFrame);
        }
        
        sprite.setPosition(props.x || 0, props.y || 0);
        
        if (props.frame !== undefined) {
          sprite.setFrame(props.frame);
        }
        
        if (props.animationRunner) {
          sprite.setAnimationRunner(props.animationRunner);
        }
        
        if (props.hidden) {
          sprite.setVisible(false);
        }
        
        if (props.zIndex) {
          sprite.setZIndex(props.zIndex);
        }
        
        if (props.opacity !== undefined) {
          sprite.setOpacity(props.opacity);
        }
        
        if (props.transparent !== undefined) {
          sprite.setTransparent(props.transparent);
        }
        
        if (props.tooltip !== undefined) {
          sprite.setTooltip(props.tooltip);
        }
        
        return { obj: sprite };
      },
      
      "sprite-batch": (props: { children?: any[] }) => {
        let children: any[] = [];
        if (props.children) {
          children = Array.isArray(props.children) 
            ? props.children.flat() 
            : [props.children];
        }
        
        let dynamicChildren: any[] = [];
        let staticSprites: any[] = [];
        
        for (const child of children) {
          if (child.type === "sprite" && child.props.static && !hasImages(child.props)) {
            staticSprites.push(child.props);
          } else {
            dynamicChildren.push(child);
          }
        }
        
        return {
          obj: new ShpSpriteBatch(
            staticSprites,
            (name: string) => this.getImage(name),
            (name: string) => this.getPalette(name),
            this.camera,
          ),
          children: [...dynamicChildren],
        };
      },
      
      container: (props: ContainerProps) => {
        let container = new UiObject(
          new THREE.Object3D(),
          new HtmlContainer(),
        );
        
        if (pointerEvents) {
          container.setPointerEvents(pointerEvents);
        }
        
        this.setupListeners(container, props);
        
        if (props.onFrame) {
          container.onFrame.subscribe(props.onFrame);
        }
        
        if (props.hidden) {
          container.setVisible(false);
        }
        
        if (props.zIndex) {
          container.setZIndex(props.zIndex);
        }
        
        container.setPosition(props.x || 0, props.y || 0);
        
        container.getHtmlContainer()?.setSize(props.width || 0, props.height || 0);
        
        return { obj: container };
      },
      
      mesh: (props: MeshProps) => {
        let mesh = new UiObject(props.children);
        
        if (pointerEvents) {
          mesh.setPointerEvents(pointerEvents);
        }
        
        this.setupListeners(mesh, props);
        mesh.setPosition(props.x || 0, props.y || 0);
        
        if (props.zIndex) {
          mesh.setZIndex(props.zIndex);
        }
        
        if (props.hidden) {
          mesh.setVisible(false);
        }
        
        return { obj: mesh };
      },
    };
  }

  private setupListeners(object: any, props: any): void {
    const eventMap: { [key: string]: string } = {
      click: "onClick",
      dblclick: "onDoubleClick",
      mousedown: "onMouseDown",
      mouseenter: "onMouseEnter",
      mouseleave: "onMouseLeave",
      mouseout: "onMouseOut",
      mouseover: "onMouseOver",
      mouseup: "onMouseUp",
      mousemove: "onMouseMove",
      wheel: "onWheel",
    };
    
    Object.keys(eventMap).forEach((eventType) => {
      const handler = props[eventMap[eventType]];
      if (handler) {
        object.addEventListener(eventType, handler);
      }
    });
  }

  public setCamera(camera: Camera): void {
    this.camera = camera;
  }

  private getImage(name: string): any {
    const image = this.images.get(name);
    if (!image) {
      throw new Error(`Missing image "${name}"`);
    }
    return image;
  }

  private getPalette(name: string): any {
    const palette = this.palettes.get(name);
    if (!palette) {
      throw new Error(`Missing palette "${name}"`);
    }
    return palette;
  }

  public render(jsx: any): any {
    return renderJsx(jsx, this.jsxIntrinsicRenderers);
  }
}