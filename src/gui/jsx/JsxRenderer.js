import { renderJsx } from "./jsx";
import { UiObjectSprite } from "../UiObjectSprite";
import { UiObject } from "../UiObject";
import { HtmlContainer } from "../HtmlContainer";
import { CanvasSpriteBuilder } from "../../engine/renderable/builder/CanvasSpriteBuilder";
import { ShpSpriteBatch } from "../ShpSpriteBatch";
import * as THREE from 'three';

const hasImages = (props) => !!props.images;

export class JsxRenderer {
  constructor(images, palettes, camera, pointerEvents) {
    this.images = images;
    this.palettes = palettes;
    this.camera = camera;
    
    this.jsxIntrinsicRenderers = {
      sprite: (props) => {
        console.log('[JsxRenderer] Creating sprite with props:', props);
        let sprite;
        
        if (hasImages(props)) {
          console.log('[JsxRenderer] Using CanvasSpriteBuilder');
          let builder = new CanvasSpriteBuilder(props.images, this.camera);
          builder.setAlign(props.alignX ?? 0, props.alignY ?? 0);
          sprite = new UiObjectSprite(builder);
        } else {
          console.log('[JsxRenderer] Using UiObjectSprite.fromShpFile');
          const image = typeof props.image === "string" 
            ? this.getImage(props.image) 
            : props.image;
          const palette = typeof props.palette === "string" 
            ? this.getPalette(props.palette) 
            : props.palette;
          console.log('[JsxRenderer] Image:', image);
          console.log('[JsxRenderer] Palette:', palette);
          console.log('[JsxRenderer] Camera:', this.camera);
          
          sprite = UiObjectSprite.fromShpFile(image, palette, this.camera);
          console.log('[JsxRenderer] Created sprite:', sprite);
          console.log('[JsxRenderer] Sprite constructor name:', sprite.constructor.name);
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
        
        console.log('[JsxRenderer] Returning sprite object:', sprite);
        return { obj: sprite };
      },
      
      "sprite-batch": (props) => {
        let children = [];
        if (props.children) {
          children = Array.isArray(props.children) 
            ? props.children.flat() 
            : [props.children];
        }
        
        let dynamicChildren = [];
        let staticSprites = [];
        
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
            (name) => this.getImage(name),
            (name) => this.getPalette(name),
            this.camera,
          ),
          children: [...dynamicChildren],
        };
      },
      
      container: (props) => {
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
      
      mesh: (props) => {
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

  setupListeners(object, props) {
    const eventMap = {
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

  setCamera(camera) {
    this.camera = camera;
  }

  getImage(name) {
    const image = this.images.get(name);
    if (!image) {

      
      throw new Error(`Missing image "${name}"`);
    }
    return image;
  }

  getPalette(name) {
    const palette = this.palettes.get(name);
    if (!palette) {
      throw new Error(`Missing palette "${name}"`);
    }
    return palette;
  }

  render(jsx) {
    return renderJsx(jsx, this.jsxIntrinsicRenderers);
  }
} 