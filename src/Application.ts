import { BoxedVar } from './util/BoxedVar';
import { EventDispatcher } from './util/event'; // Import EventDispatcher
import { Routing } from './util/Routing'; // Already migrated
import { sleep } from './util/time'; // Already migrated

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
  private config: any; // Will be properly typed when Config.ts is migrated
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
    console.log('[MVP] Skipping Application.loadConfig(), using mock config.');
    this.config = {
      defaultLocale: 'en-US',
      devMode: true,
      serversUrl: 'servers.ini', // Example value
      // Add other minimal properties SplashScreen or early flow might need
      generalData: { // Mocking the structure expected by original Config getters
        getString: (key: string, defaultValue?: string) => {
          if (key === 'defaultLanguage') return this.config.defaultLocale;
          if (key === 'discordUrl') return 'https://discord.gg/example';
          // Add more mocked getters as needed by SplashScreen from original Config
          return defaultValue ?? key;
        },
        getBool: (key: string, defaultValue?: boolean) => {
          if (key === 'dev') return this.config.devMode;
          return defaultValue ?? false;
        }
      },
      viewport: { // From original Config structure
          width: 1024, // Default/mock
          height: 768, // Default/mock
      },
      sentry: undefined, // Assuming Sentry might be optional or disabled in dev
      corsProxies: [],
      // ... other sections if absolutely needed by SplashScreen's direct config access
    };
  }

  private async loadTranslations(locale: string): Promise<any> {
    console.log(`[MVP] Skipping Application.loadTranslations(${locale}), using mock strings.`);
    // Mocking the structure CsfFile / Strings might produce
    return {
      // Format that new Strings(csfData).fromJson(jsonData) would expect
      // For MVP, we directly mock what `this.strings.get()` would return
    };
  }
  
  // Mock the Strings class behavior directly for MVP
  private initializeMockStrings(csfData?: any, jsonData?: any) {
      this.strings = {
        get: (key: string, ...args: any[]): string => {
          console.log(`Strings.get(\'${key}\')`);
          if (key === 'GUI:LoadingEx') return 'Loading Game...';
          if (key === 'TXT_COPYRIGHT') return '© 2024 RA2Web React Port';
          if (key === 'GUI:WWBrand') return 'Westwood Studios (Mock)';
          if (key === 'TS:Disclaimer') return 'This is a fan-made project for demonstration purposes.';
          if (key === 'TS:DownloadFailed') return 'A required file could not be downloaded. Please check your connection and try again.';
          // Add more keys as needed by SplashScreen
          return `[${key}]`; // Return key itself if not mocked
        },
        // Mock other methods if SplashScreen calls them
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
    console.log('Application.main() called [MVP]');

    try {
      await this.loadConfig(); // Uses mocked version
    } catch (e) {
      console.error("Critical error during mocked config load (should not happen with mock):", e);
      // Display a very basic error message if rootEl is available
      const root = document.getElementById("ra2web-root");
      if (root) root.innerHTML = "Error loading essential configuration.";
      return;
    }
    
    this.locale = this.config.defaultLocale;
    try {
      const jsonDataForStrings = await this.loadTranslations(this.locale); // Uses mocked version
      this.initializeMockStrings(null, jsonDataForStrings); // Initialize mock strings
    } catch (e) {
      console.error(`Critical error during mocked translations load for locale ${this.locale}:`, e);
      // Fallback strings or error message
      this.initializeMockStrings(); // Init with default fallback if load fails
      // Display error if possible
      const root = document.getElementById("ra2web-root");
      if (root) root.innerHTML = `Error loading translations for ${this.locale}.`;
      return;
    }


    try {
      this.checkGlobalLibs(); // Uses mocked version
    } catch (e: any) {
      console.error("Global library check failed (mocked, should not fail):", e);
      alert(this.strings.get("TS:DownloadFailed")); // Using mocked strings
      return;
    }
    
    this.rootEl = document.getElementById("ra2web-root");
    if (!this.rootEl) {
      console.error("CRITICAL: Missing root element #ra2web-root in HTML.");
      // Try to append to body or show an alert if no root element.
      const tempRoot = document.createElement('div');
      tempRoot.id = "ra2web-root";
      document.body.appendChild(tempRoot);
      this.rootEl = tempRoot;
      alert("Root element #ra2web-root was missing and has been created. Please check your index.html.");
      // return; // Decide if to halt or proceed with dynamically created root
    }

    // Mock DevToolsApi registration
    MockDevToolsApi.registerVar("freecamera", this.runtimeVars.freeCamera);
    // ... other DevToolsApi calls can be mocked if needed for flow

    await this.initLogging(); // Uses mocked version

    this.fullScreen.init(); // Mocked
    this.fullScreen.onChange.subscribe((isFS: boolean) => { // Added type for isFS
        this.onFullScreenChange(isFS);
        this.updateViewportSize(isFS);
    });
    
    // Initial viewport size update
    // In a React context, viewport updates might be handled differently or need to sync with React state.
    // For this direct port MVP, we follow the original flow.
    if (typeof window !== 'undefined') {
        window.addEventListener('resize', () => this.updateViewportSize(this.fullScreen.isFullScreen()));
        this.updateViewportSize(this.fullScreen.isFullScreen()); // Initial call
    }


    console.log('[MVP] Initializing SplashScreen...');
    this.splashScreen = new MockSplashScreen(
      this.viewport.value.width,
      this.viewport.value.height
    );
    
    if (this.rootEl) {
        this.splashScreen.render(this.rootEl);
    } else {
        console.error("Cannot render SplashScreen, rootEl is null!");
        return; // Stop if no root element
    }

    this.splashScreen.setLoadingText(this.strings.get('GUI:LoadingEx'));
    this.splashScreen.setCopyrightText(
      this.strings.get('TXT_COPYRIGHT') + "\n" + this.strings.get('GUI:WWBrand')
    );
    this.splashScreen.setDisclaimerText(this.strings.get('TS:Disclaimer'));

    // Simulate some delay and further loading steps as in original
    // const configDevMode = this.config.devMode !== undefined ? this.config.devMode : true;
    // await sleep(configDevMode ? 0 : 2000); // Shorter delay for MVP
    
    console.log('[MVP] Skipping GPU Benchmark, FileSystemAccess import, GameRes init for SplashScreen MVP.');

    // ---- Original logic for GameRes and further init would go here ----
    // For MVP, we stop after splash screen is shown.
    // The goal is to get to initGui and see the lobby, but that requires GameRes.
    // Let's make the splash screen "finish" after a delay for MVP.

    await sleep(3000); // Simulate some loading time
    this.splashScreen.setLoadingText("Almost ready...");
    await sleep(1500);

    // Transition out of splash screen (normally done by Gui.ts or other logic)
    // For MVP, let's just remove it and show a message.
    if (this.splashScreen) {
        this.splashScreen.destroy();
    }

    if (this.rootEl) {
        this.rootEl.innerHTML = '<h1>Splash Screen Finished (MVP)</h1><p>Next step: Integrate actual Gui and load lobby.</p>';
        console.log('[MVP] Splash screen finished. Further initialization (initGui, etc.) skipped for this MVP.');
    }
    
    // Original would continue with:
    // this.gameResConfig = l;
    // ... load CsfFile for strings ...
    // ... Engine.loadRules() ...
    // ... Sentry init ...
    // ... AudioContext polyfill ...
    // this.routing.init(); // Already migrated, can be called if needed by next steps.
    // await this.initGui(r, this.gameResConfig, this.cdnResourceLoader); // The BIG next step for lobby
    
    console.log("Application.main() [MVP] finished.");
  }
} 