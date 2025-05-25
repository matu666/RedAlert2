import { BoxedVar } from './util/BoxedVar';
import { EventDispatcher } from './util/event'; // Import EventDispatcher
import { Routing } from './util/Routing'; // Already migrated
import { Config } from './Config'; // Import the real Config class
import { IniFile } from './data/IniFile'; // Import IniFile
import { IniSection } from './data/IniSection'; // Added missing import
import SplashScreenComponent from './gui/component/SplashScreen'; // Renamed import
import type { ComponentProps } from 'react';

import { CsfFile, CsfLanguage, csfLocaleMap } from './data/CsfFile';
import { Strings } from './data/Strings';
import { VirtualFile } from './data/vfs/VirtualFile';
import { DataStream } from './data/DataStream';
import { version as appVersion } from './version'; // Import app version
import { MixFile } from './data/MixFile'; // Added static import for MixFile
import { GameRes } from './engine/gameRes/GameRes'; // Import GameRes class
import { GameResConfig } from './engine/gameRes/GameResConfig'; // Import GameResConfig
import { GameResSource } from './engine/gameRes/GameResSource'; // Import GameResSource enum
import { LocalPrefs, StorageKey } from './LocalPrefs'; // Import LocalPrefs and StorageKey
import type { Viewport } from './gui/Viewport'; // Import Viewport type
import { Gui } from './gui/Gui'; // Import GUI system

// Type for the callback function
export type SplashScreenUpdateCallback = (props: ComponentProps<typeof SplashScreenComponent> | null) => void;

// --- Stubs/Mocks for unmigrated dependencies (MVP) ---
// These will be replaced by actual migrated modules later.

// Mock for gui/component/SplashScreen.js
// We'll create a proper SplashScreen.tsx or SplashScreen.ts later.

// Class that extends LocalPrefs
class MockLocalPrefs extends LocalPrefs {
  constructor(storage: Storage) { 
    super(storage);
    console.log('MockLocalPrefs initialized'); 
  }
}

// Mock for ConsoleVars
class MockConsoleVars {
  freeCamera = new BoxedVar<boolean>(false);
  forceResolution = new BoxedVar<string | undefined>(undefined);
  debugWireframes = new BoxedVar<boolean>(false);
  debugPaths = new BoxedVar<boolean>(false);
  debugText = new BoxedVar<boolean>(false);
  debugBotIndex = new BoxedVar<number | undefined>(undefined);
  constructor() { console.log('MockConsoleVars initialized'); }
}

// Mock for DevToolsApi (static methods)
class MockDevToolsApi {
  static registerCommand(name: string, cmd: Function) { console.log(`MockDevToolsApi: registerCommand ${name}`); }
  static registerVar(name: string, bv: BoxedVar<any>) { console.log(`MockDevToolsApi: registerVar ${name}`); }
  static listCommands(): string[] { return []; }
  static listVars(): string[] { return []; }
}

// Mock for FullScreen
class MockFullScreen {
  onChange = new EventDispatcher<MockFullScreen, boolean>();
  constructor(doc: Document) { console.log('MockFullScreen initialized'); }
  init() {}
  isFullScreen(): boolean { return false; }
}

// Mock for Sentry (if used directly by Application)
const mockSentry = {
  captureException: (e: any) => console.error("Sentry Mock: captureException", e),
  configureScope: (cb: Function) => cb({ setTag: () => {}, setExtra: () => {} }),
};

// Mock viewport adapter that adapts BoxedVar to Viewport interface 
class ViewportAdapter implements Viewport {
  constructor(private boxedVar: BoxedVar<{ x: number; y: number; width: number; height: number }>) {}
  
  getValue(): { x: number; y: number; width: number; height: number } {
    return this.boxedVar.value;
  }
  
  // You can add any additional methods required by the Viewport interface
  rootElement?: HTMLElement;
}

// --- End Stubs/Mocks ---

export class Application {
  // 一个帮助函数，用于格式化字符串并替换%s占位符
  private formatString(template: string, ...args: any[]): string {
    if (!args || args.length === 0) return template;
    
    let result = template;
    for (let i = 0; i < args.length; i++) {
      // 替换%s, %d等格式化占位符
      const placeholder = new RegExp(`%s|%d`, 'i');
      result = result.replace(placeholder, String(args[i]));
    }
    return result;
  }

  public viewport: BoxedVar<{ x: number; y: number; width: number; height: number }>;
  private viewportAdapter: ViewportAdapter;
  public config!: Config; // Will now be the real Config instance
  private strings!: Strings; // Now definitely assigned after loadTranslations
  private localPrefs: LocalPrefs; // Changed from MockLocalPrefs to actual LocalPrefs interface
  private rootEl: HTMLElement | null = null;
  private runtimeVars: MockConsoleVars;
  private fullScreen: MockFullScreen;

  public routing: Routing;

  // Add other necessary properties as stubs or with 'any' type for now
  private sentry: typeof mockSentry | undefined = mockSentry; // Assuming Sentry might be optional
  private currentLocale: string = 'en-US'; // Default, will be updated from config/CSF
  private fsAccessLib: any; // For SystemJS.import('file-system-access')
  private gameResConfig: GameResConfig | undefined;
  private cdnResourceLoader: any;
  private gpuTier: any;
  private splashScreenUpdateCallback?: SplashScreenUpdateCallback; // Add callback property
  private gui?: Gui; // GUI system

  constructor(splashScreenUpdateCallback?: SplashScreenUpdateCallback) {
    this.viewport = new BoxedVar({ x: 0, y: 0, width: window.innerWidth, height: window.innerHeight });
    this.viewportAdapter = new ViewportAdapter(this.viewport);
    this.routing = new Routing(); // Routing is already migrated
    this.splashScreenUpdateCallback = splashScreenUpdateCallback;

    // Initialize other properties that were in original constructor or early main
    // For MVP, many will be mocked or have placeholder values
    this.localPrefs = new MockLocalPrefs(localStorage);
    this.runtimeVars = new MockConsoleVars();
    this.fullScreen = new MockFullScreen(document);

    console.log('Application constructor finished.');
  }

  public getVersion(): string {
    return appVersion;
  }

  // Simplified and mocked methods from original Application.js
  // These would eventually be filled with migrated logic

  private async loadConfig(): Promise<void> {
    console.log('[Application] Attempting to load config.ini...');
    try {
      const response = await fetch('/config.ini'); // Vite serves from public/ directly
      if (!response.ok) {
        throw new Error(`Failed to fetch config.ini: ${response.status} ${response.statusText}`);
      }
      const iniString = await response.text();
      
      const iniFileInstance = new IniFile(iniString);
      this.config = new Config(); // Create instance of our real Config class
      this.config.load(iniFileInstance); // Load data into it

      console.log('[Application] config.ini loaded and parsed successfully.');
      console.log('[Application] Config object dump:', this.config);
      // Log some specific values for verification
      console.log('[Application] Verification: Default Locale from config:', this.config.defaultLocale);
      console.log('[Application] Verification: Viewport Width from config:', this.config.viewport.width);
      console.log('[Application] Verification: Dev Mode from config:', this.config.devMode);
      console.log('[Application] Verification: Servers URL from config:', this.config.serversUrl);

    } catch (error) {
      console.error('[Application] Failed to load or parse config.ini:', error);
      // Fallback to a minimal mock config so the app can somewhat proceed for MVP
      console.warn('[Application] Falling back to minimal mock config due to error.');
      this.config = new Config(); // Create a new instance
      // Manually set some absolutely critical defaults if possible, or leave it empty
      // For now, this will make getters use their defaults or throw if generalData is not set
      // This is a critical failure path, so the app might not be very functional.
      // Consider throwing the error to halt app or showing a user-friendly error message.
      // For MVP, just logging and proceeding with a mostly empty config.
      const mockGeneralSection = new IniSection("General");
      mockGeneralSection.set("defaultLanguage", "en-US");
      mockGeneralSection.set("language", "english"); // CSF file hint
      mockGeneralSection.set("csfFile", "ra2/general.csf"); // Example path
      mockGeneralSection.set("dev", "true");
      mockGeneralSection.set("viewport.width", "1024");
      mockGeneralSection.set("viewport.height", "768");
      const mockIniFile = new IniFile();
      mockIniFile.sections.set("General", mockGeneralSection);
      this.config.load(mockIniFile); // Load with minimal mock
      alert("Failed to load application configuration (config.ini). Using minimal defaults. Some features may not work.");
      throw error; // Re-throw to make it clear loading failed, App.main will catch
    }
  }

  private async loadTranslations(): Promise<void> {
    const currentConfig = this.config; // Capture for use in this method
    if (!currentConfig) {
        console.error("[Application] Config not loaded before loadTranslations. Skipping.");
        this.strings = new Strings(); // Initialize with empty strings
        this.currentLocale = 'en-US'; // Fallback locale
        return;
    }

    // --- Step 1: Load and parse CSF file ---
    let csfFileValue = currentConfig.getGeneralData().get('csfFile') || 'ra2/general.csf';
    const csfFileName = Array.isArray(csfFileValue) ? csfFileValue[0] : csfFileValue;
    
    console.log(`[Application] Attempting to load CSF file: ${csfFileName}`);
    try {
      const csfResponse = await fetch(`/${csfFileName}`);
      if (!csfResponse.ok) {
        throw new Error(`Failed to fetch CSF file ${csfFileName}: ${csfResponse.status} ${csfResponse.statusText}`);
      }
      const arrayBuffer = await csfResponse.arrayBuffer();
      const dataStream = new DataStream(arrayBuffer, 0, DataStream.LITTLE_ENDIAN);
      dataStream.dynamicSize = false;
      const virtualFile = new VirtualFile(dataStream, csfFileName);
      
      const csfFileInstance = new CsfFile(virtualFile);
      this.strings = new Strings(csfFileInstance); // Initialize Strings with CSF data
      this.currentLocale = csfFileInstance.getIsoLocale() || currentConfig.defaultLocale;
      console.log(`[Application] CSF file "${csfFileName}" loaded. Detected/Set Locale: ${this.currentLocale}. Loaded ${Object.keys(this.strings.getKeys()).length} keys from CSF.`);

    } catch (error) {
      console.error(`[Application] Failed to load or parse CSF file "${csfFileName}":`, error);
      console.warn('[Application] Falling back to empty Strings object for CSF part.');
      this.strings = new Strings(); // Initialize with empty strings if CSF fails
      this.currentLocale = currentConfig.defaultLocale; // Use config default locale
      // We will still attempt to load JSON translations
    }

    // --- Step 2: Load and merge JSON locale file ---
    // Use this.currentLocale determined from CSF or config default
    const jsonLocaleFile = `res/locale/${this.currentLocale}.json?v=${this.getVersion()}`;
    console.log(`[Application] Attempting to load JSON locale file: ${jsonLocaleFile}`);

    try {
        const jsonResponse = await fetch(`/${jsonLocaleFile}`); // Relative to public folder
        if (!jsonResponse.ok) {
            throw new Error(`Failed to fetch JSON locale ${jsonLocaleFile}: ${jsonResponse.status} ${jsonResponse.statusText}`);
        }
        const jsonData = await jsonResponse.json();
        if (jsonData) {
            this.strings.fromJson(jsonData); // Merge/overwrite with JSON data
            console.log(`[Application] JSON locale file "${jsonLocaleFile}" loaded and merged. Total keys now: ${Object.keys(this.strings.getKeys()).length}.`);
        } else {
            console.warn(`[Application] JSON locale file "${jsonLocaleFile}" parsed to null or undefined data.`);
        }
    } catch (error) {
        console.error(`[Application] Failed to load or parse JSON locale file "${jsonLocaleFile}":`, error);
        console.warn(`[Application] Continuing without strings from ${jsonLocaleFile}.`);
        // If JSON loading fails, this.strings will still contain CSF data (if loaded) or be empty.
    }
    
    // Final check and log sample strings
    console.log('[Application] Translations loading finished. Final locale: ', this.currentLocale);
    console.log('[Application] Sample string GUI:OKAY ->', this.strings.get('GUI:OKAY'));
    console.log('[Application] Sample string GUI:Cancel ->', this.strings.get('GUI:Cancel'));
    console.log('[Application] Sample string GUI:LoadingEx ->', this.strings.get('GUI:LoadingEx'));
    console.log('[Application] First 20 keys in Strings:', this.strings.getKeys().slice(0,20));
  }
  
  private checkGlobalLibs(): void {
    console.log('[MVP] Skipping Application.checkGlobalLibs().');
    // Original checks for FontFaceObserver, detectGPU, Promise, fetch etc.
    // Modern browsers usually have these. Vite handles polyfills for Promise/fetch if needed.
  }

  private async initLogging(): Promise<void> {
    console.log('[MVP] Skipping Application.initLogging().');
  }
  
  private updateViewportSize(isFullScreen: boolean): void {
    let newWidth: number, newHeight: number;
    
    if (isFullScreen) {
      newWidth = window.screen.width;
      newHeight = window.screen.height;
    } else {
      // Match original project: use config limits if available, otherwise use window size
      const configWidth = this.config?.viewport?.width ?? Number.POSITIVE_INFINITY;
      const configHeight = this.config?.viewport?.height ?? Number.POSITIVE_INFINITY;
      
      newWidth = Math.min(window.innerWidth, configWidth);
      newHeight = Math.min(window.innerHeight, configHeight);
    }
    
    // Apply minimum size constraints like original project
    newWidth = Math.max(800, newWidth - (newWidth % 2));
    newHeight = Math.max(600, newHeight - (newHeight % 2));
    
    this.viewport.value = { ...this.viewport.value, width: newWidth, height: newHeight };
    console.log(`[MVP] updateViewportSize: ${newWidth}x${newHeight}, Fullscreen: ${isFullScreen}`);
  }

  private onFullScreenChange(isFullScreen: boolean): void {
    console.log(`[MVP] onFullScreenChange: ${isFullScreen}`);
  }

  private async loadGpuBenchmarkData(): Promise<any> {
    console.log('[MVP] Skipping Application.loadGpuBenchmarkData()');
    return { tier: 1, type: 'MOCK_GPU' }; // Return some mock tier
  }

  // --- Main application entry point ---
  public async main(): Promise<void> {
    console.log('Application.main() called');

    // Show initial splash screen
    this.rootEl = document.getElementById("ra2web-root");
    if (!this.rootEl) {
      console.error("CRITICAL: Missing root element #ra2web-root in HTML.");
      alert("CRITICAL: Missing root element #ra2web-root for the application.");
      return;
    }

    // Display initial splash screen
    if (this.splashScreenUpdateCallback) {
      this.splashScreenUpdateCallback({
        width: this.viewport.value.width,
        height: this.viewport.value.height,
        parentElement: this.rootEl,
        loadingText: 'Initializing...'
      });
    }

    try {
      await this.loadConfig(); // Now uses real loading logic
    } catch (e) {
      console.error("CRITICAL: Application.loadConfig() failed. See previous errors.", e);
      if (this.rootEl) this.rootEl.innerHTML = "<h1>Error</h1><p>Failed to load critical application configuration. Please check console.</p>";
      return; // Halt execution if config fails
    }
    
    const locale = this.config.defaultLocale;
    
    // Update splash screen
    if (this.splashScreenUpdateCallback) {
      this.splashScreenUpdateCallback({
        width: this.viewport.value.width,
        height: this.viewport.value.height,
        parentElement: this.rootEl,
        loadingText: 'Loading translations...'
      });
    }
    
    try {
      await this.loadTranslations(); // Load real translations
    } catch (e) {
      console.error(`Missing translation ${locale}.`, e);
      return;
    }

    try {
      this.checkGlobalLibs(); 
    } catch (e: any) {
      console.error("Global library check failed:", e);
      alert(this.strings.get("TS:DownloadFailed")); 
      return;
    }
    
    // rootEl already set at the beginning of main()

    this.runtimeVars = new MockConsoleVars();
    MockDevToolsApi.registerVar("freecamera", this.runtimeVars.freeCamera);
    await this.initLogging(); 
    
    this.fullScreen = new MockFullScreen(document);
    this.fullScreen.init(); 
    this.fullScreen.onChange.subscribe((isFS: boolean) => {
        this.onFullScreenChange(isFS);
        this.updateViewportSize(isFS);
    });
    
    if (typeof window !== 'undefined') {
        window.addEventListener('resize', () => this.updateViewportSize(this.fullScreen.isFullScreen()));
        this.updateViewportSize(this.fullScreen.isFullScreen()); 
    }

    // Load GPU benchmark data in parallel
    this.loadGpuBenchmarkData()
      .then(gpuData => this.gpuTier = gpuData)
      .catch(e => this.sentry?.captureException(e));

    // Check if File System Access library is loaded (from fsalib.min.js in index.html)
    if (!window.FileSystemAccess) {
      console.error("FileSystemAccess not available. Make sure fsalib.min.js is loaded.");
      await this.handleGameResLoadError(new Error("Failed to load File System Access library"), this.strings, true);
      return;
    }
    this.fsAccessLib = window.FileSystemAccess;

    // Get mod name from URL if present
    const urlParams = new URLSearchParams(window.location.search);
    const modName = urlParams.get('mod');
    
    // Load game resources configuration from local preferences
    let gameResConfig = this.loadGameResConfig(this.localPrefs);
    
    // Initialize GameRes
    try {
      // Set up real GameRes instance
      const gameRes = new GameRes(
        this.getVersion(),
        modName || undefined,
        this.fsAccessLib,
        this.localPrefs,
        this.strings,
        this.rootEl,
        this.createSplashScreenInterface(), // Real splash screen interface
        this.viewportAdapter, // Pass the viewport adapter that implements Viewport interface
        this.config,
        "res/", // Application.js uses a static resPath property
        this.sentry
      );

      // Initialize game resources
      const { configToPersist, cdnResLoader } = await gameRes.init(
        gameResConfig,
        (error, strings) => this.handleGameResLoadError(error, strings),
        (error, strings) => this.handleGameResImportError(error, strings)
      );

      // Store config for future use if needed
      if (configToPersist) {
        if (configToPersist.isCdn()) {
          this.localPrefs.removeItem(StorageKey.GameRes);
        } else {
          this.localPrefs.setItem(StorageKey.GameRes, configToPersist.serialize());
        }
        gameResConfig = configToPersist;
      }

      this.gameResConfig = gameResConfig;
      this.cdnResourceLoader = cdnResLoader;
      
      // Send analytics event if enabled
      if (typeof window.gtag === 'function') {
        window.gtag('event', 'app_init', {
          res: this.gameResConfig?.source || 'unknown',
          modName: modName || '<none>'
        });
      }
      
      // Set up Sentry tags if available
      this.sentry?.configureScope((scope: any) => {
        scope.setTag('mod', modName || '<none>');
        scope.setExtra('mod', modName || '<none>');
        scope.setExtra('modHash', 'unknown'); // Engine.getModHash not implemented yet
      });

    } catch (e) {
      console.error("Failed to initialize GameRes:", e);
      await this.handleGameResLoadError(e as Error, this.strings, true);
      return;
    }

    // Initialize routing for navigation
    this.initRouting();
    
    // Destroy splash screen after resources are loaded
    if (this.splashScreenUpdateCallback) {
      this.splashScreenUpdateCallback(null);
    }
    
    // Initialize GUI system after splash screen is done
    await this.initGui();
  }

  private loadGameResConfig(prefs: LocalPrefs): GameResConfig | undefined {
    const serializedConfig = prefs.getItem(StorageKey.GameRes);
    if (serializedConfig) {
      try {
        const config = new GameResConfig(this.config.gameresBaseUrl || "");
        config.unserialize(serializedConfig);
        
        // Skip if it's CDN but no base URL is available
        if (config.isCdn() && !config.getCdnBaseUrl()) {
          return undefined;
        }
        return config;
      } catch (e) {
        console.error("Failed to load GameResConfig from preferences:", e);
      }
    }
    return undefined;
  }

  private initRouting(): void {
    this.routing.addRoute("*", async () => {
      // Handle any cleanup for all routes
    });

    this.routing.addRoute("/", async () => {
      // Initialize main game UI
      console.log("Main game UI would be initialized here.");
    });

    // Initialize routing
    this.routing.init();
  }

  private async initGui(): Promise<void> {
    console.log('[Application] Initializing GUI system');
    
    if (!this.rootEl) {
      throw new Error('Root element not available for GUI initialization');
    }
    
    // Create GUI system
    this.gui = new Gui(
      this.getVersion(),
      this.strings,
      this.viewport,
      this.rootEl
    );
    
    // Initialize GUI
    await this.gui.init();
    
    console.log('[Application] GUI system initialized successfully');
  }

  private createSplashScreenInterface() {
    return {
      setLoadingText: (text: string) => {
        console.log(`[Application] Splash Loading: ${text}`);
        if (this.splashScreenUpdateCallback) {
          this.splashScreenUpdateCallback({
            width: this.viewport.value.width,
            height: this.viewport.value.height,
            parentElement: this.rootEl,
            loadingText: text
          });
        }
      },
      setBackgroundImage: (url: string) => {
        console.log(`[Application] Splash Background: ${url}`);
        if (this.splashScreenUpdateCallback) {
          this.splashScreenUpdateCallback({
            width: this.viewport.value.width,
            height: this.viewport.value.height,
            parentElement: this.rootEl,
            backgroundImage: url
          });
        }
      },
      destroy: () => {
        console.log('[Application] Splash screen destroyed');
        if (this.splashScreenUpdateCallback) {
          this.splashScreenUpdateCallback(null);
        }
      },
      element: { style: { display: 'none' } }
    };
  }

  // Handler for GameRes load errors
  private async handleGameResLoadError(error: Error, strings: Strings, fatal: boolean = false): Promise<void> {
    let errorMessage = strings.get("ts:import_load_files_failed");
    
    // Check for specific error types and provide appropriate messages
    if (error.name === "ChecksumError") {
      const fileField = (error as any).file || '';
      const template = strings.get("ts:import_checksum_mismatch");
      const replaced = template.indexOf("%s") >= 0 ? 
          template.replace(/%s/g, fileField) : 
          template + " " + fileField;
      errorMessage += "\n\n" + replaced;
    } else if (error.name === "FileNotFoundError") {
      const fileField = (error as any).file || '';
      const template = strings.get("ts:import_file_not_found");
      const replaced = template.indexOf("%s") >= 0 ? 
          template.replace(/%s/g, fileField) : 
          template + " " + fileField;
      errorMessage += "\n\n" + replaced;
    } else if (error.name === "DownloadError" || error.message?.match(/XHR error|Failed to fetch/i)) {
      errorMessage += "\n\n" + strings.get("ts:downloadfailed");
    } else if (error.name === "NoStorageError") {
      errorMessage += "\n\n" + strings.get("ts:import_no_storage");
    } else if (error.message?.match(/out of memory|allocation/i)) {
      errorMessage += "\n\n" + strings.get("ts:gameinitoom");
    } else if (error.name === "QuotaExceededError" || error.name === "StorageQuotaError") {
      errorMessage += "\n\n" + strings.get("ts:storage_quota_exceeded");
    } else if (error.name === "IOError") {
      errorMessage += "\n\n" + strings.get("ts:storage_io_error");
      fatal = true;
    } else {
      console.error("Unrecognized GameRes error:", error);
      const wrappedError = new Error(`Game res load failed (${error.message ?? error.name})`);
      (wrappedError as any).cause = error;
      this.sentry?.captureException(wrappedError);
    }

    // Display error to user - simplified for now, will be replaced with proper dialog component
    alert(errorMessage);
  }

  // Handler for GameRes import errors
  private async handleGameResImportError(error: Error, strings: Strings): Promise<void> {
    let errorMessage = strings.get("ts:import_failed");
    
    // Check for specific error types and provide appropriate messages
    if (error.name === "FileNotFoundError") {
      const fileField = (error as any).file || '';
      const template = strings.get("ts:import_file_not_found");
      const replaced = template.indexOf("%s") >= 0 ? 
          template.replace(/%s/g, fileField) : 
          template + " " + fileField;
      errorMessage += "\n\n" + replaced;
    } else if (error.name === "InvalidArchiveError") {
      errorMessage += "\n\n" + strings.get("ts:import_invalid_archive");
    } else if (error.name === "ArchiveExtractionError") {
      if ((error as any).cause?.message?.match(/out of memory|allocation/i)) {
        errorMessage += "\n\n" + strings.get("ts:import_out_of_memory");
      } else {
        errorMessage += "\n\n" + strings.get("ts:import_archive_extract_failed");
        const wrappedError = new Error(`Game res import failed (${error.message ?? error.name})`);
        (wrappedError as any).cause = error;
        this.sentry?.captureException(wrappedError);
      }
    } else if (error.name === "NoWebAssemblyError") {
      errorMessage += "\n\n" + strings.get("ts:import_no_web_assembly");
    } else if (error.name === "ChecksumError") {
      const fileField = (error as any).file || '';
      const template = strings.get("ts:import_checksum_mismatch");
      const replaced = template.indexOf("%s") >= 0 ? 
          template.replace(/%s/g, fileField) : 
          template + " " + fileField;
      errorMessage += "\n\n" + replaced;
    } else if (error.name === "DownloadError" || error.message?.match(/XHR error|Failed to fetch|CompileError: WebAssembly|SystemJS|NetworkError|Load failed/i)) {
      errorMessage += "\n\n" + strings.get("ts:downloadfailed");
    } else if (error.name === "ArchiveDownloadError") {
      const urlField = (error as any).url || '';
      const template = strings.get("ts:import_archive_download_failed");
      const replaced = template.indexOf("%s") >= 0 ? 
          template.replace(/%s/g, urlField) : 
          template + " " + urlField;
      errorMessage = replaced;
    } else if (error.name === "NoStorageError") {
      errorMessage += "\n\n" + strings.get("ts:import_no_storage");
    } else if (error.message?.match(/out of memory|allocation/i) || error.name.match(/NS_ERROR_FAILURE|NS_ERROR_OUT_OF_MEMORY/)) {
      errorMessage += "\n\n" + strings.get("ts:import_out_of_memory");
    } else if (error.name === "QuotaExceededError" || error.name === "StorageQuotaError") {
      errorMessage += "\n\n" + strings.get("ts:storage_quota_exceeded");
    } else if (error.name !== "IOError" && error.name !== "FileNotFoundError" && error.name !== "AbortError") {
      const wrappedError = new Error("Game res import failed " + (error.message ?? error.name));
      (wrappedError as any).cause = error;
      this.sentry?.captureException(wrappedError);
    }

    // Display error to user - simplified for now, will be replaced with proper dialog component
    alert(errorMessage);
  }
}

// Add FileSystemHandle handling to the Window interface
declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
  }
} 