export function isHumanPlayerInfo(info: any): boolean {
  return "name" in info;
}

export enum AiDifficulty {
  Easy = 0
}

/**
 * 人类玩家信息接口
 */
export interface HumanPlayerInfo {
  name: string;
  countryId: number;
  colorId: number;
  startPos: number;
  teamId: number;
}

/**
 * AI玩家信息接口
 */
export interface AiPlayerInfo {
  difficulty: AiDifficulty;
  countryId: number;
  colorId: number;
  startPos: number;
  teamId: number;
}

/**
 * 游戏选项接口
 * 包含所有游戏配置选项
 */
export interface GameOpts {
  gameMode: number;
  gameSpeed: number;
  credits: number;
  unitCount: number;
  shortGame: boolean;
  superWeapons: boolean;
  buildOffAlly: boolean;
  mcvRepacks: boolean;
  cratesAppear: boolean;
  hostTeams?: boolean;
  destroyableBridges: boolean;
  multiEngineer: boolean;
  noDogEngiKills: boolean;
  
  // 地图相关
  mapName: string;
  mapTitle: string;
  mapDigest: string;
  mapSizeBytes: number;
  maxSlots: number;
  mapOfficial: boolean;
  
  // 玩家信息
  humanPlayers: HumanPlayerInfo[];
  aiPlayers: (AiPlayerInfo | undefined)[];
  
  // 其他可选字段
  unknown?: string;
}