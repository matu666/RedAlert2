System.register(
  "gui/screen/game/worldInteraction/keyboard/command/CenterBaseCmd",
  ["engine/type/ObjectType", "game/rules/TechnoRules"],
  function (e, t) {
    "use strict";
    let ObjectType: any, TechnoRules: any, CenterBaseCmd: any;
    t && t.id;
    return {
      setters: [
        function (e: any) {
          ObjectType = e;
        },
        function (e: any) {
          TechnoRules = e;
        },
      ],
      execute: function () {
        e(
          "CenterBaseCmd",
          (CenterBaseCmd = class CenterBaseCmd {
            private player: any;
            private rules: any;
            private mapPanningHelper: any;
            private cameraPan: any;

            constructor(player: any, rules: any, mapPanningHelper: any, cameraPan: any) {
              this.player = player;
              this.rules = rules;
              this.mapPanningHelper = mapPanningHelper;
              this.cameraPan = cameraPan;
            }
            
            execute(): void {
              let tile: any;
              const primaryFactory = this.player.production.getPrimaryFactory(
                TechnoRules.FactoryType.BuildingType,
              );
              if (primaryFactory) {
                tile = primaryFactory.centerTile;
              } else {
                const baseUnit = this.player
                  .getOwnedObjectsByType(ObjectType.ObjectType.Vehicle)
                  .find((unit: any) =>
                    this.rules.general.baseUnit.includes(unit.name),
                  );
                if (baseUnit) {
                  tile = baseUnit.tile;
                }
              }
              if (tile) {
                this.cameraPan.setPan(
                  this.mapPanningHelper.computeCameraPanFromTile(
                    tile.rx,
                    tile.ry,
                  ),
                );
              }
            }
          }),
        );
      },
    };
  },
);
