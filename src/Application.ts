import { BoxedVar } from './util/BoxedVar';
import { EventDispatcher } from './util/event'; // Import EventDispatcher
import { Routing } from './util/Routing'; // Already migrated
import { sleep } from './util/time'; // Already migrated
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

// Type for the callback function
export type SplashScreenUpdateCallback = (props: ComponentProps<typeof SplashScreenComponent> | null) => void;

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
  private strings!: Strings; // Now definitely assigned after loadTranslations
  private localPrefs: MockLocalPrefs; // Placeholder
  private rootEl: HTMLElement | null = null;
  private runtimeVars: MockConsoleVars;
  private fullScreen: MockFullScreen;
  
  // Store the component type and its current props
  private splashScreenComponentType: typeof SplashScreenComponent | null = null; 
  private currentSplashScreenProps: ComponentProps<typeof SplashScreenComponent> | null = null;
  private splashScreenUpdateCb: SplashScreenUpdateCallback | null = null;

  public routing: Routing;

  // Add other necessary properties as stubs or with 'any' type for now
  private sentry: typeof mockSentry | undefined = mockSentry; // Assuming Sentry might be optional
  private currentLocale: string = 'en-US'; // Default, will be updated from config/CSF
  private fsAccessLib: any; // For SystemJS.import('file-system-access')
  private gameResConfig: any;
  private cdnResourceLoader: any;
  private gpuTier: any;

  constructor(private onSplashScreenUpdate?: SplashScreenUpdateCallback) {
    this.viewport = new BoxedVar({ x: 0, y: 0, width: window.innerWidth, height: window.innerHeight });
    this.routing = new Routing(); // Routing is already migrated
    this.splashScreenUpdateCb = onSplashScreenUpdate || null;

    // Initialize other properties that were in original constructor or early main
    // For MVP, many will be mocked or have placeholder values
    this.localPrefs = new MockLocalPrefs(localStorage);
    this.runtimeVars = new MockConsoleVars();
    this.fullScreen = new MockFullScreen(document);
    // splashScreen is initialized in main()

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
    const newWidth = isFullScreen ? window.screen.width : window.innerWidth;
    const newHeight = isFullScreen ? window.screen.height : window.innerHeight;
    this.viewport.value = { ...this.viewport.value, width: newWidth, height: newHeight };
    console.log(`[MVP] updateViewportSize: ${newWidth}x${newHeight}, Fullscreen: ${isFullScreen}`);
        if (this.currentSplashScreenProps) {
            this.setSplashScreenProps({
                ...this.currentSplashScreenProps,
                width: newWidth,
                height: newHeight,
            });
        }
  }

  private onFullScreenChange(isFullScreen: boolean): void {
    console.log(`[MVP] onFullScreenChange: ${isFullScreen}`);
  }

  private async loadGpuBenchmarkData(): Promise<any> {
    console.log('[MVP] Skipping Application.loadGpuBenchmarkData()');
    return { tier: 1, type: 'MOCK_GPU' }; // Return some mock tier
  }

  // Method to update splash screen props and notify React layer
  private setSplashScreenProps(props: ComponentProps<typeof SplashScreenComponent> | null): void {
    this.currentSplashScreenProps = props;
    this.splashScreenComponentType = props ? SplashScreenComponent : null;
    if (this.splashScreenUpdateCb) {
      this.splashScreenUpdateCb(this.currentSplashScreenProps);
    }
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
    
    await this.loadTranslations(); // Load real translations

    // --- BEGIN MixFile Test ---
    console.log("[Application.main] Attempting to load and test ini.mix...");
    try {
      const mixFilePath = '/ini.mix'; // Assuming ini.mix is in public/
      const response = await fetch(mixFilePath);
      if (!response.ok) {
        throw new Error(`Failed to fetch ${mixFilePath}: ${response.status} ${response.statusText}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      const dataStream = new DataStream(arrayBuffer);
      dataStream.dynamicSize = false; // The buffer is fixed size from fetch

      console.log(`[MixFile Test] DataStream for ${mixFilePath} created, length: ${dataStream.byteLength}`);
      
      const mixFileInstance = new MixFile(dataStream); // Use the statically imported MixFile
      console.log("[MixFile Test] MixFile instance created successfully for ini.mix!");

      // List some entries
      console.log("[MixFile Test] Listing first 5 entries (if available):");
      let count = 0;
      // @ts-ignore: Accessing private 'index' for testing purposes
      const indexMap: Map<number, any> = mixFileInstance.index; 
      for (const [hash, entry] of indexMap.entries()) {
        if (count >= 5) break;
        console.log(`  Entry ${count + 1}: Hash=0x${hash.toString(16).toUpperCase()}, Offset=${entry.offset}, Length=${entry.length}`);
        count++;
      }
      if (count === 0) {
        console.log("  No entries found in the MixFile index (or index is empty).");
      }

      // Test containsFile and openFile for a common file like 'rules.ini'
      const testFileName = "rules.ini"; // Adjust if you know a specific file in ini.mix
      console.log(`[MixFile Test] Checking for "${testFileName}"...`);
      const دارد_فایل = mixFileInstance.containsFile(testFileName);
      console.log(`[MixFile Test] mixFile.containsFile("${testFileName}"): ${ دارد_فایل}`);

      if ( دارد_فایل) {
        console.log(`[MixFile Test] Attempting to open "${testFileName}"...`);
        try {
          const virtualFile = mixFileInstance.openFile(testFileName);
          console.log(`[MixFile Test] Successfully opened "${virtualFile.filename}", Size: ${virtualFile.getSize()} bytes.`);
          // You could try reading a few bytes if needed: virtualFile.stream.readUint8Array(10)
        } catch (openError) {
          console.error(`[MixFile Test] Error opening "${testFileName}":`, openError);
        }
      }

    } catch (error) {
      console.error("[MixFile Test] Error during MixFile test:", error);
    }
    // --- END MixFile Test ---

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

    this.setSplashScreenProps({
        width: this.viewport.value.width,
        height: this.viewport.value.height,
        parentElement: this.rootEl,
        loadingText: this.strings.get('GUI:LoadingEx', `(Locale: ${this.currentLocale})`),
        copyrightText: this.strings.get('TXT_COPYRIGHT') + "\n" + this.strings.get('GUI:WWBrand'),
        disclaimerText: this.strings.get('TS:Disclaimer'),
        onRender: () => {
            console.log("Real SplashScreen rendered with real strings (hopefully).");
        }
    });
    
    console.log("[Application] Initial SplashScreen props set with real strings. Callback invoked.");
    
    const devMode = this.config && this.config.devMode !== undefined ? this.config.devMode : true;
    console.log(`[Application] Splash screen delay based on devMode (${devMode}). Original delay: ${devMode ? 0 : 5000}ms`);
    await sleep(devMode ? 500 : 3000);
    
    console.log('[MVP] Skipping GPU Benchmark, FileSystemAccess import, GameRes init for SplashScreen MVP.');

    await sleep(1500); 
    if (this.currentSplashScreenProps) {
        this.setSplashScreenProps({
            ...this.currentSplashScreenProps,
            loadingText: this.strings.get('GUI:AlmostReady', '...')
        });
        console.log("[Application] SplashScreen loadingText updated with real string. Callback invoked.");
    }
    await sleep(1000);

    this.setSplashScreenProps(null); // This will hide/unmount the splash screen
    console.log("[Application] SplashScreen props set to null to hide/destroy. Callback invoked if registered.");

    // The following DOM manipulation is now handled by App.tsx rendering FileExplorerTest
    if (this.rootEl) {
        // Clear previous content
        this.rootEl.innerHTML = '';

        // Create a placeholder for where the React component should go
        const reactTestBed = document.createElement('div');
        reactTestBed.id = "file-explorer-test-bed";
        this.rootEl.appendChild(reactTestBed);

        // Instruct the user or a subsequent script to render the React component here
        const messageDiv = document.createElement('div');
        messageDiv.style.padding = "20px";
        messageDiv.style.textAlign = "center";
        messageDiv.innerHTML = `
            <h1>Application Initialized</h1>
            <p><code>Application.main()</code> has completed.</p>
            <p><strong>Next Step:</strong> To test the File Explorer, you need to ensure that the 
            <code>FileExplorerTest</code> React component is rendered into the div with ID 
            <code>file-explorer-test-bed</code>.</p>
            // ... (rest of the instructional message) ...
        `;
        this.rootEl.appendChild(messageDiv);
    }
    
    console.log("Application.main() finished. UI rendering is now delegated to App.tsx.");
  }
} 