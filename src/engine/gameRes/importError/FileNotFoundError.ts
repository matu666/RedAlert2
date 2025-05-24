/**
 * Custom FileNotFoundError specific to game resource loading.
 * This helps differentiate from VFS-level file not found errors if needed.
 */
export class FileNotFoundError extends Error {
  public fileName?: string;

  constructor(messageOrFileName: string, fileName?: string) {
    if (fileName) {
      super(`Game resource file not found: ${fileName}. ${messageOrFileName}`);
      this.fileName = fileName;
    } else {
      super(messageOrFileName); 
      this.fileName = messageOrFileName; // If only one arg, assume it's the filename
    }
    this.name = "GameResFileNotFoundError";
  }
} 