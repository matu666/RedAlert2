import { BoxedVar } from './util/BoxedVar';
import { EventDispatcher } from './util/event'; // Import EventDispatcher
import { Routing } from './util/Routing'; // Already migrated
import { sleep } from './util/time'; // Already migrated
import { Config } from './Config'; // Import the real Config class
import { IniFile } from './data/IniFile'; // Import IniFile
import { IniSection } from './data/IniSection'; // Added missing import

// --- Stubs/Mocks for unmigrated dependencies (MVP) ---
// These will be replaced by actual migrated modules later.

// Mock for gui/component/SplashScreen.js
// We'll create a proper SplashScreen.tsx or SplashScreen.ts later.
class MockSplashScreen {
  constructor(width: number, height: number) {
    console.log(`MockSplashScreen initialized with ${width}x${height}`);
    // Create a simple div for splash screen visual
    this.element = document.createElement('div');
    this.element.id = 'mock-splash-screen';
    this.element.style.position = 'fixed';
    this.element.style.left = '0';
    this.element.style.top = '0';
    this.element.style.width = '100vw';
    this.element.style.height = '100vh';
    this.element.style.backgroundColor = '#222';
    this.element.style.color = 'white';
    this.element.style.display = 'flex';
    this.element.style.flexDirection = 'column';
    this.element.style.justifyContent = 'center';
    this.element.style.alignItems = 'center';
    this.element.style.zIndex = '10000';
    this.element.innerHTML = '<h1>RA2Web (React Port)</h1><p id="splash-loading-text">Loading...</p><p id="splash-copyright" style="font-size: 0.8em; margin-top: 20px;">Copyright</p><p id="splash-disclaimer" style="font-size: 0.7em;">Disclaimer</p>';
  }
  element: HTMLElement;
  setLoadingText(text: string) {
    const el = this.element.querySelector('#splash-loading-text');
    if (el) el.textContent = text;
    console.log(`MockSplashScreen: setLoadingText - ${text}`);
  }
  setCopyrightText(text: string) {
     const el = this.element.querySelector('#splash-copyright');
    if (el) el.innerHTML = text.replace(/\n/g, '<br>');
    console.log(`MockSplashScreen: setCopyrightText - ${text}`);
  }
  setDisclaimerText(text: string) {
    const el = this.element.querySelector('#splash-disclaimer');
    if (el) el.textContent = text;
    console.log(`MockSplashScreen: setDisclaimerText - ${text}`);
  }
  setBackgroundImage(url: string) {
    console.log(`MockSplashScreen: setBackgroundImage - ${url}`);
    if (url) this.element.style.backgroundImage = `url(${url})`;
    else this.element.style.backgroundImage = 'none';
  }
  render(rootEl: HTMLElement) {
    rootEl.appendChild(this.element);
    console.log('MockSplashScreen rendered.');
  }
  destroy() {
    this.element.remove();
    console.log('MockSplashScreen destroyed.');
  }
}

// Mock for LocalPrefs
class MockLocalPrefs {
  constructor(storage: Storage) { console.log('MockLocalPrefs initialized'); }
  getItem(key: string, defaultValue?: any): any { return defaultValue; }
  setItem(key: string, value: any): void {}
  removeItem(key: string): void {}
  getBool(key: string, defaultValue?: boolean): boolean { return defaultValue ?? false; }
  getNumber(key: string, defaultValue?: number): number { return defaultValue ?? 0; }
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

// --- End Stubs/Mocks ---

export class Application {
  public viewport: BoxedVar<{ x: number; y: number; width: number; height: number }>;
  public config!: Config; // Will now be the real Config instance
  private strings: any; // Will be properly typed when Strings.ts is migrated
  private localPrefs: MockLocalPrefs; // Placeholder
  private rootEl: HTMLElement | null = null;
  private runtimeVars: MockConsoleVars;
  private fullScreen: MockFullScreen;
  private splashScreen: MockSplashScreen | undefined; // Initialized in main()
  public routing: Routing;

  // Add other necessary properties as stubs or with 'any' type for now
  private sentry: typeof mockSentry | undefined = mockSentry; // Assuming Sentry might be optional
  private locale: string = 'en-US';
  private fsAccessLib: any; // For SystemJS.import('file-system-access')
  private gameResConfig: any;
  private cdnResourceLoader: any;
  private gpuTier: any;


  constructor() {
    this.viewport = new BoxedVar({ x: 0, y: 0, width: window.innerWidth, height: window.innerHeight });
    this.routing = new Routing(); // Routing is already migrated

    // Initialize other properties that were in original constructor or early main
    // For MVP, many will be mocked or have placeholder values
    this.localPrefs = new MockLocalPrefs(localStorage);
    this.runtimeVars = new MockConsoleVars();
    this.fullScreen = new MockFullScreen(document);
    // this.splashScreen is initialized in main()

    console.log('Application constructor finished.');
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

  private async loadTranslations(locale: string): Promise<any> {
    console.log(`[MVP] Skipping Application.loadTranslations(${locale}), using mock strings based on loaded/mocked config.defaultLocale.`);
    return {}; 
  }
  
  // Mock the Strings class behavior directly for MVP
  private initializeMockStrings(csfData?: any, jsonData?: any) {
      const currentLocale = this.config?.defaultLocale || 'en-US'; // Use loaded locale if available
      console.log(`[Application] Initializing mock strings for locale: ${currentLocale}`);
      this.strings = {
        get: (key: string, ...args: any[]): string => {
          // console.log(`Strings.get(\'${key}\') for locale ${currentLocale}`);
          if (key === 'GUI:LoadingEx') return `Loading Game... (Locale: ${currentLocale})`;
          if (key === 'TXT_COPYRIGHT') return `© 2024 RA2Web React Port (Locale: ${currentLocale})`;
          if (key === 'GUI:WWBrand') return `Westwood Studios (Mock)`;
          if (key === 'TS:Disclaimer') return `This is a fan-made project for demonstration purposes. (Locale: ${currentLocale})`;
          if (key === 'TS:DownloadFailed') return 'A required file could not be downloaded. Please check your connection and try again.';
          return `[${key}]`; 
        },
      };
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
    const newWidth = isFullScreen ? window.screen.width : window.innerWidth;
    const newHeight = isFullScreen ? window.screen.height : window.innerHeight;
    this.viewport.value = { ...this.viewport.value, width: newWidth, height: newHeight };
    console.log(`[MVP] updateViewportSize: ${newWidth}x${newHeight}, Fullscreen: ${isFullScreen}`);
    if (this.splashScreen) {
        // Original splash screen might have a resize method, mock doesn't yet.
        // For now, the mock splash is full viewport via CSS.
    }
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

    try {
      await this.loadConfig(); // Now uses real loading logic
    } catch (e) {
      console.error("CRITICAL: Application.loadConfig() failed. See previous errors.", e);
      const root = document.getElementById("ra2web-root");
      if (root) root.innerHTML = "<h1>Error</h1><p>Failed to load critical application configuration. Please check console.</p>";
      return; // Halt execution if config fails
    }
    
    this.locale = this.config.defaultLocale; // Use locale from loaded config
    try {
      const jsonDataForStrings = await this.loadTranslations(this.locale);
      this.initializeMockStrings(null, jsonDataForStrings); 
    } catch (e) {
      console.error(`Error during mocked translations load for locale ${this.locale}:`, e);
      this.initializeMockStrings(); 
    }

    try {
      this.checkGlobalLibs(); 
    } catch (e: any) {
      console.error("Global library check failed:", e);
      alert(this.strings.get("TS:DownloadFailed")); 
      return;
    }
    
    this.rootEl = document.getElementById("ra2web-root");
    if (!this.rootEl) {
      console.error("CRITICAL: Missing root element #ra2web-root in HTML.");
      alert("CRITICAL: Missing root element #ra2web-root for the application.");
      return;
    }

    MockDevToolsApi.registerVar("freecamera", this.runtimeVars.freeCamera);
    await this.initLogging(); 
    this.fullScreen.init(); 
    this.fullScreen.onChange.subscribe((isFS: boolean) => {
        this.onFullScreenChange(isFS);
        this.updateViewportSize(isFS);
    });
    
    if (typeof window !== 'undefined') {
        window.addEventListener('resize', () => this.updateViewportSize(this.fullScreen.isFullScreen()));
        this.updateViewportSize(this.fullScreen.isFullScreen()); 
    }

    this.splashScreen = new MockSplashScreen(
      this.viewport.value.width,
      this.viewport.value.height
    );
    this.splashScreen.render(this.rootEl);
    this.splashScreen.setLoadingText(this.strings.get('GUI:LoadingEx'));
    this.splashScreen.setCopyrightText(
      this.strings.get('TXT_COPYRIGHT') + "\n" + this.strings.get('GUI:WWBrand')
    );
    this.splashScreen.setDisclaimerText(this.strings.get('TS:Disclaimer'));

    // Respect devMode for splash screen delay from original Application.js logic
    const devMode = this.config && this.config.devMode !== undefined ? this.config.devMode : true;
    console.log(`[Application] Splash screen delay based on devMode (${devMode}). Original delay: ${devMode ? 0 : 5000}ms`);
    await sleep(devMode ? 500 : 3000); // Reduced delay for faster MVP testing, but respects devMode flag
    
    console.log('[MVP] Skipping GPU Benchmark, FileSystemAccess import, GameRes init for SplashScreen MVP.');

    await sleep(1500); 
    if (this.splashScreen) this.splashScreen.setLoadingText("Almost ready...");
    await sleep(1000);

    if (this.splashScreen) {
        this.splashScreen.destroy();
        this.splashScreen = undefined; // Clear it
    }

    if (this.rootEl) {
        this.rootEl.innerHTML = '<div style="padding: 20px; text-align: center;"><h1>Splash Screen Finished (MVP)</h1><p>Configuration loaded. Next step: Integrate actual Gui and load lobby.</p><pre style="white-space: pre-wrap; text-align: left; background: #f0f0f0; padding: 10px; border-radius: 5px; max-height: 300px; overflow-y: auto;">Config dump:\n${JSON.stringify(this.config, null, 2)}</pre></div>';
    }
    
    console.log("Application.main() with real config load (MVP) finished.");
  }
} 