System.register(
    "gui/screen/mainMenu/score/ScoreScreen",
    [
      "gui/jsx/jsx",
      "gui/jsx/HtmlView",
      "gui/screen/mainMenu/score/ScoreTable",
      "game/SideType",
      "engine/sound/Music",
      "gui/screen/mainMenu/MainMenuScreen",
      "LocalPrefs",
      "@puzzl/core/lib/async/Task",
      "@puzzl/core/lib/async/cancellation/OperationCanceledError",
      "@puzzl/core/lib/async/sleep",
    ],
    function (e, t) {
      "use strict";
      var o, l, c, h, n, i, r, s, a, u, d, g;
      t && t.id;
      return {
        setters: [
          function (e) {
            o = e;
          },
          function (e) {
            l = e;
          },
          function (e) {
            c = e;
          },
          function (e) {
            h = e;
          },
          function (e) {
            n = e;
          },
          function (e) {
            i = e;
          },
          function (e) {
            r = e;
          },
          function (e) {
            s = e;
          },
          function (e) {
            a = e;
          },
          function (e) {
            u = e;
          },
        ],
        execute: function () {
          (d = new Map([
            [h.SideType.GDI, { img: "mpascrnl.shp", pal: "mpascrn.pal" }],
            [h.SideType.Nod, { img: "mpsscrnl.shp", pal: "mpsscrn.pal" }],
          ])),
            (g = class extends i.MainMenuScreen {
              constructor(e, t, i, r, s, a) {
                super(),
                  (this.strings = e),
                  (this.jsxRenderer = t),
                  (this.messageBoxApi = i),
                  (this.localPrefs = r),
                  (this.config = s),
                  (this.wolService = a),
                  (this.musicType = n.MusicType.Score);
              }
              async onEnter(e) {
                (this.title = e.singlePlayer
                  ? this.strings.get("GUI:SkirmishScore")
                  : this.strings.get("GUI:MultiplayerScore")),
                  this.controller.toggleMainVideo(!1),
                  this.initView(e),
                  e.singlePlayer || this.loadGameReport(e.game);
              }
              initView({
                game: e,
                localPlayer: t,
                singlePlayer: i,
                tournament: r,
                returnTo: s,
              }) {
                this.controller.setSidebarButtons([
                  {
                    label: this.strings.get("GUI:Continue"),
                    tooltip: this.strings.get("STT:MPScoreButtonContinue"),
                    isBottom: !0,
                    onClick: () => {
                      this.controller?.goToScreen(s.screenType, s.params);
                    },
                  },
                ]),
                  this.controller.showSidebarButtons();
                var a = t.country?.side ?? h.SideType.GDI,
                  n = d.get(a);
                if (!n) throw new Error("Unsupported sideType " + a);
                var [n] = this.jsxRenderer.render(
                  o.jsx(
                    "container",
                    { width: "100%", height: "100%" },
                    o.jsx("sprite", { image: n.img, palette: n.pal }),
                    o.jsx(l.HtmlView, {
                      width: "100%",
                      height: "100%",
                      component: c.ScoreTable,
                      innerRef: (e) => (this.scoreTable = e),
                      props: {
                        game: e,
                        singlePlayer: i,
                        localPlayer: t,
                        tournament: r,
                        strings: this.strings,
                      },
                    }),
                  ),
                );
                this.controller.setMainComponent(n);
              }
              loadGameReport(i) {
                this.reportUpdateTask?.cancel();
                let e = (this.reportUpdateTask = new s.Task(async (e) => {
                  for (;;) {
                    if (e.isCancelled()) return;
                    let t = this.wolService.getLastGameReport();
                    if (t?.gameId === i.id)
                      return void this.scoreTable.applyOptions((e) => {
                        e.gameReport = t;
                      });
                    await u.sleep(1e3, e);
                  }
                }));
                e.start().catch((e) => {
                  e instanceof a.OperationCanceledError || console.error(e);
                });
              }
              async onLeave() {
                this.reportUpdateTask &&
                  (this.reportUpdateTask.cancel(),
                  (this.reportUpdateTask = void 0)),
                  await this.controller.hideSidebarButtons();
                var e,
                  t,
                  i = this.config.donateUrl;
                i &&
                  (2 <=
                  (t = Number(
                    this.localPrefs.getItem(r.StorageKey.DonateBoxState) ?? "0",
                  ))
                    ? ((e = await this.messageBoxApi.confirm(
                        this.strings.get("TS:DonatePrompt"),
                        this.strings.get("TS:DonateNow"),
                        this.strings.get("TS:DonateLater"),
                      )) && window.open(i, "_blank"),
                      this.localPrefs.setItem(
                        r.StorageKey.DonateBoxState,
                        "-" + Date.now(),
                      ),
                      window.gtag?.("event", "donate_dismiss", { donate: e }))
                    : 0 <= t
                      ? this.localPrefs.setItem(
                          r.StorageKey.DonateBoxState,
                          String(t + 1),
                        )
                      : ((t = -t),
                        2592e6 < Date.now() - t &&
                          this.localPrefs.setItem(
                            r.StorageKey.DonateBoxState,
                            "0",
                          )));
              }
            }),
            e("ScoreScreen", g);
        },
      };
    },
  ),
  