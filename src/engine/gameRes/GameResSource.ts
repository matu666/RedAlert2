export enum GameResSource {
  Archive = 0, // Game resources are from a single archive file (e.g., user-provided .zip or .7z)
  Cdn = 1,     // Game resources are hosted on a CDN
  Local = 2,   // Game resources are from a local directory selected by the user
} 