export class Replay {
  public static readonly extension = '.ra2replay';
  
  public static sanitizeFileName(filename: string): string {
    // Remove invalid characters from filename
    return filename.replace(/[<>:"/\\|?*]/g, '_');
  }
}
