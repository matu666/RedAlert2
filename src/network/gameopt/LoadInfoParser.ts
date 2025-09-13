export interface LoadInfo {
  name: string;
  status: number;
  loadPercent: number;
  ping: number;
  lagAllowanceMillis: number;
}

/**
 * Parses load information data from the server
 * Used during multiplayer game loading to track player loading progress
 */
export class LoadInfoParser {
  /**
   * Parse load info string from server into structured data
   * Format: "name1,status1,loadPercent1,ping1,lagAllowance1,name2,status2,..."
   */
  parse(data: string): LoadInfo[] {
    const result: LoadInfo[] = [];
    const parts = data.split(',');
    
    // Each player info consists of 5 parts: name, status, loadPercent, ping, lagAllowanceMillis
    for (let i = 0; i < parts.length / 5; ++i) {
      const playerInfo: LoadInfo = {
        name: parts[5 * i],
        status: Number(parts[5 * i + 1]),
        loadPercent: Number(parts[5 * i + 2]),
        ping: Number(parts[5 * i + 3]),
        lagAllowanceMillis: Number(parts[5 * i + 4])
      };
      result.push(playerInfo);
    }
    
    return result;
  }
}
