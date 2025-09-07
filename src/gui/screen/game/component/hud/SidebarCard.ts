import * as jsx from "@/gui/jsx/jsx";
import * as SidebarModel from "@/gui/screen/game/component/hud/viewmodel/SidebarModel";
import { UiObject } from "@/gui/UiObject";
import { UiComponent, UiComponentProps } from "@/gui/jsx/UiComponent";
import { OverlayUtils } from "@/engine/gfx/OverlayUtils";
import { HtmlContainer } from "@/gui/HtmlContainer";
import { clamp } from "@/util/math";
import { CombatantSidebarModel } from "@/gui/screen/game/component/hud/viewmodel/CombatantSidebarModel";
import { ObjectArt } from "@/game/art/ObjectArt";

declare const THREE: any;

enum LabelType {
  Ready = 0,
  OnHold = 1
}

interface SidebarCardProps extends UiComponentProps {
  x?: number;
  y?: number;
  zIndex?: number;
  slots: number;
  cameoImages: any;
  cameoPalette: string;
  sidebarModel: any;
  onSlotClick?: (event: any) => void;
  textColor: string;
  cameoNameToIdMap: Map<string, number>;
  strings: any;
}

interface SlotClickEvent {
  target: any;
  button: number;
  altKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
  isTouch: boolean;
  touchDuration: number;
}

export class SidebarCard extends UiComponent<SidebarCardProps> {
  static readonly MAX_QUANTITY = 99;
  static readonly labelImageCache = new Map<string, any[]>();
  static readonly quantityImageCache = new Map<string, any[]>();

  private slotContainers: any[] = [];
  private slotObjects: any[] = [];
  private progressOverlays: any[] = [];
  private visible: boolean = true;
  private labelObjects: any[] = [];
  private quantityObjects: any[] = [];
  private justCreated: boolean = true;
  private lastItemCount: number = 0;
  private pagingOffset: number = 0;
  private slotOutline!: UiObject;
  private labelImages!: any[];
  private quantityImages!: any[];
  private lastActiveTab?: any;
  private hoverSlotIndex?: number;

  constructor(props: SidebarCardProps) {
    super(props);
    this.handleWheel = (e: any) => {
      this.scrollToOffset(
        this.pagingOffset + (0 < e.wheelDeltaY ? 2 : -2),
      );
    };
  }

  createUiObject(): UiObject {
    const uiObject = new UiObject(
      new THREE.Object3D(),
      new HtmlContainer(),
    );
    uiObject.setPosition(this.props.x || 0, this.props.y || 0);
    uiObject.onFrame.subscribe(() => this.handleFrame());
    this.slotOutline = new UiObject(this.createSlotOutline());
    this.slotOutline.setVisible(false);
    this.slotOutline.setZIndex((this.props.zIndex ?? 0) + 1);
    uiObject.add(this.slotOutline);
    
    let labelImages = SidebarCard.labelImageCache.get(this.props.textColor);
    if (!labelImages) {
      labelImages = this.createLabelImages(this.props.textColor);
      SidebarCard.labelImageCache.set(this.props.textColor, labelImages);
    }
    this.labelImages = labelImages;
    
    let quantityImages = SidebarCard.quantityImageCache.get(this.props.textColor);
    if (!quantityImages) {
      quantityImages = this.createQuantityImages(this.props.textColor);
      SidebarCard.quantityImageCache.set(this.props.textColor, quantityImages);
    }
    this.quantityImages = quantityImages;
    
    return uiObject;
  }

  defineChildren(): any[] {
    const {
      slots,
      cameoImages,
      cameoPalette,
      sidebarModel,
      onSlotClick,
      zIndex,
    } = this.props;
    const cameoSize = this.getCameoSize();
    const horizontalSpacing = 3;
    const verticalSpacing = 2;
    const children = [];
    
    for (let slotIndex = 0; slotIndex < slots; slotIndex++) {
      const position = {
        x: (horizontalSpacing + cameoSize.width) * (slotIndex % 2),
        y: (verticalSpacing + cameoSize.height) * Math.floor(slotIndex / 2),
      };
      
      children.push(
        jsx.jsx(
          "container",
          {
            x: position.x,
            y: position.y,
            zIndex: zIndex,
            ref: (element: any) => this.slotContainers.push(element),
            onWheel: this.handleWheel,
            onClick: (event: any) => {
              const item = sidebarModel.activeTab.items[this.getItemIndexAtSlot(slotIndex)];
              if (item && !item.disabled) {
                onSlotClick?.(this.createSlotClickEvent(item, event));
              }
            },
            onMouseEnter: () => {
              const item = sidebarModel.activeTab.items[this.getItemIndexAtSlot(slotIndex)];
              if (item) {
                if (!item.disabled) {
                  this.slotOutline.setPosition(position.x, position.y);
                }
                this.slotOutline.setVisible(!item.disabled);
                this.hoverSlotIndex = slotIndex;
              }
            },
            onMouseLeave: () => {
              if (this.hoverSlotIndex === slotIndex) {
                this.slotOutline.setVisible(false);
                this.hoverSlotIndex = undefined;
              }
            },
          },
          jsx.jsx("sprite", {
            image: "gclock2.shp",
            palette: "sidebar.pal",
            zIndex: 1,
            frame: 0,
            opacity: 0.5,
            transparent: true,
            ref: (element: any) => this.progressOverlays.push(element),
          }),
          jsx.jsx("sprite", {
            images: this.labelImages,
            zIndex: 2,
            x: cameoSize.width / 2,
            transparent: true,
            ref: (element: any) => this.labelObjects.push(element),
          }),
          jsx.jsx("sprite", {
            images: this.quantityImages,
            zIndex: 2,
            x: cameoSize.width,
            alignX: 1,
            alignY: -1,
            transparent: true,
            ref: (element: any) => this.quantityObjects.push(element),
          }),
          jsx.jsx("sprite", {
            image: cameoImages,
            palette: cameoPalette,
            ref: (element: any) => this.slotObjects.push(element),
          }),
        ),
      );
    }
    return children;
  }

  createSlotClickEvent(item: any, event: any): SlotClickEvent {
    return {
      target: item.target,
      button: event.button,
      altKey: event.altKey,
      ctrlKey: event.ctrlKey,
      metaKey: event.metaKey,
      shiftKey: event.shiftKey,
      isTouch: event.isTouch,
      touchDuration: event.touchDuration,
    };
  }

  handleFrame(): void {
    const { sidebarModel, slots } = this.props;
    const obj3D = this.getUiObject().get3DObject();
    obj3D.visible = this.visible;
    
    if (this.justCreated ||
        sidebarModel.activeTab.needsUpdate ||
        this.lastActiveTab !== sidebarModel.activeTab) {
      this.justCreated = false;
      const itemCount = sidebarModel.activeTab.items.length;
      
      if (this.lastActiveTab !== sidebarModel.activeTab ||
          this.lastItemCount !== itemCount) {
        if (this.lastItemCount > itemCount) {
          this.pagingOffset = 0;
        }
        this.lastItemCount = itemCount;
      }
      
      this.lastActiveTab = sidebarModel.activeTab;
      sidebarModel.activeTab.needsUpdate = false;
      this.updateSlots(sidebarModel.activeTab.items, slots);
    }
  }

  updateSlots(items: any[], slotCount: number): void {
    for (let slotIndex = 0; slotIndex < slotCount; slotIndex++) {
      const item = items[this.getItemIndexAtSlot(slotIndex)];
      const slotObject = this.slotObjects[slotIndex];
      const progressOverlay = this.progressOverlays[slotIndex];
      const labelObject = this.labelObjects[slotIndex];
      const quantityObject = this.quantityObjects[slotIndex];
      
      if (items.length - this.pagingOffset <= slotIndex) {
        slotObject.get3DObject().visible = false;
        progressOverlay.get3DObject().visible = false;
        labelObject.get3DObject().visible = false;
        quantityObject.get3DObject().visible = false;
      } else {
        this.updateCameo(item, slotObject);
        this.updateProgressOverlay(item, progressOverlay);
        this.updateStatusText(item, labelObject);
        this.updateQuantities(item, quantityObject);
        this.updateTooltip(item, this.slotContainers[slotIndex]);
      }
    }
  }

  updateCameo(item: any, slotObject: any): void {
    const cameoNameToIdMap = this.props.cameoNameToIdMap;
    let cameoName = item.cameo + ".shp";
    let frameId = cameoNameToIdMap.get(cameoName);
    
    if (frameId === undefined) {
      cameoName = ObjectArt.MISSING_CAMEO + ".shp";
      frameId = cameoNameToIdMap.get(cameoName);
    }
    
    if (frameId === undefined) {
      throw new Error(
        `Missing cameo placeholder image "${ObjectArt.MISSING_CAMEO}.shp"`,
      );
    }
    
    slotObject.setFrame(frameId);
    slotObject.get3DObject().visible = true;
    slotObject.setLightMult(item.disabled ? 0.5 : 1);
  }

  updateProgressOverlay(item: any, progressOverlay: any): void {
    let frame = 0;
    
    if ([SidebarModel.SidebarItemStatus.Started, SidebarModel.SidebarItemStatus.OnHold].includes(item.status)) {
      const frameCount = progressOverlay.getFrameCount();
      frame = Math.max(1, Math.ceil(item.progress * (frameCount - 1))) % frameCount;
    }
    
    progressOverlay.setFrame(frame);
    progressOverlay.get3DObject().visible = frame > 0;
  }

  updateStatusText(item: any, labelObject: any): void {
    const isVisible = [SidebarModel.SidebarItemStatus.Ready, SidebarModel.SidebarItemStatus.OnHold].includes(item.status);
    labelObject.get3DObject().visible = isVisible;
    
    if (item.status === SidebarModel.SidebarItemStatus.Ready) {
      labelObject.setFrame(LabelType.Ready);
      labelObject.setPosition(
        this.getCameoSize().width / 2,
        labelObject.getPosition().y,
      );
      labelObject.builder.setAlign(0, -1);
    } else if (item.status === SidebarModel.SidebarItemStatus.OnHold) {
      labelObject.setFrame(LabelType.OnHold);
      const xPos = item.quantity > 1 ? 0 : this.getCameoSize().width / 2;
      labelObject.setPosition(xPos, labelObject.getPosition().y);
      labelObject.builder.setAlign(item.quantity > 1 ? -1 : 0, -1);
    }
  }

  updateQuantities(item: any, quantityObject: any): void {
    const threshold = item.status === SidebarModel.SidebarItemStatus.InQueue ? 0 : 1;
    
    if (item.quantity > threshold) {
      const frame = item.quantity > SidebarCard.MAX_QUANTITY
        ? SidebarCard.MAX_QUANTITY
        : item.quantity - 1;
      quantityObject.setFrame(frame);
      quantityObject.setVisible(true);
    } else {
      quantityObject.setVisible(false);
    }
  }

  updateTooltip(item: any, container: any): void {
    let tooltip: string;
    
    if (item.target.type === SidebarModel.SidebarItemTargetType.Techno) {
      let cost = item.target.rules.cost;
      if (this.props.sidebarModel instanceof CombatantSidebarModel) {
        cost = this.props.sidebarModel.computePurchaseCost(item.target.rules);
      }
      tooltip = this.props.strings.get(item.target.rules.uiName) + "\n$" + cost;
    } else if (item.target.type === SidebarModel.SidebarItemTargetType.Special) {
      tooltip = this.props.strings.get(item.target.rules.uiName);
    } else {
      throw new Error(`Type "${item.target.type}" not implemented`);
    }
    
    container.setTooltip(tooltip);
  }

  getItemIndexAtSlot(slotIndex: number): number {
    return slotIndex + this.pagingOffset;
  }

  getCameoSize(): { width: number; height: number } {
    return {
      width: this.props.cameoImages.width,
      height: this.props.cameoImages.height,
    };
  }

  createSlotOutline(): any {
    const cameoSize = this.getCameoSize();
    const width = cameoSize.width;
    const height = cameoSize.height;
    
    const geometry = new THREE.Geometry();
    geometry.vertices.push(
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, height, 0),
      new THREE.Vector3(width, height, 0),
      new THREE.Vector3(width, 0, 0),
      new THREE.Vector3(0, 0, 0),
    );
    
    const material = new THREE.LineBasicMaterial({
      color: this.props.textColor,
      transparent: true,
      side: THREE.DoubleSide,
    });
    
    return new THREE.Line(geometry, material);
  }

  hide(): void {
    this.visible = false;
  }

  show(): void {
    this.visible = true;
  }

  scrollToOffset(offset: number): boolean {
    const oldOffset = this.pagingOffset;
    const maxOffset = Math.max(
      0,
      this.props.sidebarModel.activeTab.items.length - this.props.slots,
    );
    
    this.pagingOffset = clamp(offset, 0, maxOffset);
    
    // Ensure even offset for proper 2-column layout
    if (this.pagingOffset % 2) {
      this.pagingOffset++;
    }
    
    this.updateSlots(
      this.props.sidebarModel.activeTab.items,
      this.props.slots,
    );
    
    return oldOffset !== this.pagingOffset;
  }

  pageDown(): boolean {
    return this.scrollToOffset(
      this.pagingOffset + this.props.slots,
    );
  }

  pageUp(): boolean {
    return this.scrollToOffset(
      this.pagingOffset - this.props.slots,
    );
  }

  createLabelImages(textColor: string): any[] {
    const labels = [
      { text: this.props.strings.get("TXT_READY"), type: LabelType.Ready },
      { text: this.props.strings.get("TXT_HOLD"), type: LabelType.OnHold },
    ];
    return labels.map((label) => this.createTextBox(label.text, textColor));
  }

  createQuantityImages(textColor: string): any[] {
    const style = { paddingRight: 2 };
    const images = new Array(SidebarCard.MAX_QUANTITY)
      .fill(0)
      .map((_, index) => this.createTextBox("" + (index + 1), textColor, style));
    images.push(this.createTextBox("∞", textColor, style));
    return images;
  }

  createTextBox(text: string, color: string, additionalStyle?: any): any {
    return OverlayUtils.createTextBox(text, {
      color,
      backgroundColor: "rgba(0, 0, 0, .5)",
      fontFamily: "'Fira Sans Condensed', Arial, sans-serif",
      fontSize: 12,
      fontWeight: "500",
      paddingTop: 5,
      paddingBottom: 5,
      paddingLeft: 2,
      paddingRight: 4,
      ...additionalStyle,
    });
  }
}