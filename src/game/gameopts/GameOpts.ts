export function isHumanPlayerInfo(info: any): boolean {
  return "name" in info;
}

export enum AiDifficulty {
  Brutal = 0,
  Medium = 1,
  Easy = 2
}