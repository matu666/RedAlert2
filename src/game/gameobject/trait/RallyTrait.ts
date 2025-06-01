import { TerrainType } from '@/engine/type/TerrainType';
import { RadialTileFinder } from '@/game/map/tileFinder/RadialTileFinder';
import { FactoryType } from '@/game/rules/TechnoRules';
import { MovementZone } from '@/game/type/MovementZone';
import { SpeedType } from '@/game/type/SpeedType';
import { Tile } from '@/game/map/Tile';
import { World } from '@/game/World';
import { GameObject } from '@/game/gameobject/GameObject';

export class RallyTrait {
  private rallyPoint?: Tile;

  getRallyPoint(): Tile | undefined {
    return this.rallyPoint;
  }

  changeRallyPoint(gameObject: GameObject, targetTile: Tile, world: World): void {
    const validPoint = this.findValidRallyPoint(gameObject, targetTile, world);
    if (validPoint) {
      this.rallyPoint = validPoint;
    }
  }

  findValidRallyPoint(gameObject: GameObject, targetTile: Tile, world: World): Tile | undefined {
    const finder = new RadialTileFinder(
      world.tiles,
      world.mapBounds,
      targetTile,
      { width: 1, height: 1 },
      0,
      20,
      (tile) =>
        gameObject.rules.naval === (tile.terrainType === TerrainType.Water) &&
        !world.tileOccupation.isTileOccupiedBy(tile, gameObject)
    );

    let validTile = finder.getNextTile();

    if (!validTile && gameObject.factoryTrait?.type === FactoryType.NavalUnitType) {
      const { width, height } = gameObject.getFoundation();
      for (let x = 0; x < width; x++) {
        for (let y = 0; y < height; y++) {
          const tile = world.tiles.getByMapCoords(
            gameObject.tile.rx + x,
            gameObject.tile.ry + y
          );
          if (!tile) break;
          if (world.terrain.getPassableSpeed(tile, SpeedType.Float, false, false) > 0) {
            validTile = tile;
            break;
          }
        }
      }
    }

    return validTile;
  }

  findRallyNodeForUnit(unit: GameObject, world: World): { tile: Tile; onBridge?: any } | undefined {
    if (this.rallyPoint) {
      const rallyTile = this.findRallyPointforUnit(unit, this.rallyPoint, world, true);
      return {
        tile: rallyTile,
        onBridge: unit.rules.naval ? undefined : world.tileOccupation.getBridgeOnTile(rallyTile)
      };
    }
  }

  findRallyPointforUnit(
    unit: GameObject,
    targetTile: Tile,
    world: World,
    checkBuildings: boolean,
    targetElevation?: number
  ): Tile {
    const bridge = unit.rules.naval ? undefined : world.tileOccupation.getBridgeOnTile(targetTile);
    const isFlying = unit.rules.movementZone === MovementZone.Fly;

    const finder = new RadialTileFinder(
      world.tiles,
      world.mapBounds,
      targetTile,
      { width: 1, height: 1 },
      0,
      5,
      (tile) => {
        const tileBridge = !bridge || bridge.isHighBridge() 
          ? world.tileOccupation.getBridgeOnTile(tile)
          : undefined;

        return (
          !(isFlying ? [] : world.terrain.findObstacles({ tile, onBridge: tileBridge }, unit)).length &&
          (targetElevation === undefined || Math.abs(targetElevation - (tile.z + (tileBridge?.tileElevation ?? 0))) < 4) &&
          (!checkBuildings || !world.getObjectsOnTile(tile).find(obj => obj.isBuilding() && !obj.isDestroyed)) &&
          (isFlying || world.terrain.getPassableSpeed(tile, unit.rules.speedType, unit.isInfantry(), !!tileBridge) > 0)
        );
      }
    );

    return finder.getNextTile() ?? targetTile;
  }
}