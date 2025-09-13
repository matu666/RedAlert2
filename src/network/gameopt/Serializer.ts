import { DataStream } from '@/data/DataStream';
import { SlotType, SlotInfo, PingInfo } from './SlotInfo';
import { GameOpts, AiDifficulty, HumanPlayerInfo, AiPlayerInfo } from '@/game/gameopts/GameOpts';
import { MapNameLegacyEncoder } from './MapNameLegacyEncoder';
import { FileNameEncoder } from './FileNameEncoder';
import { Base64 } from '@/util/Base64';
import { utf16ToBinaryString, binaryStringToUint8Array } from '@/util/string';

/**
 * 游戏选项序列化器
 * 用于将游戏选项、玩家信息、地图数据等序列化为字符串格式
 */
export class Serializer {
  static readonly MAX_ACTION_PAYLOAD_SIZE = 65536;

  /**
   * 序列化游戏选项
   * @param gameOpts 游戏选项对象
   * @param useLegacyMapName 是否使用传统地图名称编码
   * @returns 序列化后的字符串
   */
  serializeOptions(gameOpts: GameOpts, useLegacyMapName = false): string {
    const gameMode = gameOpts.gameMode;
    const mapTitle = useLegacyMapName
      ? new MapNameLegacyEncoder().encode(gameOpts.mapTitle)
      : Base64.encode(utf16ToBinaryString(gameOpts.mapTitle));
    const mapName = new FileNameEncoder().encode(gameOpts.mapName);

    const optionsParts = [
      '0',  // 占位符
      '0',  // 占位符
      6 - gameOpts.gameSpeed,
      gameOpts.credits,
      gameOpts.unitCount,
      Number(gameOpts.shortGame),
      Number(gameOpts.superWeapons),
      Number(gameOpts.buildOffAlly),
      Number(gameOpts.mcvRepacks),
      Number(gameOpts.cratesAppear),
      gameMode,
      Number(gameOpts.hostTeams ?? false),
      mapTitle,
      gameOpts.maxSlots,
      Number(gameOpts.mapOfficial),
      gameOpts.mapSizeBytes,
      mapName,
      gameOpts.mapDigest,
      Number(gameOpts.destroyableBridges),
      Number(gameOpts.multiEngineer),
      Number(gameOpts.noDogEngiKills),
      ...(gameOpts.unknown ? [gameOpts.unknown] : [])
    ].join(',');

    const playersPart = gameOpts.humanPlayers
      .map(player => `${player.name},${player.countryId},${player.colorId},${player.startPos},${player.teamId},0,0,0`)
      .join(',');

    const aiPart = this.serializeAiOpts(gameOpts.aiPlayers);

    return `${optionsParts}:${playersPart}:@:${aiPart},`;
  }

  /**
   * 序列化AI选项
   * @param aiPlayers AI玩家数组
   * @returns 序列化后的字符串
   */
  serializeAiOpts(aiPlayers: (AiPlayerInfo | undefined)[]): string {
    return aiPlayers
      .map(ai => 
        ai 
          ? `${ai.difficulty},${ai.countryId},${ai.colorId},${ai.startPos},${ai.teamId}`
          : '0,-1,-1,-1,-1'
      )
      .join(',');
  }

  /**
   * 序列化Ping数据
   * @param pings Ping信息数组
   * @returns 序列化后的字符串
   */
  serializePingData(pings: PingInfo[]): string {
    return pings.length + ',' + pings.map(ping => `${ping.playerName},${ping.ping}`).join(',');
  }

  /**
   * 序列化槽位数据
   * @param slots 槽位信息数组
   * @returns 序列化后的字符串
   */
  serializeSlotData(slots: SlotInfo[]): string {
    const slotStrings = slots.map(slot => {
      if (slot.type === SlotType.Closed) {
        return '@Closed@';
      }
      if (slot.type === SlotType.Open) {
        return '@Open@';
      }
      if (slot.type === SlotType.OpenObserver) {
        return '@OpenObserver@';
      }
      if (slot.type === SlotType.Ai) {
        if (slot.difficulty === AiDifficulty.Easy) {
          return '@EasyAI@';
        }
        if (slot.difficulty === AiDifficulty.Medium) {
          return '@MediumAI@';
        }
        if (slot.difficulty === AiDifficulty.Brutal) {
          return '@HardAI@';
        }
      } else if (slot.type === SlotType.Player) {
        return slot.name;
      }
      
      throw new Error(`Unexpected slot info with type ${SlotType[slot.type]}`);
    });

    return slotStrings.join(',') + ',';
  }

  /**
   * 序列化加载信息
   * @param loadInfo 加载信息数组
   * @returns 序列化后的字符串
   */
  serializeLoadInfo(loadInfo: Array<{
    name: string;
    status: number;
    loadPercent: number;
    ping: number;
    lagAllowanceMillis: number;
  }>): string {
    return loadInfo
      .map(info => [
        info.name,
        info.status,
        info.loadPercent,
        info.ping,
        info.lagAllowanceMillis
      ].join(','))
      .join(',');
  }

  /**
   * 序列化玩家操作
   * @param actions 操作数组
   * @returns 序列化后的字节数组
   */
  serializePlayerActions(actions: Array<{ id: number; params: Uint8Array }>): Uint8Array {
    const stream = new DataStream();
    stream.writeUint8(actions.length);

    for (const { id, params } of actions) {
      stream.writeUint8(id);
      stream.writeUint16(params.byteLength);
      
      if (params.byteLength > 0) {
        if (params.byteLength > Serializer.MAX_ACTION_PAYLOAD_SIZE - stream.position) {
          console.error(`Action #${id} payload exceeds max data size`, params);
          throw new RangeError('Maximum payload data size exceeded');
        }
        stream.writeUint8Array(params);
      }
    }

    return stream.toUint8Array();
  }

  /**
   * 序列化所有玩家操作
   * @param stream 输出数据流
   * @param allActions 所有玩家操作映射
   */
  serializeAllPlayerActions(
    stream: DataStream, 
    allActions: Map<number, Array<{ id: number; params: Uint8Array }>>
  ): void {
    stream.writeUint8(allActions.size);

    for (const [playerId, actions] of allActions) {
      stream.writeUint8(playerId);
      const serializedActions = this.serializePlayerActions(actions);
      stream.writeUint16(serializedActions.byteLength);
      
      if (serializedActions.byteLength > 0) {
        if (serializedActions.byteLength > Serializer.MAX_ACTION_PAYLOAD_SIZE) {
          console.error(`Player #${playerId} actions payload exceeds max data size`, actions);
          throw new RangeError('Maximum payload data size exceeded');
        }
        stream.writeUint8Array(serializedActions);
      }
    }
  }

  /**
   * 序列化地图数据
   * @param mapData 地图数据字符串
   * @returns 序列化后的字节数组
   */
  serializeMapData(mapData: string): Uint8Array {
    return binaryStringToUint8Array(mapData);
  }
}
