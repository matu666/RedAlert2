export class Replay {
  public static readonly extension = '.ra2replay';
  private finishedTick?: number;
  
  public static sanitizeFileName(filename: string): string {
    // Remove invalid characters from filename
    return filename.replace(/[<>:"/\\|?*]/g, '_');
  }

  finish(currentTick: number): void {
    this.finishedTick = currentTick;
  }
}
