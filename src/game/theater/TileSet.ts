import type { TileSetEntry } from './TileSetEntry'; // Forward declaration for type hinting

export class TileSet {
  public fileName: string;    // Base filename for TMP files in this set (e.g., "AF01")
  public setName: string;     // Name of the set (e.g., "ClearToGreenLat")
  public tilesInSet: number;  // Number of main tiles in this set
  public entries: TileSetEntry[] = []; // Entries for each tile in the set

  constructor(fileName: string, setName: string, tilesInSet: number) {
    this.fileName = fileName;
    this.setName = setName;
    this.tilesInSet = tilesInSet;
  }
  
  // Helper to get a specific entry, if needed
  getEntry(indexInSet: number): TileSetEntry | undefined {
      return this.entries[indexInSet];
  }
} 