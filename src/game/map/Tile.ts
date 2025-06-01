// Re-export the Tile interface from TileCollection so that legacy import paths
// like `../map/Tile` continue to work after the migration.
// This keeps the original public API intact without duplicating definitions.

export type { Tile } from './TileCollection'; 