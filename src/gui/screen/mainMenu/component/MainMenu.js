import { jsx } from "../../../jsx/jsx";
import { UiObject } from "../../../UiObject";
import { HtmlContainer } from "../../../HtmlContainer";
import { MenuVideo } from "./MenuVideo";
import { MenuButton } from "../../../component/MenuButton";
import { EventDispatcher } from "../../../../util/event";
import { MenuSlotAnimationRunner, MenuButtonState } from "./MenuSlotAnimationRunner";
import { HtmlView } from "../../../jsx/HtmlView";
import { MenuMpSlotAnimRunner } from "./MenuMpSlotAnimRunner";
import { MenuMpSlotText } from "./MenuMpSlotText";
import { SidebarPreview } from "./SidebarPreview";
import { MenuTooltip } from "./MenuTooltip";
import { VersionString } from "./VersionString";
import * as THREE from 'three';

export class MainMenu extends UiObject {
  constructor(viewport, images, jsxRenderer, videoSrc) {
    super(new THREE.Object3D(), new HtmlContainer());
    
    this.viewport = viewport;
    this.images = images;
    this.jsxRenderer = jsxRenderer;
    this.videoSrc = videoSrc;
    this.rootObjects = [];
    this.sidebarObjects = [];
    this.sidebarSlots = [];
    this.sidebarMpSlotEnabled = false;
    this.sidebarButtons = [];
    this.sidebarButtonConfigs = [];
    this.sidebarCollapsed = true;
    this._onSidebarToggle = new EventDispatcher();
    
    this.create3DObject();
  }

  get onSidebarToggle() {
    return this._onSidebarToggle;
  }

  setViewport(viewport) {
    this.viewport = viewport;
    this.setPosition(this.viewport.x, this.viewport.y);
    
    const statusBarImage = this.getImage("lwscrnl.shp");
    this.statusBar.setPosition(0, this.viewport.height - statusBarImage.height);
    
    const sidebarImage = this.getImage("sdtp.shp");
    const sidebarViewport = this.computeSidebarViewport(sidebarImage);
    this.sidebarContainer.setPosition(sidebarViewport.x, sidebarViewport.y);
    this.sidebarContainer.remove(...this.sidebarObjects);
    this.sidebarObjects.forEach((obj) => obj.destroy());
    
    this.createSidebarButtons(this.computeSidebarButtonsViewport(sidebarImage));
    this.updateButtons(this.sidebarButtonsRawConfigs ?? []);
    
    if (!this.sidebarCollapsed) {
      this.showButtons();
    }
  }

  setContentComponent(component) {
    let container = this.mainContainer;
    if (this.contentComponent) {
      container.remove(this.contentComponent);
      this.contentComponent.destroy();
      this.contentComponent = undefined;
    }
    if (component) {
      container.add(component);
      this.contentComponent = component;
    }
  }

  setSlots(slotCount, hasBottomSlot, mpSlotEnabled = false) {
    let totalSlots = this.sidebarSlots.length;
    if (!totalSlots) {
      throw new Error("Cannot call setButtons prior to render");
    }
    
    this.sidebarMpSlotContainer.setVisible(mpSlotEnabled);
    this.sidebarSlots[0].setVisible(!mpSlotEnabled);
    
    this.sidebarSlots.forEach((slot, index) => {
      let animRunner = slot.getAnimationRunner();
      if (index < slotCount + (mpSlotEnabled ? 1 : 0)) {
        animRunner.buttonState = MenuButtonState.Unlit;
      } else if (index === totalSlots - 1) {
        animRunner.buttonState = hasBottomSlot 
          ? MenuButtonState.Unlit 
          : MenuButtonState.Hidden;
      } else {
        animRunner.buttonState = MenuButtonState.Hidden;
      }
    });
  }

  setButtons(buttons, mpSlotEnabled = false) {
    console.log('[MainMenu] setButtons called, sidebarButtons.length:', this.sidebarButtons.length);
    this.sidebarButtonsRawConfigs = buttons;
    this.sidebarMpSlotEnabled = mpSlotEnabled;
    this.updateButtons(buttons);
  }

  updateButtons(buttons) {
    console.log('[MainMenu] updateButtons called, sidebarButtons.length:', this.sidebarButtons.length);
    let mpSlotEnabled = this.sidebarMpSlotEnabled;
    const hasBottomButton = !!buttons.find((btn) => !!btn.isBottom);
    
    this.setSlots(buttons.length - (hasBottomButton ? 1 : 0), hasBottomButton, mpSlotEnabled);
    this.updateSidebarMpContent();
    
    this.sidebarButtons.forEach((btn) =>
      btn.applyOptions((options) => (options.buttonConfig = undefined))
    );
    
    buttons.forEach((buttonConfig, index) => {
      const slotIndex = buttonConfig.isBottom
        ? this.sidebarButtons.length - 1
        : mpSlotEnabled
          ? index + 1
          : index;
      
      console.log('[MainMenu] Setting button config for slotIndex:', slotIndex, 'buttonConfig:', buttonConfig);
      this.sidebarButtonConfigs[slotIndex] = buttonConfig;
      
      if (this.sidebarButtons[slotIndex]) {
        this.sidebarButtons[slotIndex].applyOptions(
          (options) => (options.buttonConfig = {
            label: buttonConfig.label,
            tooltip: buttonConfig.tooltip,
            disabled: !!buttonConfig.disabled,
          })
        );
      } else {
        console.warn('[MainMenu] sidebarButtons[' + slotIndex + '] is undefined');
      }
    });
    
    this.sidebarNeedsRefresh = true;
  }

  isSidebarCollapsed() {
    return this.sidebarCollapsed;
  }

  showButtons() {
    this.sidebarCollapsed = false;
    this.sidebarNeedsRefresh = true;
    this.sidebarMpSlot.getAnimationRunner().slideIn();
    this.sidebarSlots.forEach((slot) => {
      let animRunner = slot.getAnimationRunner();
      animRunner.slideIn();
    });
  }

  hideButtons() {
    this.sidebarCollapsed = true;
    this.updateSidebarButtons();
    this.sidebarNeedsRefresh = true;
    this.sidebarMpSlot.getAnimationRunner().slideOut();
    this.sidebarSlots.forEach((slot) => {
      let animRunner = slot.getAnimationRunner();
      animRunner.slideOut();
    });
  }

  setSidebarTitle(title) {
    this.sidebarPreview.setTitle(title);
  }

  toggleSidebarPreview(visible) {
    this.sidebarPreview.toggleSidebarPreview(visible);
  }

  setSidebarPreview(preview) {
    if (this.sidebarPreviewInner) {
      this.sidebarPreviewInner.destroy();
    }
    this.sidebarPreview.setPreview(preview);
    this.sidebarPreviewInner = preview;
  }

  getSidebarPreviewSize() {
    return this.sidebarPreview.getPreviewSize();
  }

  toggleVideo(visible) {
    console.log('[MainMenu] toggleVideo called, visible:', visible, 'menuVideo exists:', !!this.menuVideo);
    if (!this.menuVideo) {
      throw new Error("Cannot call toggleVideo prior to render");
    }
    this.menuVideo.getUiObject().setVisible(visible);
    console.log('[MainMenu] Video visibility set to:', visible);
  }

  showVersion(version) {
    console.log('[MainMenu] showVersion called, version:', version, 'version element exists:', !!this.version);
    this.version.getUiObject().setVisible(true);
    this.version.getElement().applyOptions((options) => (options.value = version));
    console.log('[MainMenu] Version shown:', version);
  }

  hideVersion() {
    this.version.getUiObject().setVisible(false);
  }

  setSidebarMpContent(content) {
    this.sidebarMpSlotContent = content;
    this.updateSidebarMpContent();
  }

  updateSidebarMpContent() {
    this.sidebarMpSlotContentEl.applyOptions((options) => {
      if (this.sidebarMpSlotContent) {
        options.text = this.sidebarMpSlotContent.text;
        options.icon = this.sidebarMpSlotContent.icon;
        options.tooltip = this.sidebarMpSlotContent.tooltip;
      }
    });
  }

  getImage(name) {
    const image = this.images.get(name);
    if (!image) {
      throw new Error(`Missing image "${name}"`);
    }
    return image;
  }

  create3DObject() {
    console.log('[MainMenu] Creating 3D object');
    super.create3DObject();
    
    if (!this.rootObjects.length) {
      console.log('[MainMenu] Creating root objects');
      this.setPosition(this.viewport.x, this.viewport.y);
      
      const mainImage = this.getImage("mnscrnl.shp");
      const statusBarImage = this.getImage("lwscrnl.shp");
      const sidebarImage = this.getImage("sdtp.shp");
      const sidebarAnimImage = this.getImage("sdwrnanm.shp");
      const sidebarViewport = this.computeSidebarViewport(sidebarImage);
      
      console.log('[MainMenu] Image sizes:');
      console.log('  mainImage:', mainImage.width, 'x', mainImage.height);
      console.log('  statusBarImage:', statusBarImage.width, 'x', statusBarImage.height);
      console.log('  sidebarImage:', sidebarImage.width, 'x', sidebarImage.height);
      console.log('[MainMenu] Viewport:', this.viewport);
      console.log('[MainMenu] Status bar position will be:', 0, this.viewport.height - statusBarImage.height);
      
      // Calculate correct status bar position
      const statusBarY = this.viewport.height - statusBarImage.height;
      console.log('[MainMenu] Status bar position:', 0, statusBarY);
      console.log('[MainMenu] Camera is inverted, so Y coordinates might need adjustment');
      
      this.rootObjects = this.jsxRenderer.render(
        jsx(
          "fragment",
          null,

          jsx(
            "container",
            {
              width: mainImage.width,
              height: mainImage.height,
              ref: (ref) => (this.mainContainer = ref),
            },
            jsx("sprite", { image: mainImage, palette: "shell.pal" }),
            jsx(HtmlView, {
              component: MenuVideo,
              props: { src: this.videoSrc },
              hidden: true,
              ref: (ref) => (this.menuVideo = ref),
            }),
          ),
          jsx(
            "container",
            {
              x: 0,
              y: statusBarY,
              ref: (ref) => (this.statusBar = ref),
            },
            jsx("sprite", { image: statusBarImage, palette: "shell.pal" }),
            jsx(HtmlView, {
              component: MenuTooltip,
              props: { monitorContainer: this.getHtmlContainer() },
              width: statusBarImage.width,
              height: statusBarImage.height,
            }),
          ),
          jsx(
            "container",
            {
              x: sidebarViewport.x,
              y: sidebarViewport.y,
              ref: (ref) => (this.sidebarContainer = ref),
            },
            jsx(SidebarPreview, {
              sdtpImg: sidebarImage,
              sdtpAnimImg: sidebarAnimImage,
              closed: true,
              ref: (ref) => (this.sidebarPreview = ref),
            }),
            jsx(HtmlView, {
              component: VersionString,
              props: { value: "" },
              width: sidebarViewport.width,
              y: sidebarViewport.height - 20,
              ref: (ref) => (this.version = ref),
              hidden: true,
            }),
          ),
        ),
      );
      
      console.log('[MainMenu] JSX rendered, rootObjects count:', this.rootObjects.length);
      console.log('[MainMenu] Root objects:', this.rootObjects);
      
      this.add(...this.rootObjects);
      this.createSidebarButtons(this.computeSidebarButtonsViewport(sidebarImage));
    }
  }

  createSidebarButtons(viewport) {
    let buttonBgImage = this.getImage("sdbtnbkgd.shp");
    let buttonAnimImage = this.getImage("sdbtnanm.shp");
    const slotCount = Math.floor(viewport.height / buttonBgImage.height);
    let bottomImage = this.getImage("sdbtm.shp");
    const remainingHeight = viewport.height - buttonBgImage.height * slotCount;
    const clippedBottomImage = bottomImage.clip(bottomImage.width, remainingHeight);
    
    this.sidebarSlots = [];
    this.sidebarButtons = [];
    
    this.sidebarObjects = this.jsxRenderer.render(
      jsx(
        "fragment",
        null,
        new Array(slotCount).fill(0).map((_, slotIndex) => {
          let animRunner = new MenuSlotAnimationRunner(slotIndex);
          return jsx(
            "fragment",
            null,
            jsx(
              "container",
              { x: viewport.x, y: viewport.y + buttonBgImage.height * slotIndex },
              jsx("sprite", { image: buttonBgImage, palette: "shell2.pal" }),
              !slotIndex
                ? jsx(
                    "container",
                    {
                      zIndex: 1,
                      hidden: true,
                      ref: (ref) => (this.sidebarMpSlotContainer = ref),
                      x: 12,
                      y: -buttonBgImage.height,
                    },
                    jsx("sprite", {
                      image: "sdmpbtn.shp",
                      palette: "shell.pal",
                      ref: (ref) => (this.sidebarMpSlot = ref),
                      animationRunner: new MenuMpSlotAnimRunner(),
                    }),
                    jsx(HtmlView, {
                      component: MenuMpSlotText,
                      props: { text: "" },
                      width: 146,
                      height: 2 * buttonBgImage.height,
                      innerRef: (ref) => (this.sidebarMpSlotContentEl = ref),
                    }),
                  )
                : [],
              jsx("sprite", {
                image: buttonAnimImage,
                palette: "sdbtnanm.pal",
                ref: (ref) => this.sidebarSlots.push(ref),
                x: 12,
                animationRunner: animRunner,
              }),
              jsx(HtmlView, {
                x: 12,
                hidden: true,
                innerRef: (ref) => this.sidebarButtons.push(ref),
                component: MenuButton,
                props: {
                  box: { x: 0, y: 0, width: 146, height: buttonAnimImage.height },
                  buttonConfig: null, // 初始化为null，后续会通过applyOptions设置
                  onMouseDown: () => {
                    animRunner.buttonState = MenuButtonState.Active;
                    let mouseUpHandler = () => {
                      animRunner.buttonState = MenuButtonState.Normal;
                      document.removeEventListener("mouseup", mouseUpHandler);
                    };
                    document.addEventListener("mouseup", mouseUpHandler);
                  },
                  onClick: () => {
                    this.onSidebarButtonClick(slotIndex);
                  },
                },
              }),
            ),
          );
        }),
        jsx("sprite", {
          image: clippedBottomImage,
          palette: "shell.pal",
          x: viewport.x,
          y: viewport.y + buttonBgImage.height * slotCount,
        }),
      ),
    );
    
    this.sidebarContainer.add(...this.sidebarObjects);
  }

  computeSidebarViewport(sidebarImage) {
    return {
      x: this.viewport.width - sidebarImage.width,
      y: 0,
      width: sidebarImage.width,
      height: this.viewport.height,
    };
  }

  computeSidebarButtonsViewport(sidebarImage) {
    return {
      x: 0,
      y: sidebarImage.height,
      width: sidebarImage.width,
      height: this.viewport.height - sidebarImage.height,
    };
  }

  update(deltaTime) {
    super.update(deltaTime);
    
    if (this.sidebarNeedsRefresh) {
      let lastSlot = this.sidebarSlots[this.sidebarSlots.length - 1];
      let animRunner = lastSlot.getAnimationRunner();
      if (animRunner.isStopped()) {
        this.updateSidebarButtons();
        this._onSidebarToggle.dispatch(this, !this.sidebarCollapsed);
      }
    }
  }

  updateSidebarButtons() {
    if (this.sidebarCollapsed) {
      this.sidebarButtons.forEach((btn) => btn.hide());
      this.sidebarMpSlotContentEl.hide();
      this.sidebarSlots.forEach((slot) => {
        let animRunner = slot.getAnimationRunner();
        if (animRunner.buttonState === MenuButtonState.Normal) {
          animRunner.buttonState = MenuButtonState.Unlit;
        }
      });
    } else {
      this.sidebarButtons.forEach((btn) => btn.show());
      this.sidebarMpSlotContentEl.show();
      this.sidebarSlots.forEach((slot) => {
        let animRunner = slot.getAnimationRunner();
        if (animRunner.buttonState === MenuButtonState.Unlit) {
          animRunner.buttonState = MenuButtonState.Normal;
        }
      });
    }
    this.sidebarNeedsRefresh = false;
  }

  onSidebarButtonClick(slotIndex) {
    const onClick = this.sidebarButtonConfigs[slotIndex].onClick;
    if (onClick) {
      onClick();
    }
  }

  destroy() {
    this.sidebarButtons.length = 0;
    this.remove(...this.rootObjects);
    this.rootObjects.forEach((obj) => obj.destroy());
    this.rootObjects.length = 0;
    super.destroy();
  }
} 