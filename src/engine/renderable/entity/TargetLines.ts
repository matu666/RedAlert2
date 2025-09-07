import { Coords } from "@/game/Coords";
import { TargetLinesConfig } from "@/game/gameobject/task/system/TargetLinesConfig";
import { ZoneType } from "@/game/gameobject/unit/ZoneType";
import * as THREE from "three";

interface LineObjects {
  root: THREE.Object3D;
  line: THREE.Line;
  srcLineHead: THREE.Mesh;
  destLineHead: THREE.Mesh;
}

export class TargetLines {
  private obj?: THREE.Object3D;
  private unitPaths: Map<any, any>;
  private unitLines: Map<any, LineObjects>;
  private lineHeadGeometry: THREE.PlaneGeometry;
  private attackLineMaterial?: THREE.LineBasicMaterial;
  private moveLineMaterial?: THREE.LineBasicMaterial;
  private attackLineHeadMaterial?: THREE.MeshBasicMaterial;
  private moveLineHeadMaterial?: THREE.MeshBasicMaterial;
  private selectionHash?: string;
  private showStart?: number;

  constructor(
    private currentPlayer: any,
    private unitSelection: any,
    private camera: any,
    private debugPaths: any,
    private enabled: any
  ) {
    this.unitPaths = new Map();
    this.unitLines = new Map();
    this.lineHeadGeometry = new THREE.PlaneGeometry(
      3 * Coords.ISO_WORLD_SCALE,
      3 * Coords.ISO_WORLD_SCALE
    );
  }

  create3DObject(): void {
    if (!this.obj) {
      this.obj = new THREE.Object3D();
      this.obj.name = "target_lines";
      this.obj.matrixAutoUpdate = false;

      this.attackLineMaterial = new THREE.LineBasicMaterial({
        color: 11337728,
        transparent: true,
        depthTest: false,
        depthWrite: false,
      });

      this.moveLineMaterial = new THREE.LineBasicMaterial({
        color: 43520,
        transparent: true,
        depthTest: false,
        depthWrite: false,
      });

      this.attackLineHeadMaterial = new THREE.MeshBasicMaterial({
        color: 11337728,
        transparent: true,
        depthTest: false,
        depthWrite: false,
      });

      this.moveLineHeadMaterial = new THREE.MeshBasicMaterial({
        color: 43520,
        transparent: true,
        depthTest: false,
        depthWrite: false,
      });
    }
  }

  get3DObject(): THREE.Object3D | undefined {
    return this.obj;
  }

  forceShow(): void {
    this.selectionHash = undefined;
  }

  update(n: number): void {
    if (this.obj) {
      this.obj.visible = this.enabled.value;
    }

    if (this.enabled.value) {
      const hash = this.unitSelection.getHash();
      if (this.selectionHash === undefined || this.selectionHash !== hash) {
        this.selectionHash = hash;
        this.hideAllLines();
        this.unitPaths.clear();
        this.disposeUnitLines();

        this.unitSelection.getSelectedUnits().forEach((unit: any) => {
          if (
            unit.isUnit() &&
            (!this.currentPlayer || unit.owner === this.currentPlayer)
          ) {
            this.unitPaths.set(
              unit,
              TargetLinesConfig.cloneConfig(unit.unitOrderTrait.targetLinesConfig)
            );
            this.updateLines(unit);
            if (
              unit.zone !== ZoneType.Air &&
              !TargetLinesConfig.configHasTarget(unit.unitOrderTrait.targetLinesConfig)
            ) {
              return;
            }
            this.showLines(unit, n);
          }
        });
        return;
      }

      let needsUpdate = false;
      this.unitSelection.getSelectedUnits().forEach((unit: any) => {
        if (
          unit.isUnit() &&
          (!this.currentPlayer || unit.owner === this.currentPlayer)
        ) {
          if (
            !this.unitPaths.has(unit) ||
            !TargetLinesConfig.configsAreEqual(
              this.unitPaths.get(unit),
              unit.unitOrderTrait.targetLinesConfig
            ) ||
            unit.unitOrderTrait.targetLinesConfig?.isRecalc
          ) {
            this.unitPaths.set(
              unit,
              TargetLinesConfig.cloneConfig(unit.unitOrderTrait.targetLinesConfig)
            );
            needsUpdate = true;
            this.updateLines(unit);
            if (TargetLinesConfig.configHasTarget(unit.unitOrderTrait.targetLinesConfig)) {
              this.showLines(unit, n);
            }
          }

          const lineObjects = this.unitLines.get(unit);
          const worldPos = unit.position.worldPosition;
          if (lineObjects) {
            const srcChanged = !worldPos.equals(lineObjects.srcLineHead.position);
            const target = unit.unitOrderTrait.targetLinesConfig?.target;
            const targetPos = target ? target.position.worldPosition : undefined;
            const destChanged = targetPos && !targetPos.equals(lineObjects.destLineHead.position);

            if (srcChanged || destChanged) {
              const geometry = lineObjects.line.geometry;
              geometry.verticesNeedUpdate = true;

              if (srcChanged) {
                geometry.vertices[geometry.vertices.length - 1].copy(worldPos);
                lineObjects.srcLineHead.position.copy(worldPos);
                lineObjects.srcLineHead.updateMatrix();
              }

              if (targetPos && destChanged) {
                geometry.vertices[0].copy(targetPos);
                lineObjects.destLineHead.position.copy(targetPos);
                lineObjects.destLineHead.updateMatrix();
              }
            }
          }
        }
      });

      if (needsUpdate) {
        return;
      }

      if (this.showStart !== undefined && n - this.showStart >= 1000) {
        this.hideAllLines();
      }
    }
  }

  showLines(unit: any, time: number): void {
    this.showStart = time;
    this.unitLines.get(unit)!.root.visible = true;
  }

  hideAllLines(): void {
    this.showStart = undefined;
    this.unitLines.forEach((objects) => {
      objects.root.visible = false;
    });
  }

  updateLines(unit: any): void {
    let config = unit.unitOrderTrait.targetLinesConfig;
    if (!config || !TargetLinesConfig.configHasTarget(config)) {
      if (unit.zone !== ZoneType.Air) {
        if (this.unitLines.has(unit)) {
          const objects = this.unitLines.get(unit)!;
          this.obj?.remove(objects.root);
          this.disposeLineObjects(objects);
          this.unitLines.delete(unit);
        }
        return;
      }
      config = {
        pathNodes: [
          { tile: unit.tile, onBridge: undefined },
          { tile: unit.tile, onBridge: undefined },
        ],
      };
    }

    const geometry = new THREE.Geometry();
    let pathNodes = config.pathNodes;

    if (pathNodes.length) {
      if (!this.debugPaths.value) {
        pathNodes = [pathNodes[0], pathNodes[pathNodes.length - 1]];
      }

      pathNodes.forEach((node) => {
        const pos = Coords.tile3dToWorld(
          node.tile.rx + 0.5,
          node.tile.ry + 0.5,
          node.tile.z + (node.onBridge?.tileElevation ?? 0)
        );
        geometry.vertices.push(pos);
      });

      geometry.vertices[geometry.vertices.length - 1].copy(unit.position.worldPosition);
    } else {
      const target = config.target;
      geometry.vertices.push(target.position.worldPosition, unit.position.worldPosition);
    }

    const isAttack = !!config.isAttack;
    const material = isAttack ? this.attackLineMaterial! : this.moveLineMaterial!;
    // TODO(r177): migrate to BufferGeometry/LineSegments if needed
    const line = new THREE.Line(geometry, material);
    line.matrixAutoUpdate = false;

    const srcHead = this.createLineHead(isAttack);
    srcHead.position.copy(geometry.vertices[geometry.vertices.length - 1]);
    srcHead.matrixAutoUpdate = false;
    srcHead.updateMatrix();

    const destHead = this.createLineHead(isAttack);
    destHead.position.copy(geometry.vertices[0]);
    destHead.matrixAutoUpdate = false;
    destHead.updateMatrix();

    line.renderOrder = srcHead.renderOrder = destHead.renderOrder = 1000000;

    const root = new THREE.Object3D();
    root.matrixAutoUpdate = false;
    root.visible = false;
    root.add(line);
    root.add(srcHead);
    root.add(destHead);

    if (this.unitLines.has(unit)) {
      const oldObjects = this.unitLines.get(unit)!;
      this.obj?.remove(oldObjects.root);
      this.disposeLineObjects(oldObjects);
    }

    this.unitLines.set(unit, {
      root,
      line,
      srcLineHead: srcHead,
      destLineHead: destHead,
    });

    this.obj?.add(root);
  }

  createLineHead(isAttack: boolean): THREE.Mesh {
    const mesh = new THREE.Mesh(
      this.lineHeadGeometry,
      isAttack ? this.attackLineHeadMaterial! : this.moveLineHeadMaterial!
    );
    const quaternion = new THREE.Quaternion().setFromEuler(this.camera.rotation);
    mesh.setRotationFromQuaternion(quaternion);
System.register(
    "engine/renderable/entity/TargetLines",
    [
      "game/Coords",
      "game/gameobject/task/system/TargetLinesConfig",
      "game/gameobject/unit/ZoneType",
    ],
    function (e, t) {
      "use strict";
      var h, u, d, i;
      t && t.id;
      return {
        setters: [
          function (e) {
            h = e;
          },
          function (e) {
            u = e;
          },
          function (e) {
            d = e;
          },
        ],
        execute: function () {
          e(
            "TargetLines",
            (i = class {
              constructor(e, t, i, r, s) {
                (this.currentPlayer = e),
                  (this.unitSelection = t),
                  (this.camera = i),
                  (this.debugPaths = r),
                  (this.enabled = s),
                  (this.unitPaths = new Map()),
                  (this.unitLines = new Map()),
                  (this.lineHeadGeometry = new THREE.PlaneGeometry(
                    3 * h.Coords.ISO_WORLD_SCALE,
                    3 * h.Coords.ISO_WORLD_SCALE,
                  ));
              }
              create3DObject() {
                this.obj ||
                  ((this.obj = new THREE.Object3D()),
                  (this.obj.name = "target_lines"),
                  (this.obj.matrixAutoUpdate = !1),
                  (this.attackLineMaterial = new THREE.LineBasicMaterial({
                    color: 11337728,
                    transparent: !0,
                    depthTest: !1,
                    depthWrite: !1,
                  })),
                  (this.moveLineMaterial = new THREE.LineBasicMaterial({
                    color: 43520,
                    transparent: !0,
                    depthTest: !1,
                    depthWrite: !1,
                  })),
                  (this.attackLineHeadMaterial = new THREE.MeshBasicMaterial({
                    color: 11337728,
                    transparent: !0,
                    depthTest: !1,
                    depthWrite: !1,
                  })),
                  (this.moveLineHeadMaterial = new THREE.MeshBasicMaterial({
                    color: 43520,
                    transparent: !0,
                    depthTest: !1,
                    depthWrite: !1,
                  })));
              }
              get3DObject() {
                return this.obj;
              }
              forceShow() {
                this.selectionHash = void 0;
              }
              update(n) {
                if (
                  ((this.obj.visible = this.enabled.value), this.enabled.value)
                ) {
                  var e = this.unitSelection.getHash();
                  if (void 0 === this.selectionHash || this.selectionHash !== e)
                    return (
                      (this.selectionHash = e),
                      this.hideAllLines(),
                      this.unitPaths.clear(),
                      this.disposeUnitLines(),
                      void this.unitSelection
                        .getSelectedUnits()
                        .forEach((e) => {
                          !e.isUnit() ||
                            (this.currentPlayer &&
                              e.owner !== this.currentPlayer) ||
                            (this.unitPaths.set(
                              e,
                              u.cloneConfig(e.unitOrderTrait.targetLinesConfig),
                            ),
                            this.updateLines(e),
                            (e.zone !== d.ZoneType.Air &&
                              !u.configHasTarget(
                                e.unitOrderTrait.targetLinesConfig,
                              )) ||
                              this.showLines(e, n));
                        })
                    );
                  {
                    let t = !1;
                    if (
                      (this.unitSelection.getSelectedUnits().forEach((e) => {
                        if (
                          e.isUnit() &&
                          (!this.currentPlayer ||
                            e.owner === this.currentPlayer)
                        ) {
                          (this.unitPaths.has(e) &&
                            u.configsAreEqual(
                              this.unitPaths.get(e),
                              e.unitOrderTrait.targetLinesConfig,
                            )) ||
                            e.unitOrderTrait.targetLinesConfig?.isRecalc ||
                            (this.unitPaths.set(
                              e,
                              u.cloneConfig(e.unitOrderTrait.targetLinesConfig),
                            ),
                            (t = !0),
                            this.updateLines(e),
                            u.configHasTarget(
                              e.unitOrderTrait.targetLinesConfig,
                            ) && this.showLines(e, n));
                          let i = this.unitLines.get(e),
                            r = e.position.worldPosition;
                          if (i) {
                            var s = !r.equals(i.srcLineHead.position),
                              a = e.unitOrderTrait.targetLinesConfig?.target;
                            let t = a ? a.position.worldPosition : void 0;
                            a = t && !t.equals(i.destLineHead.position);
                            if (s || a) {
                              let e = i.line.geometry;
                              (e.verticesNeedUpdate = !0),
                                s &&
                                  (e.vertices[e.vertices.length - 1].copy(r),
                                  i.srcLineHead.position.copy(r),
                                  i.srcLineHead.updateMatrix()),
                                t &&
                                  a &&
                                  (e.vertices[0].copy(t),
                                  i.destLineHead.position.copy(t),
                                  i.destLineHead.updateMatrix());
                            }
                          }
                        }
                      }),
                      t)
                    )
                      return;
                  }
                  void 0 !== this.showStart &&
                    1e3 <= n - this.showStart &&
                    this.hideAllLines();
                }
              }
              showLines(e, t) {
                (this.showStart = t), (this.unitLines.get(e).root.visible = !0);
              }
              hideAllLines() {
                (this.showStart = void 0),
                  this.unitLines.forEach((e) => (e.root.visible = !1));
              }
              updateLines(e) {
                let t = e.unitOrderTrait.targetLinesConfig;
                if (!t || !u.configHasTarget(t)) {
                  if (e.zone !== d.ZoneType.Air)
                    return void (
                      this.unitLines.has(e) &&
                      ((s = this.unitLines.get(e)),
                      this.obj?.remove(s.root),
                      this.disposeLineObjects(s),
                      this.unitLines.delete(e))
                    );
                  t = {
                    pathNodes: [
                      { tile: e.tile, onBridge: void 0 },
                      { tile: e.tile, onBridge: void 0 },
                    ],
                  };
                }
                let i = new THREE.Geometry(),
                  r = t.pathNodes;
                r.length
                  ? (this.debugPaths.value || (r = [r[0], r[r.length - 1]]),
                    r.forEach((e) => {
                      var t = h.Coords.tile3dToWorld(
                        e.tile.rx + 0.5,
                        e.tile.ry + 0.5,
                        e.tile.z + (e.onBridge?.tileElevation ?? 0),
                      );
                      i.vertices.push(t);
                    }),
                    i.vertices[i.vertices.length - 1].copy(
                      e.position.worldPosition,
                    ))
                  : ((a = t.target),
                    i.vertices.push(
                      a.position.worldPosition,
                      e.position.worldPosition,
                    ));
                var s = !!t.isAttack,
                  a = s ? this.attackLineMaterial : this.moveLineMaterial;
                let n = new THREE.Line(i, a);
                n.matrixAutoUpdate = !1;
                let o = this.createLineHead(s);
                o.position.copy(i.vertices[i.vertices.length - 1]),
                  (o.matrixAutoUpdate = !1),
                  o.updateMatrix();
                let l = this.createLineHead(s);
                l.position.copy(i.vertices[0]),
                  (l.matrixAutoUpdate = !1),
                  l.updateMatrix(),
                  (n.renderOrder = o.renderOrder = l.renderOrder = 1e6);
                let c = new THREE.Object3D();
                (c.matrixAutoUpdate = !1),
                  (c.visible = !1),
                  c.add(n),
                  c.add(o),
                  c.add(l),
                  this.unitLines.has(e) &&
                    ((s = this.unitLines.get(e)),
                    this.obj?.remove(s.root),
                    this.disposeLineObjects(s)),
                  this.unitLines.set(e, {
                    root: c,
                    line: n,
                    srcLineHead: o,
                    destLineHead: l,
                  }),
                  this.obj?.add(c);
              }
              createLineHead(e) {
                let t = new THREE.Mesh(
                  this.lineHeadGeometry,
                  e ? this.attackLineHeadMaterial : this.moveLineHeadMaterial,
                );
                var i = new THREE.Quaternion().setFromEuler(
                  this.camera.rotation,
                );
                return t.setRotationFromQuaternion(i), t;
              }
              disposeUnitLines() {
                [...this.unitLines.values()].forEach((e) =>
                  this.disposeLineObjects(e),
                ),
                  this.unitLines.clear();
              }
              disposeLineObjects(e) {
                e.line.geometry.dispose();
              }
              dispose() {
                this.disposeUnitLines(),
                  this.attackLineMaterial?.dispose(),
                  this.attackLineHeadMaterial?.dispose(),
                  this.moveLineMaterial?.dispose(),
                  this.moveLineHeadMaterial?.dispose(),
                  this.lineHeadGeometry.dispose();
              }
            }),
          );
        },
      };
    },
  ),
  