import { IniFile } from './data/IniFile';
import { IniSection } from './data/IniSection';

// Define interfaces for the structured config data for better type safety
interface ViewportConfig {
  width: number;
  height: number;
}

interface SentryConfig {
  dsn: string;
  env: string;
  defaultIntegrations: boolean;
  lazyLoad: boolean;
}

export class Config {
  // Properties to store loaded configuration data
  // These will be populated by the load() method.
  // Using definite assignment assertion (!) as they are set in load(),
  // or provide default values / make them optional if load might not always set them.
  private generalData!: IniSection; 
  public viewport!: ViewportConfig;
  public sentry?: SentryConfig; // Sentry config is optional
  public corsProxies: [string, string][] = [];

  constructor() {
    // Initialization of corsProxies is done here as per original
    this.corsProxies = [];
  }

  public load(iniFile: IniFile): void {
    const generalSection = iniFile.getSection("General");
    if (!generalSection) {
      throw new Error("Missing [General] section in application config");
    }
    this.generalData = generalSection;

    this.viewport = {
      width: generalSection.getNumber("viewport.width"),
      height: generalSection.getNumber("viewport.height"),
    };

    const sentrySection = iniFile.getSection("Sentry");
    if (sentrySection) {
      this.sentry = {
        dsn: sentrySection.getString("dsn"),
        env: sentrySection.getString("env"),
        defaultIntegrations: sentrySection.getBool("defaultIntegrations"),
        lazyLoad: sentrySection.getBool("lazyLoad", true), // Default true as per original
      };
    }

    const corsProxySection = iniFile.getSection("CorsProxy");
    if (corsProxySection) {
      this.corsProxies = []; // Clear any previous proxies
      corsProxySection.entries.forEach((value, key) => {
        // Assuming value is a string, as it's a simple key-value in CorsProxy section
        if (typeof value === 'string') {
            this.corsProxies.push([key, value]);
        } else if (Array.isArray(value)){
            // If a key can have multiple proxy URLs, handle it (e.g., take the first, or store all)
            // Original code `for (var [s, a] of r.entries)` implies single value per key in Map iteration
            // but IniSection stores array for `key[]=` syntax. Assuming simple string value here for proxy target.
            console.warn(`[Config] CorsProxy key '${key}' has an array value, using first entry: ${value[0]}`);
            this.corsProxies.push([key, value[0]]);
        }
      });
    }
  }

  // Public getter for the raw general data IniSection
  public getGeneralData(): IniSection {
    if (!this.generalData) {
        // This should ideally not happen if load() is called correctly in constructor or early init
        // But as a safeguard, or if load() can fail and leave generalData undefined:
        console.warn("[Config] getGeneralData called before config was properly loaded. Returning empty section.");
        return new IniSection("General"); // Return an empty section to prevent crashes
    }
    return this.generalData;
  }

  // Getter methods, typed according to their expected return values
  get defaultLocale(): string {
    return this.generalData.getString("defaultLanguage", "en-US");
  }

  get serversUrl(): string {
    return this.generalData.getString("serversUrl", "servers.ini");
  }

  get gameresBaseUrl(): string | undefined {
    // Original: getString("gameresBaseUrl") || void 0;
    // getString returns default (empty string) if not found. Empty string || undefined is undefined.
    // If it returns actual empty string from INI, that would be returned.
    const url = this.generalData.getString("gameresBaseUrl");
    return url === "" ? undefined : url; 
  }

  get gameResArchiveUrl(): string | undefined {
    // Assuming this might also be optional or return empty string considered as undefined
    const url = this.generalData.getString("gameResArchiveUrl");
    return url === "" ? undefined : url; 
  }

  get mapsBaseUrl(): string | undefined {
    const url = this.generalData.getString("mapsBaseUrl");
    return url === "" ? undefined : url; 
  }

  get modsBaseUrl(): string | undefined {
    const url = this.generalData.getString("modsBaseUrl");
    return url === "" ? undefined : url; 
  }

  get devMode(): boolean {
    return this.generalData.getBool("dev");
  }

  get discordUrl(): string | undefined {
    const url = this.generalData.getString("discordUrl");
    return url.length > 0 ? url : undefined;
  }

  get patchNotesUrl(): string | undefined {
    const url = this.generalData.getString("patchNotesUrl");
    return url.length > 0 ? url : undefined;
  }

  get ladderRulesUrl(): string | undefined {
    const url = this.generalData.getString("ladderRulesUrl");
    return url.length > 0 ? url : undefined;
  }

  get modSdkUrl(): string | undefined {
    const url = this.generalData.getString("modSdkUrl");
    return url.length > 0 ? url : undefined;
  }

  get donateUrl(): string | undefined {
    const url = this.generalData.getString("donateUrl");
    return url.length > 0 ? url : undefined;
  }

  get breakingNewsUrl(): string | undefined {
    const url = this.generalData.getString("breakingNewsUrl");
    return url.length > 0 ? url : undefined;
  }

  get quickMatchEnabled(): boolean {
    return this.generalData.getBool("quickMatchEnabled");
  }

  get unrankedQueueEnabled(): boolean {
    return this.generalData.getBool("unrankedQueueEnabled", true); // Default true as per original
  }

  get botsEnabled(): boolean {
    return this.generalData.getBool("botsEnabled");
  }

  get oldClientsBaseUrl(): string | undefined {
    const url = this.generalData.getString("oldClientsBaseUrl");
    return url.length > 0 ? url : undefined;
  }

  get debugGameState(): boolean {
    return this.generalData.getBool("debugGameState");
  }

  get debugLogging(): boolean | string | undefined {
    // Original: var e = this.generalData.getString("debugLogging") || void 0;
    //           return e ? this.generalData.getBool("debugLogging") || e : void 0;
    // This logic is a bit convoluted. If getString returns a non-empty string, it tries to getBool with same key.
    // If getBool is false (or key not found for bool), it returns the string value. Otherwise bool true.
    const strVal = this.generalData.getString("debugLogging");
    if (strVal === "") return undefined; // Key not found or empty string means undefined logging config

    // If strVal is a typical boolean string ("true", "false", "1", "0"), getBool will handle it.
    // If getBool returns true, use true. 
    // If getBool returns false (because strVal is not a true-like string, e.g. "verbose" or it was actually "false"), then return strVal itself.
    const boolVal = this.generalData.getBool("debugLogging");
    if (boolVal) return true; // If it's explicitly true/1/yes/on
    if (strVal.toLowerCase() === 'false' || strVal === '0' || strVal.toLowerCase() === 'no' || strVal.toLowerCase() === 'off') return false; // If it's explicitly false/0/no/off
    
    return strVal; // Otherwise, return the string itself (e.g., "verbose", "debug")
  }

  public getCorsProxy(urlToMatch: string): string | undefined {
    let wildcardProxy: string | undefined = undefined;
    for (const [pattern, proxyUrl] of this.corsProxies) {
      if (pattern.startsWith(".")) { // e.g. .example.com
        if (urlToMatch.endsWith(pattern)) {
          return proxyUrl;
        }
      } else if (pattern === "*") {
        wildcardProxy = proxyUrl;
      } else {
        if (urlToMatch === pattern) {
          return proxyUrl;
        }
      }
    }
    return wildcardProxy;
  }
} 