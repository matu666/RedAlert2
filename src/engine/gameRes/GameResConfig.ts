import { GameResSource } from './GameResSource';

export class GameResConfig {
  private defaultCdnBaseUrl: string;
  public source?: GameResSource;
  public cdnUrl?: string; // Custom CDN URL, overrides default if set

  constructor(defaultCdnBaseUrl: string) {
    this.defaultCdnBaseUrl = defaultCdnBaseUrl;
  }

  /**
   * Parses a serialized string (e.g., from LocalPrefs) into this config object.
   * Format: "sourceType,encodedCdnUrl"
   * Example: "0,https%3A%2F%2Fmycdn.example.com%2F"
   * @param serializedConfig The string to unserialize.
   */
  unserialize(serializedConfig: string): void {
    const parts = serializedConfig.split(",");
    const sourceNum = Number(parts[0]);

    if (!(sourceNum in GameResSource)) { // Check if the number is a valid enum key
      throw new Error(`Unknown game res source type number: "${sourceNum}"`);
    }
    this.source = sourceNum as GameResSource;
    this.cdnUrl = parts[1] ? decodeURIComponent(parts[1]) : undefined;
  }

  /**
   * Serializes this config object into a string for storage.
   * @returns A string representation of the config.
   */
  serialize(): string {
    if (this.source === undefined) {
        throw new Error("GameResConfig source is undefined, cannot serialize.");
    }
    let serialized = String(this.source);
    if (this.cdnUrl) {
      serialized += "," + encodeURIComponent(this.cdnUrl);
    }
    return serialized;
  }

  isCdn(): boolean {
    return this.source === GameResSource.Cdn;
  }

  /**
   * Gets the effective CDN base URL.
   * Returns the custom cdnUrl if set, otherwise falls back to the defaultCdnBaseUrl 
   * provided during construction.
   */
  getCdnBaseUrl(): string | undefined {
    return this.cdnUrl ?? this.defaultCdnBaseUrl;
  }
} 