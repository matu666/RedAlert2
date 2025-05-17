import { CsfFile } from './CsfFile';
import { sprintf } from 'sprintf-js';

export class Strings {
  private data: { [key: string]: string } = {};

  constructor(source?: CsfFile | { [key: string]: string }) {
    if (source) {
      if (source instanceof CsfFile) {
        this.fromCsf(source);
      } else if (typeof source === 'object') {
        this.fromJson(source as { [key: string]: string });
      }
    }
  }

  public fromCsf(csfFile: CsfFile): void {
    // CsfFile already stores keys in uppercase, matching the toLowerCase() behavior of original Strings.js for keys.
    this.fromJson(csfFile.data);
  }

  public fromJson(jsonData: { [key: string]: string }): void {
    for (const key of Object.keys(jsonData)) {
      // Original Strings.js converted keys to lowerCase upon setting.
      // CsfFile.ts now stores keys in upperCase.
      // To maintain consistency for lookup (which uses toLowerCase or toUpperCase):
      // Let's store keys as they are from CsfFile (uppercase) or convert to uppercase if from generic JSON.
      this.setValue(key, this.sanitizeValue(jsonData[key]));
    }
  }

  private sanitizeValue(value: string): string {
    // Replace %hs (and potentially %Hs, %hS, %HS) with %s for sprintf-js compatibility
    return value.replace(/%h[sS]/g, "%s");
  }

  public setValue(key: string, value: string): void {
    this.data[key.toUpperCase()] = value; // Store keys in uppercase for consistent lookup
  }

  public has(key: string): boolean {
    return key.toUpperCase() in this.data;
  }

  public get(key: string, ...args: any[]): string {
    const upperKey = key.toUpperCase();
    const value = this.data[upperKey];

    if (value !== undefined) {
      if (typeof value !== 'string') {
        console.warn(`[Strings] Invalid string value for key "${key}" (found type ${typeof value}). Returning key.`);
        return key; 
      }
      try {
        return args.length ? sprintf(value, ...args) : value;
      } catch (e) {
        console.warn(`[Strings] Error formatting string for key "${key}" with args ${JSON.stringify(args)}. Value: "${value}". Error: ${e}`);
        return value; // Return unformatted value on error
      }
    }

    // Handle "NOSTR:" prefix: if a key starts with this, strip it and return the rest.
    if (key.toUpperCase().startsWith('NOSTR:')) {
      return key.substring(6);
    }
    
    console.warn(`[Strings] String with key "${key}" not found. Returning key.`);
    return key;
  }

  public getKeys(): string[] {
    return Object.keys(this.data);
  }
} 