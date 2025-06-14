System.register(
    "engine/util/MapTileIntersectHelper",
    ["util/geometry", "game/Coords", "engine/IsoCoords"],
    function (e, t) {
      "use strict";
      var i, f, y, r;
      t && t.id;
      return {
        setters: [
          function (e) {
            i = e;
          },
          function (e) {
            f = e;
          },
          function (e) {
            y = e;
          },
        ],
        execute: function () {
          e(
            "MapTileIntersectHelper",
            (r = class {
              constructor(e, t) {
                (this.map = e), (this.scene = t);
              }
              getTileAtScreenPoint(e) {
                var t = this.scene.viewport;
                if (i.rectContainsPoint(t, e)) {
                  t = this.intersectTilesByScreenPos(e);
                  return t.length ? t[0] : void 0;
                }
              }
              intersectTilesByScreenPos(e) {
                var t = y.IsoCoords.worldToScreen(0, 0),
                  i = this.scene.cameraPan.getPan(),
                  t = {
                    x: e.x + t.x + i.x - this.scene.viewport.width / 2,
                    y: e.y + t.y + i.y - this.scene.viewport.height / 2,
                  },
                  i = y.IsoCoords.screenToWorld(t.x, t.y),
                  i = new THREE.Vector2(i.x, i.y)
                    .multiplyScalar(1 / f.Coords.LEPTONS_PER_TILE)
                    .floor(),
                  r = this.map.tiles.getByMapCoords(i.x, i.y);
                if (!r)
                  return (
                    console.warn(
                      `Tile coordinates (${i.x},${i.y}) out of range`,
                    ),
                    []
                  );
                let s = [];
                var a;
                for (let m = 0; m < 30; m++)
                  for (a of [
                    { x: r.rx + m, y: r.ry + m },
                    { x: r.rx + m + 1, y: r.ry + m },
                    { x: r.rx + m, y: r.ry + m + 1 },
                  ]) {
                    var n = { x: a.x, y: a.y },
                      n = this.map.tiles.getByMapCoords(n.x, n.y);
                    n && s.push(n);
                  }
                let o = [],
                  l = new THREE.Triangle();
                var c,
                  h = new THREE.Vector3(t.x, 0, t.y);
                for (c of s) {
                  var u = y.IsoCoords.tile3dToScreen(c.rx, c.ry, c.z),
                    d = y.IsoCoords.tile3dToScreen(c.rx, c.ry + 1.1, c.z),
                    g = y.IsoCoords.tile3dToScreen(c.rx + 1.1, c.ry, c.z),
                    p = y.IsoCoords.tile3dToScreen(c.rx + 1.1, c.ry + 1.1, c.z);
                  (l.b.x = d.x),
                    (l.b.z = d.y),
                    (l.c.x = g.x),
                    (l.c.z = g.y),
                    (l.a.x = u.x),
                    (l.a.z = u.y);
                  u = l.containsPoint(h);
                  (l.a.x = p.x), (l.a.z = p.y);
                  p = l.containsPoint(h);
                  (u || p) && o.unshift(c);
                }
                for (; !o.length; )
                  o = this.intersectTilesByScreenPos({
                    x: e.x,
                    y: e.y - y.IsoCoords.tileHeightToScreen(1),
                  });
                return o;
              }
            }),
          );
        },
      };
    },
  ),
  