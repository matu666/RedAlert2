import { AiDifficulty } from '../gameopts/GameOpts';
import { Bot } from './Bot';
import { DummyBot } from './DummyBot';

export class BotFactory {
  private botsLib: any;

  constructor(botsLib: any) {
    this.botsLib = botsLib;
  }

  create(player: { isAi: boolean; name: string; aiDifficulty: AiDifficulty; country: { name: string } }): Bot {
    if (!player.isAi) {
      throw new Error(`Player "${player.name}" is not an AI`);
    }

    switch (player.aiDifficulty) {
      case AiDifficulty.Easy:
        return new DummyBot(player.name, player.country.name);
      case AiDifficulty.Medium:
        if (this.botsLib.SupalosaBot) {
          return new this.botsLib.SupalosaBot(player.name, player.country.name);
        }
      default:
        throw new Error(`Unsupported AI difficulty "${player.aiDifficulty}"`);
    }
  }
}