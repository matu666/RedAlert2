import { UiScene } from './UiScene';
import { JsxRenderer } from './jsx/JsxRenderer';
import { RootController } from './screen/RootController';
import { MainMenuRootScreen } from './screen/mainMenu/MainMenuRootScreen';
import { HomeScreen } from './screen/mainMenu/main/HomeScreen';
import { MainMenuScreenType, ScreenType } from './screen/ScreenType';
import { Strings } from '../data/Strings';
import { ShpFile } from '../data/ShpFile';
import { Palette } from '../data/Palette';
import { BoxedVar } from '../util/BoxedVar';
import { Engine } from '../engine/Engine';
import { Renderer } from '../engine/gfx/Renderer';
import { UiAnimationLoop } from '../engine/UiAnimationLoop';

export class Gui {
  private appVersion: string;
  private strings: Strings;
  private viewport: BoxedVar<{ x: number; y: number; width: number; height: number }>;
  private rootEl: HTMLElement;

  // Rendering
  private renderer?: Renderer;
  private uiScene?: UiScene;
  private jsxRenderer?: JsxRenderer;
  private uiAnimationLoop?: UiAnimationLoop;
  
  // Controllers
  private rootController?: RootController;
  
  // Resources
  private images: Map<string, ShpFile> = new Map();
  private palettes: Map<string, Palette> = new Map();
  
  // Animation loop
  private animationId?: number;
  private lastTime: number = 0;

  constructor(
    appVersion: string,
    strings: Strings,
    viewport: BoxedVar<{ x: number; y: number; width: number; height: number }>,
    rootEl: HTMLElement
  ) {
    this.appVersion = appVersion;
    this.strings = strings;
    this.viewport = viewport;
    this.rootEl = rootEl;
  }

  async init(): Promise<void> {
    console.log('[Gui] Initializing GUI system');
    
    // Initialize renderer
    this.initRenderer();
    
    // Initialize UI scene
    this.initUiScene();
    
    // Load game resources
    await this.loadGameResources();
    
    // Initialize JSX renderer
    this.initJsxRenderer();
    
    // Initialize root controller
    this.initRootController();
    
    // Start animation loop (already started by UiAnimationLoop)
    this.startAnimationLoop();
    
    // Navigate to main menu
    await this.navigateToMainMenu();
  }

  private initRenderer(): void {
    console.log('[Gui] Initializing renderer');
    
    const { width, height } = this.viewport.value;
    this.renderer = new Renderer(width, height);
    this.renderer.init(this.rootEl);
    
    // Create and start UiAnimationLoop (match original project)
    this.uiAnimationLoop = new UiAnimationLoop(this.renderer);
    this.uiAnimationLoop.start();
    console.log('[Gui] UiAnimationLoop started');
    
    // Handle viewport changes (match original project)
    this.viewport.onChange.subscribe(this.handleViewportChange.bind(this));
  }

  private handleViewportChange(newViewport: { x: number; y: number; width: number; height: number }): void {
    console.log('[Gui] Viewport changed:', newViewport);
    
    // Update renderer size
    this.renderer?.setSize(newViewport.width, newViewport.height);
    
    if (this.uiScene) {
      // Create new camera for the new viewport
      const newCamera = UiScene.createCamera(newViewport);
      this.uiScene.setCamera(newCamera);
      this.uiScene.setViewport(newViewport);
      
      // Update JSX renderer camera
      if (this.jsxRenderer) {
        this.jsxRenderer.setCamera(newCamera);
      }
      
      // Rerender current screen
      this.rootController?.rerenderCurrentScreen();
    }
  }

  private initUiScene(): void {
    console.log('[Gui] Initializing UI scene');
    this.uiScene = UiScene.factory(this.viewport.value);
  }

  private initJsxRenderer(): void {
    console.log('[Gui] Initializing JSX renderer');
    
    if (!this.uiScene) {
      throw new Error('UiScene must be initialized before JsxRenderer');
    }
    
    // Use Engine's LazyResourceCollections directly since they have VFS access
    this.jsxRenderer = new JsxRenderer(
      Engine.images,
      Engine.palettes,
      this.uiScene.getCamera()
    );
  }

  private initRootController(): void {
    console.log('[Gui] Initializing root controller');
    this.rootController = new RootController();
  }

  private async loadGameResources(): Promise<void> {
    console.log('[Gui] Loading game resources');
    
    // Check if Engine.vfs is available
    if (!Engine.vfs) {
      console.warn('[Gui] Engine.vfs not available - skipping resource loading');
      return;
    }
    
    // Ensure Engine's LazyResourceCollections are connected to VFS
    Engine.images.setVfs(Engine.vfs);
    Engine.palettes.setVfs(Engine.vfs);
    
    console.log('[Gui] Engine LazyResourceCollections configured with VFS');
    
    // Test loading a few essential images to verify they work
    const testImages = ['mnscrnl.shp', 'lwscrnl.shp', 'sdtp.shp'];
    for (const imageName of testImages) {
      try {
        const shpFile = Engine.images.get(imageName);
        if (shpFile) {
          console.log(`[Gui] Successfully loaded test image: ${imageName} (${shpFile.width}x${shpFile.height})`);
        } else {
          console.warn(`[Gui] Failed to load test image: ${imageName}`);
        }
      } catch (error) {
        console.warn(`[Gui] Error loading test image ${imageName}:`, error);
      }
    }
  }

  private async getMainMenuVideoUrl(): Promise<string | File | undefined> {
    console.log('[Gui] Getting main menu video URL');
    
    const videoFileName = Engine.rfsSettings.menuVideoFileName;
    console.log('[Gui] Video file name:', videoFileName);
    
    try {
      // First check RFS (Real File System) - this is where imported videos are stored
      if (Engine.rfs) {
        console.log('[Gui] Checking RFS for video file...');
        try {
          const rfsContainsVideo = await Engine.rfs.containsEntry(videoFileName);
          console.log(`[Gui] RFS contains ${videoFileName}:`, rfsContainsVideo);
          
          if (rfsContainsVideo) {
            console.log('[Gui] Found video file in RFS:', videoFileName);
            const fileData = await Engine.rfs.getRawFile(videoFileName);
            const videoFile = new File([fileData], videoFileName, { type: "video/webm" });
            console.log('[Gui] Created video File object from RFS:', videoFile.name, videoFile.size, 'bytes');
            
            if (videoFile.size === 0) {
              console.warn('[Gui] Video file from RFS is empty!');
            } else {
              return videoFile;
            }
          }
        } catch (error) {
          console.warn('[Gui] Error checking RFS for video file:', error);
        }
      } else {
        console.warn('[Gui] Engine.rfs not available');
      }
      
      // Then check VFS (Virtual File System) - for original game files
      if (!Engine.vfs) {
        console.warn('[Gui] Engine.vfs not available - cannot load video');
        return undefined;
      }
      
      console.log('[Gui] Checking if video file exists in VFS...');
      console.log('[Gui] Available archives:', Engine.vfs.listArchives());
      
      // Check if video file exists in VFS
      console.log(`[Gui] Checking for video file: ${videoFileName}`);
      console.log(`[Gui] VFS fileExists result:`, Engine.vfs.fileExists(videoFileName));
      
      // Try to get video file from VFS
      if (Engine.vfs.fileExists(videoFileName)) {
        console.log('[Gui] Found video file in VFS:', videoFileName);
        const fileData = Engine.vfs.openFile(videoFileName).asFile();
        const videoFile = new File([fileData], videoFileName, { type: "video/webm" });
        console.log('[Gui] Created video File object:', videoFile.name, videoFile.size, 'bytes');
        
        // Test if the file data is valid
        if (videoFile.size === 0) {
          console.warn('[Gui] Video file is empty!');
          return undefined;
        }
        
        return videoFile;
      } else {
        console.warn('[Gui] Video file not found in VFS:', videoFileName);
        
        // Try alternative video file names - but don't create File objects for .bik files
        const alternativeNames = ['ra2ts_l.bik', 'ra2ts_l.mp4', 'menu.webm', 'menu.mp4', 'ra2ts_l.avi'];
        for (const altName of alternativeNames) {
          console.log(`[Gui] Checking alternative video file: ${altName}`);
          if (Engine.vfs.fileExists(altName)) {
            console.log('[Gui] Found alternative video file:', altName);
            
            // Only process .webm and .mp4 files, skip .bik files as they need conversion
            if (altName.endsWith('.bik')) {
              console.warn(`[Gui] Found .bik file but cannot play directly: ${altName}`);
              console.warn('[Gui] .bik files need to be converted to .webm during import process');
              continue;
            }
            
            const fileData = Engine.vfs.openFile(altName).asFile();
            const videoFile = new File([fileData], altName, { 
              type: altName.endsWith('.mp4') ? "video/mp4" : "video/webm" 
            });
            console.log('[Gui] Created alternative video File object:', videoFile.name, videoFile.size, 'bytes');
            return videoFile;
          }
        }
        
        console.warn('[Gui] No playable video file found, will proceed without video');
        
        return undefined;
      }
    } catch (error) {
      console.error('[Gui] Failed to read video file from VFS:', error);
      return undefined;
    }
  }

  private async navigateToMainMenu(): Promise<void> {
    console.log('[Gui] Navigating to main menu');
    
    if (!this.rootController || !this.uiScene || !this.jsxRenderer || !this.renderer) {
      throw new Error('GUI components not properly initialized');
    }

    // Add UiScene to renderer (match original project architecture)
    this.renderer.addScene(this.uiScene);
    
    // Add UiScene's HTML container to DOM (critical for HTML elements to be visible)
    this.rootEl.appendChild(this.uiScene.getHtmlContainer().getElement()!);
    console.log('[Gui] Added UiScene HTML container to DOM');

    // Get video URL
    const videoSrc = await this.getMainMenuVideoUrl();
    console.log('[Gui] Video source:', videoSrc);

    // Create sub-screens map
    const subScreens = new Map<MainMenuScreenType, any>();
    subScreens.set(MainMenuScreenType.Home, HomeScreen);
    
    // Create main menu root screen - use Engine's collections directly
    const mainMenuRootScreen = new MainMenuRootScreen(
      subScreens,
      this.uiScene,
      this.strings,
      Engine.images,  // Use Engine's LazyResourceCollection directly
      this.jsxRenderer,
      this.appVersion,
      videoSrc  // Pass video source
    );
    
    // Add screen to root controller
    this.rootController.addScreen(ScreenType.MainMenuRoot, mainMenuRootScreen);
    
    // Navigate to main menu
    this.rootController.goToScreen(ScreenType.MainMenuRoot);
  }

  private startAnimationLoop(): void {
    console.log('[Gui] Animation loop already started by UiAnimationLoop');
    // UiAnimationLoop handles the animation loop, we just need to update controllers
    // This method is kept for compatibility but the actual animation is handled by UiAnimationLoop
  }

  getRootController(): RootController {
    if (!this.rootController) {
      throw new Error('Root controller is not initialized');
    }
    return this.rootController;
  }

  async destroy(): Promise<void> {
    console.log('[Gui] Destroying GUI system');
    
    // Stop UiAnimationLoop
    if (this.uiAnimationLoop) {
      this.uiAnimationLoop.destroy();
    }
    
    // Destroy root controller
    if (this.rootController) {
      this.rootController.destroy();
    }
    
    // Remove UI scene HTML container from DOM and destroy UI scene
    if (this.uiScene) {
      const htmlElement = this.uiScene.getHtmlContainer().getElement();
      if (htmlElement && this.rootEl.contains(htmlElement)) {
        this.rootEl.removeChild(htmlElement);
      }
      this.uiScene.destroy();
    }
    
    // Remove canvas from DOM and dispose renderer
    if (this.renderer) {
      this.rootEl.removeChild(this.renderer.getCanvas());
      this.renderer.dispose();
    }
  }
} 