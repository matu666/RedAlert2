import { Game } from "@/game/Game";
import { Player } from "@/game/Player";

export enum EffectStatus {
  NotStarted = 0,
  Running = 1,
  Finished = 2
}

export abstract class SuperWeaponEffect {
  protected type: string;
  protected owner: Player;
  protected tile: TileCoord;
  protected status: EffectStatus;

  constructor(type: string, owner: Player, tile: TileCoord) {
    this.type = type;
    this.owner = owner;
    this.tile = tile;
    this.status = EffectStatus.NotStarted;
  }

  abstract onStart(game: Game): void;
  
  onTick(game: Game): boolean {
    return true;
  }
}