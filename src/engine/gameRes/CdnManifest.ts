export interface CdnManifest {
  version: number;
  format: string;
  checksums?: Record<string, number | string>; // Checksums can be numbers or hex strings
  // Add other fields based on actual manifest.json structure when known
  [key: string]: any; // Allows for other properties not yet defined
} 