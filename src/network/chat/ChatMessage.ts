export enum ChatRecipientType {
  /** Public chat channel (lobby, in-game, etc.) */
  Channel = 0,
  /** Page message (network chat page) */
  Page = 1,
  /** Direct whisper to a single player */
  Whisper = 2,
}

// NOTE: This file is currently a lightweight stub that only exposes the
// identifiers required by components already migrated to TypeScript.
// Replace with the full implementation when porting network chat logic. 