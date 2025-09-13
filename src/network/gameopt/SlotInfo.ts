/**
 * 游戏槽位类型枚举
 * 定义游戏大厅中每个玩家槽位的类型
 */
export enum SlotType {
  Closed = 0,      // 关闭的槽位
  Open = 1,        // 开放的槽位（等待玩家加入）
  OpenObserver = 2, // 开放的观察者槽位
  Player = 3,      // 真人玩家
  Ai = 4           // AI玩家
}

/**
 * 槽位信息接口
 * 描述游戏大厅中每个槽位的状态和信息
 */
export interface SlotInfo {
  type: SlotType;
  name?: string;         // 玩家名称（仅当type为Player时）
  difficulty?: number;   // AI难度（仅当type为Ai时）
}

// 玩家和AI玩家信息的接口已经移动到 GameOpts.ts 中统一管理

/**
 * Ping信息接口
 * 描述玩家的网络延迟信息
 */
export interface PingInfo {
  playerName: string;
  ping: number;
}
