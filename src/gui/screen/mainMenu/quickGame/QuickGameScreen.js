System.register(
    "gui/screen/mainMenu/quickGame/QuickGameScreen",
    [
      "@puzzl/core/lib/async/Task",
      "@puzzl/core/lib/async/cancellation",
      "gui/jsx/jsx",
      "gui/jsx/HtmlView",
      "engine/sound/Music",
      "gui/screen/mainMenu/MainMenuScreen",
      "gui/screen/mainMenu/ScreenType",
      "util/disposable/CompositeDisposable",
      "game/gameopts/constants",
      "engine/sound/SoundKey",
      "engine/sound/ChannelType",
      "gui/screen/mainMenu/MainMenuRoute",
      "gui/screen/mainMenu/quickGame/component/QuickGameForm",
      "LocalPrefs",
      "network/ladder/WLadderService",
      "network/ladder/wladderConfig",
      "network/WolError",
      "network/qmCodes",
      "gui/screen/mainMenu/quickGame/ChatUi",
    ],
    function (t, e) {
      "use strict";
      var i, a, r, s, f, n, y, T, o, v, b, S, l, c, h, w, u, C, d, E, g;
      e && e.id;
      return {
        setters: [
          function (e) {
            i = e;
          },
          function (e) {
            a = e;
          },
          function (e) {
            r = e;
          },
          function (e) {
            s = e;
          },
          function (e) {
            f = e;
          },
          function (e) {
            n = e;
          },
          function (e) {
            y = e;
          },
          function (e) {
            T = e;
          },
          function (e) {
            o = e;
          },
          function (e) {
            v = e;
          },
          function (e) {
            b = e;
          },
          function (e) {
            S = e;
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
            w = e;
          },
          function (e) {
            u = e;
          },
          function (e) {
            C = e;
          },
          function (e) {
            d = e;
          },
        ],
        execute: function () {
          var e;
          ((e = E = E || {})[(e.None = 0)] = "None"),
            (e[(e.Initializing = 1)] = "Initializing"),
            (e[(e.WaitingForMatch = 2)] = "WaitingForMatch"),
            (e[(e.WaitingForStartTimer = 3)] = "WaitingForStartTimer"),
            (e[(e.WaitingForGameStart = 4)] = "WaitingForGameStart"),
            (g = class extends n.MainMenuScreen {
              constructor(e, t, i, r, s, a, n, o, l, c, h, u, d, g, p, m) {
                super(),
                  (this.unrankedEnabled = e),
                  (this.engineVersion = t),
                  (this.engineModHash = i),
                  (this.clientLocale = r),
                  (this.rules = s),
                  (this.wolService = a),
                  (this.wolCon = n),
                  (this.wladderService = o),
                  (this.serverRegions = l),
                  (this.rootController = c),
                  (this.messageBoxApi = h),
                  (this.jsxRenderer = u),
                  (this.strings = d),
                  (this.localPrefs = g),
                  (this.sound = p),
                  (this.errorHandler = m),
                  (this.title = this.strings.get("GUI:WolMatch")),
                  (this.musicType = f.MusicType.NormalShuffle),
                  (this.partySize = 1),
                  (this.availableQueueTypes = Object.values(w.LadderQueueType)),
                  (this.disposables = new T.CompositeDisposable()),
                  (this.handleChatMessage = (i) => {
                    if (
                      i.text.startsWith(C.RPL_QUEUE_LIST + " ") &&
                      this.queueState === E.None
                    ) {
                      let e = i.text.split(" ").slice(1).join(" "),
                        t = e
                          .split(",")
                          .filter((e) =>
                            Object.values(w.LadderQueueType).includes(e),
                          );
                      (this.availableQueueTypes = t),
                        !t.includes(this.queueOpts.type) &&
                          t.length &&
                          ((this.queueOpts.type = t[0]),
                          this.form && this.requestPlayerProfileRefresh()),
                        this.form?.applyOptions((e) => {
                          (e.enabledTypes = t), (e.type = this.queueOpts.type);
                        });
                    }
                    if (
                      this.queueState !== E.None &&
                      i.from === this.wolConfig.getQuickMatchBotName()
                    )
                      if (
                        [
                          C.RPL_WORKING,
                          C.RPL_BAD_VERS,
                          C.RPL_BAD_HASH,
                          C.RPL_MODE_UNAVAIL,
                        ].includes(i.text)
                      )
                        if (this.queueState === E.Initializing)
                          if (i.text === C.RPL_WORKING)
                            this.updateQueueState(E.WaitingForMatch);
                          else {
                            let e,
                              t = !0;
                            i.text === C.RPL_BAD_VERS
                              ? (e = this.strings.get("TS:OutdatedClient"))
                              : i.text === C.RPL_BAD_HASH
                                ? (e = this.strings.get("TXT_MISMATCH"))
                                : i.text === C.RPL_MODE_UNAVAIL
                                  ? ((e = this.strings.get(
                                      "WOL:MatchModeUnavail",
                                    )),
                                    (t = !1))
                                  : (e = this.strings.get(
                                      "WOL:MatchBadParameters",
                                    )),
                              t || this.leaveQueue(),
                              this.handleError(i.text, e, { fatal: t });
                          }
                        else
                          console.warn(
                            `Unexpected reply "${i.text}" from match bot (qs: ${E[this.queueState]})`,
                          );
                      else if (i.text.startsWith(C.RPL_MATCHED + " "))
                        this.queueState === E.WaitingForMatch
                          ? (this.sound.play(
                              v.SoundKey.PlayerJoined,
                              b.ChannelType.Ui,
                            ),
                            (t = i.text.split(" ")[1]),
                            (this.countdownSeconds = Number(t)),
                            this.updateQueueState(E.WaitingForStartTimer))
                          : console.warn(
                              `Unexpected reply "${i.text}" from match bot (qs: ${E[this.queueState]})`,
                            );
                      else if (i.text === C.RPL_REQUEUE)
                        [
                          E.WaitingForGameStart,
                          E.WaitingForStartTimer,
                        ].includes(this.queueState) &&
                          (console.log("A player left. Returned to queue."),
                          this.updateQueueState(E.WaitingForMatch));
                      else if (
                        i.text.startsWith(C.RPL_STATS + " ") &&
                        this.queueState === E.WaitingForMatch
                      ) {
                        let e = i.text.split(" ").slice(1).join(" ");
                        var [, t] = e.split(","),
                          t = "-1" !== t ? Number(t) : void 0;
                        this.updateSidebarText(
                          this.strings.get(
                            "TXT_SEARCHING_FOR",
                            this.queueOpts.type,
                          ) +
                            "\n\n" +
                            this.strings.get("WOL:MatchAvgWaitTime") +
                            "\n" +
                            (void 0 !== t && t < 3600
                              ? this.strings.get(
                                  "WOL:MatchAvgWaitTimeMinutes",
                                  t < 60 ? "<1" : "~" + Math.ceil(t / 60),
                                )
                              : this.strings.get(
                                  "WOL:MatchAvgWaitTimeUnavail",
                                )),
                        );
                      }
                  }),
                  (this.handleLeaveChannel = async (e) => {
                    e.user.name === this.wolCon.getCurrentUser() &&
                      e.channel === this.quickMatchChannelName &&
                      ((this.quickMatchChannelName = void 0),
                      this.queueState !== E.None &&
                        (this.updateQueueState(E.None), this.wolCon.close()));
                  }),
                  (this.handleGameStart = async (e) => {
                    if (
                      this.queueState === E.WaitingForGameStart ||
                      this.queueState === E.WaitingForStartTimer
                    )
                      try {
                        var t = this.wolCon.getCurrentUser();
                        if (void 0 === t)
                          throw new Error("User should be logged in");
                        this.updateQueueState(E.None);
                        var i = new S.MainMenuRoute(y.ScreenType.Login, {
                          afterLogin: (e) =>
                            new S.MainMenuRoute(y.ScreenType.QuickGame, {
                              messages: e,
                            }),
                        });
                        this.form || (await this.controller?.popScreen()),
                          this.rootController.joinGame(
                            e.gameId,
                            e.timestamp,
                            e.gservUrl,
                            t,
                            !0,
                            !1,
                            i,
                          );
                      } catch (e) {
                        if ((await this.leaveQueue(), !this.wolCon.isOpen()))
                          return;
                        this.handleError(
                          e,
                          this.strings.get("WOL:MatchTimeout"),
                          { fatal: !1 },
                        );
                      }
                  }),
                  (this.onWolClose = () => {
                    this.updateQueueState(E.None);
                  }),
                  (this.onWolConLost = (e) => {
                    this.handleError(e, this.strings.get("TXT_YOURE_DISCON"), {
                      fatal: !0,
                    });
                  });
              }
              async onEnter(i) {
                this.updateQueueState(E.None);
                var e = this.localPrefs.getItem(c.StorageKey.LastPlayerCountry),
                  r = this.localPrefs.getItem(c.StorageKey.LastPlayerColor),
                  t = this.localPrefs.getItem(c.StorageKey.LastQueueRanked),
                  s = this.localPrefs.getItem(c.StorageKey.LastQueueType),
                  e =
                    void 0 !== e &&
                    Number(e) < this.getAvailablePlayerCountries().length
                      ? Number(e)
                      : o.RANDOM_COUNTRY_ID,
                  r =
                    void 0 !== r &&
                    Number(r) < this.getAvailablePlayerColors().length
                      ? Number(r)
                      : o.RANDOM_COLOR_ID,
                  t =
                    void 0 === t || !this.unrankedEnabled || Boolean(Number(t)),
                  s =
                    void 0 !== s && Object.values(w.LadderQueueType).includes(s)
                      ? s
                      : w.LadderQueueType.Solo1v1;
                if (
                  ((this.queueOpts = {
                    type: s,
                    ranked: t,
                    countryId: e,
                    colorId: r,
                  }),
                  (this.playerProfile = void 0),
                  this.controller.toggleMainVideo(!1),
                  this.wolService.isConnected() && this.wolCon.getCurrentUser())
                ) {
                  (this.wolConfig = this.wolService.getConfig()),
                    this.wolCon.onClose.subscribe(this.onWolClose),
                    this.disposables.add(() =>
                      this.wolCon.onClose.unsubscribe(this.onWolClose),
                    ),
                    this.wolService.onWolConnectionLost.subscribe(
                      this.onWolConLost,
                    ),
                    this.disposables.add(() =>
                      this.wolService.onWolConnectionLost.unsubscribe(
                        this.onWolConLost,
                      ),
                    ),
                    this.wolCon.onChatMessage.subscribe(this.handleChatMessage),
                    this.disposables.add(() =>
                      this.wolCon.onChatMessage.unsubscribe(
                        this.handleChatMessage,
                      ),
                    ),
                    this.wolCon.onLeaveChannel.subscribe(
                      this.handleLeaveChannel,
                    ),
                    this.disposables.add(() =>
                      this.wolCon.onLeaveChannel.unsubscribe(
                        this.handleLeaveChannel,
                      ),
                    ),
                    this.wolCon.onGameStart.subscribe(this.handleGameStart),
                    this.disposables.add(() =>
                      this.wolCon.onGameStart.unsubscribe(this.handleGameStart),
                    );
                  let e = i.messages;
                  (this.chatUi = new d.ChatUi(
                    e,
                    (i) => {
                      this.form?.applyOptions((e) => {
                        var t = e["chatProps"];
                        e.chatProps = { ...t, ...i };
                      });
                    },
                    this.wolConfig,
                    this.wolCon,
                    this.wolService,
                    this.wladderService,
                    this.strings,
                    this.sound,
                  )),
                    this.disposables.add(
                      this.chatUi,
                      () => (this.chatUi = void 0),
                    ),
                    this.refreshSidebarButtons(),
                    this.initView(),
                    this.requestPlayerProfileRefresh(),
                    this.wolCon.privmsg(
                      [this.wolConfig.getQuickMatchBotName()],
                      C.REQ_LIST_QUEUES,
                    ),
                    (this.updateStatsIntervalId = setInterval(() => {
                      this.wolCon.privmsg(
                        [this.wolConfig.getQuickMatchBotName()],
                        C.REQ_LIST_QUEUES,
                      );
                    }, 3e4));
                  let t = new a.CancellationTokenSource();
                  this.disposables.add(() => t.cancel());
                  r = t.token;
                  try {
                    await this.chatUi.loadChannel(r);
                  } catch (t) {
                    let i = this.strings.get("WOL:MatchBadParameters");
                    if (t instanceof u.WolError) {
                      let e = new Map()
                        .set(
                          u.WolError.Code.NoSuchChannel,
                          "WOL:ChannelJoinFailure",
                        )
                        .set(u.WolError.Code.BadChannelPass, "TXT_BADPASS")
                        .set(u.WolError.Code.ChannelFull, "TXT_CHANNEL_FULL")
                        .set(u.WolError.Code.BannedFromChannel, "TXT_JOINBAN");
                      r = e.get(t.code);
                      r && (i = this.strings.get(r));
                    }
                    return void e.push({ text: i });
                  }
                } else
                  this.controller.goToScreen(y.ScreenType.Login, {
                    afterLogin: (e) =>
                      new S.MainMenuRoute(y.ScreenType.QuickGame, {
                        messages: e,
                      }),
                  });
              }
              requestPlayerProfileRefresh() {
                this.refreshProfileTask?.cancel(),
                  (this.refreshProfileTask = new i.Task((e) =>
                    this.refreshPlayerProfile(this.queueOpts.type, e),
                  )),
                  this.refreshProfileTask.start().catch((e) => {
                    e instanceof a.OperationCanceledError || console.error(e);
                  });
              }
              refreshSidebarButtons() {
                this.controller.setSidebarButtons(
                  [
                    {
                      label: this.strings.get("GUI:QuickMatchPlay"),
                      tooltip: this.strings.get("GUI:FindAGame"),
                      disabled: this.queueState !== E.None,
                      onClick: () => {
                        this.availableQueueTypes.includes(this.queueOpts.type)
                          ? setTimeout(() => this.joinQueue(), 0)
                          : this.messageBoxApi.show(
                              this.strings.get("WOL:MatchModeUnavail"),
                              this.strings.get("GUI:OK"),
                            );
                      },
                    },
                    ...(this.wladderService.getUrl()
                      ? [
                          {
                            label: this.strings.get("GUI:ViewLadder"),
                            tooltip: this.strings.get("GUI:ViewTourLadder"),
                            onClick: () => {
                              this.controller?.pushScreen(y.ScreenType.Ladder, {
                                ladderType: w.getLadderTypeForQueueType(
                                  this.queueOpts.type,
                                  this.partySize,
                                ),
                                highlightPlayer: this.playerProfile,
                              });
                            },
                          },
                        ]
                      : []),
                    ...(this.controller?.hasScreen(y.ScreenType.LadderRules)
                      ? [
                          {
                            label: this.strings.get("GUI:ViewRules"),
                            onClick: () => {
                              this.controller?.pushScreen(
                                y.ScreenType.LadderRules,
                              );
                            },
                          },
                        ]
                      : []),
                    ...(1 < this.serverRegions.getSize()
                      ? [
                          {
                            label: this.strings.get("GUI:ChangeServer"),
                            tooltip: this.strings.get("STT:ChangeServer"),
                            onClick: () => {
                              this.wolService.closeWolConnection(),
                                this.controller?.goToScreen(
                                  y.ScreenType.Login,
                                  {
                                    clearCredentials: !0,
                                    afterLogin: (e) =>
                                      new S.MainMenuRoute(
                                        y.ScreenType.QuickGame,
                                        { messages: e },
                                      ),
                                  },
                                );
                            },
                          },
                        ]
                      : []),
                    {
                      label:
                        this.queueState === E.None
                          ? this.strings.get("GUI:Back")
                          : this.strings.get("GUI:Cancel"),
                      isBottom: !0,
                      onClick: () => {
                        this.queueState === E.None
                          ? (this.wolService.closeWolConnection(),
                            this.controller?.goToScreen(y.ScreenType.Home))
                          : this.leaveQueue();
                      },
                    },
                  ],
                  !0,
                ),
                  this.controller.showSidebarButtons();
              }
              updateSidebarText(e) {
                this.controller.setSidebarMpContent({ text: e });
              }
              initView() {
                var [e] = this.jsxRenderer.render(
                  r.jsx(s.HtmlView, {
                    width: "100%",
                    height: "100%",
                    component: l.QuickGameForm,
                    innerRef: (e) => (this.form = e),
                    props: {
                      strings: this.strings,
                      disabled: this.queueState !== E.None,
                      countryUiNames: new Map(
                        [
                          [o.RANDOM_COUNTRY_NAME, o.RANDOM_COUNTRY_UI_NAME],
                        ].concat(
                          this.getAvailablePlayerCountryRules().map((e) => [
                            e.name,
                            e.uiName,
                          ]),
                        ),
                      ),
                      countryUiTooltips: new Map(
                        [
                          [o.RANDOM_COUNTRY_NAME, o.RANDOM_COUNTRY_UI_TOOLTIP],
                        ].concat(
                          this.getAvailablePlayerCountryRules()
                            .filter((e) => e.uiTooltip)
                            .map((e) => [e.name, e.uiTooltip]),
                        ),
                      ),
                      availableTypes: Object.values(w.LadderQueueType),
                      enabledTypes: this.availableQueueTypes,
                      availableColors: [o.RANDOM_COLOR_NAME].concat(
                        this.getAvailablePlayerColors(),
                      ),
                      availableCountries: [o.RANDOM_COUNTRY_NAME].concat(
                        this.getAvailablePlayerCountries(),
                      ),
                      color: this.getColorNameById(this.queueOpts.colorId),
                      country: this.getCountryNameById(
                        this.queueOpts.countryId,
                      ),
                      type: this.queueOpts.type,
                      ranked: this.queueOpts.ranked,
                      unrankedEnabled: this.unrankedEnabled,
                      playerName: this.wolCon.getCurrentUser() ?? "",
                      playerProfile: this.playerProfile,
                      chatProps: this.chatUi.getViewProps(),
                      onCountrySelect: (t) => {
                        var e = this.getCountryIdByName(t);
                        (this.queueOpts.countryId = e),
                          this.form?.applyOptions((e) => {
                            e.country = t;
                          }),
                          e !== o.RANDOM_COUNTRY_ID
                            ? this.localPrefs.setItem(
                                c.StorageKey.LastPlayerCountry,
                                String(e),
                              )
                            : this.localPrefs.removeItem(
                                c.StorageKey.LastPlayerCountry,
                              );
                      },
                      onColorSelect: (t) => {
                        var e = this.getColorIdByName(t);
                        (this.queueOpts.colorId = e),
                          this.form?.applyOptions((e) => {
                            e.color = t;
                          }),
                          e !== o.RANDOM_COLOR_ID
                            ? this.localPrefs.setItem(
                                c.StorageKey.LastPlayerColor,
                                String(e),
                              )
                            : this.localPrefs.removeItem(
                                c.StorageKey.LastPlayerColor,
                              );
                      },
                      onRankedChange: (t) => {
                        (this.queueOpts.ranked = t),
                          this.form?.applyOptions((e) => (e.ranked = t)),
                          this.localPrefs.setItem(
                            c.StorageKey.LastQueueRanked,
                            String(Number(t)),
                          );
                      },
                      onTypeChange: (t) => {
                        this.queueOpts.type !== t &&
                          ((this.queueOpts.type = t),
                          (this.playerProfile = void 0),
                          this.form?.applyOptions((e) => {
                            (e.type = t), (e.playerProfile = void 0);
                          }),
                          this.localPrefs.setItem(
                            c.StorageKey.LastQueueType,
                            t,
                          ),
                          this.form && this.requestPlayerProfileRefresh());
                      },
                    },
                  }),
                );
                this.controller.setMainComponent(e);
              }
              async refreshPlayerProfile(e, t) {
                var i, r;
                !this.wladderService.getUrl() ||
                  ((i = this.wolCon.getCurrentUser()) &&
                    ((r = w.getLadderTypeForQueueType(e, this.partySize)),
                    ([r] = await this.wladderService.listSearch(
                      [i],
                      t,
                      r,
                      h.WLadderService.CURRENT_SEASON,
                      this.clientLocale,
                    )),
                    r &&
                      !t.isCancelled() &&
                      ((this.playerProfile = r),
                      this.form?.applyOptions(
                        (e) => (e.playerProfile = this.playerProfile),
                      ))));
              }
              getAvailablePlayerCountryRules() {
                return this.rules.getMultiplayerCountries();
              }
              getAvailablePlayerCountries() {
                return this.getAvailablePlayerCountryRules().map((e) => e.name);
              }
              getCountryNameById(e) {
                let t;
                return (
                  (t =
                    e === o.RANDOM_COUNTRY_ID
                      ? o.RANDOM_COUNTRY_NAME
                      : this.getAvailablePlayerCountries()[e]),
                  t
                );
              }
              getCountryIdByName(t) {
                let i;
                if (t === o.RANDOM_COUNTRY_NAME) i = o.RANDOM_COUNTRY_ID;
                else {
                  let e = this.getAvailablePlayerCountries();
                  i = e.indexOf(t);
                }
                return i;
              }
              getAvailablePlayerColors() {
                return [...this.rules.getMultiplayerColors().values()].map(
                  (e) => e.asHexString(),
                );
              }
              getColorNameById(e) {
                let t;
                return (
                  (t =
                    e === o.RANDOM_COLOR_ID
                      ? o.RANDOM_COLOR_NAME
                      : this.getAvailablePlayerColors()[e]),
                  t
                );
              }
              getColorIdByName(t) {
                let i;
                if (t === o.RANDOM_COLOR_NAME) i = o.RANDOM_COLOR_ID;
                else {
                  let e = this.getAvailablePlayerColors();
                  if (((i = e.indexOf(t)), -1 === i))
                    throw new Error(
                      `Color ${t} not found in available player colors`,
                    );
                }
                return i;
              }
              async joinQueue() {
                if (this.queueState === E.None) {
                  (this.quickMatchChannelName = void 0),
                    this.updateSidebarText(
                      this.strings.get("WOL:RequestingMatch") + "...",
                    ),
                    this.updateQueueState(E.Initializing);
                  try {
                    var i = `#Lob ${this.wolConfig.getQuickMatchChannelId(this.queueOpts.type)} 0`;
                    if (
                      (await this.wolCon.joinChannel(
                        i,
                        this.wolConfig.getGlobalChannelPass(),
                      ),
                      this.queueState !== E.Initializing)
                    )
                      return;
                    this.quickMatchChannelName = i;
                    let { countryId: e, colorId: t } = this.queueOpts;
                    var r =
                      C.REQ_MATCH +
                      " " +
                      [
                        [C.TAG_COUNTRY, e],
                        [C.TAG_COLOR, t],
                        [C.TAG_VERSION, this.engineVersion],
                        [C.TAG_MODHASH, this.engineModHash],
                        [C.TAG_RANKED, Number(this.queueOpts.ranked)],
                      ]
                        .map((e) => e.join("="))
                        .join(", ");
                    this.wolCon.privmsg(
                      [this.wolConfig.getQuickMatchBotName()],
                      r,
                    );
                  } catch (e) {
                    return void (e instanceof u.WolError &&
                    e.code === u.WolError.Code.BadChannelPass
                      ? this.handleError(
                          e,
                          this.strings.get("WOL:MatchModeUnavail"),
                          { fatal: !1 },
                        )
                      : this.handleError(
                          e,
                          this.strings.get("WOL:MatchBadParameters"),
                          { fatal: !0 },
                        ));
                  }
                }
              }
              async leaveQueue() {
                this.queueState !== E.None &&
                  (this.updateQueueState(E.None),
                  this.messageBoxApi.destroy(),
                  this.wolCon.isOpen() &&
                    this.quickMatchChannelName &&
                    (this.wolCon.leaveChannel(this.quickMatchChannelName),
                    (this.quickMatchChannelName = void 0)));
              }
              updateQueueState(t) {
                if (
                  ((this.queueState = t),
                  this.gameStartTimeoutId &&
                    (clearTimeout(this.gameStartTimeoutId),
                    (this.gameStartTimeoutId = void 0)),
                  this.countdownIntervalId &&
                    (clearInterval(this.countdownIntervalId),
                    (this.countdownIntervalId = void 0)),
                  this.updateStatsIntervalId &&
                    (clearInterval(this.updateStatsIntervalId),
                    (this.updateStatsIntervalId = void 0)),
                  this.form &&
                    (this.form.applyOptions((e) => (e.disabled = t !== E.None)),
                    this.refreshSidebarButtons()),
                  t !== E.None)
                ) {
                  t === E.WaitingForGameStart &&
                    (this.gameStartTimeoutId = setTimeout(async () => {
                      console.log("Timed out. Rejoining queue..."),
                        await this.leaveQueue(),
                        this.wolCon.isOpen() && this.joinQueue();
                    }, 1e4)),
                    t === E.WaitingForStartTimer &&
                      (this.countdownIntervalId = setInterval(
                        () => this.tickStartTimer(),
                        1e3,
                      )),
                    t === E.WaitingForMatch &&
                      (this.updateStatsIntervalId = setInterval(
                        () => this.requestStats(),
                        5e3,
                      ));
                  let e;
                  switch (t) {
                    case E.WaitingForMatch:
                      e = this.strings.get(
                        "TXT_SEARCHING_FOR",
                        this.queueOpts.type,
                      );
                      break;
                    case E.WaitingForStartTimer:
                      e = this.strings.get(
                        "WOL:MatchStartSeconds",
                        this.countdownSeconds,
                      );
                      break;
                    case E.WaitingForGameStart:
                      e = this.strings.get("WOL:MatchGameStarting");
                  }
                  void 0 !== e && (this.updateSidebarText(e), console.log(e));
                } else this.updateSidebarText("");
              }
              async tickStartTimer() {
                if (void 0 === this.countdownSeconds)
                  throw new Error("Game start countdown should be set by now");
                0 < this.countdownSeconds
                  ? (this.countdownSeconds--,
                    this.updateSidebarText(
                      this.strings.get(
                        "WOL:MatchStartSeconds",
                        this.countdownSeconds,
                      ),
                    ),
                    this.sound.play(
                      v.SoundKey.QuickMatchTimer,
                      b.ChannelType.Ui,
                    ))
                  : this.updateQueueState(E.WaitingForGameStart);
              }
              requestStats() {
                this.queueState === E.WaitingForMatch &&
                  this.wolCon.privmsg(
                    [this.wolConfig.getQuickMatchBotName()],
                    C.REQ_STATS,
                  );
              }
              async onUnstack() {
                this.refreshSidebarButtons(),
                  this.initView(),
                  this.wolService.isConnected() && this.wolCon.getCurrentUser()
                    ? this.wolCon.privmsg(
                        [this.wolConfig.getQuickMatchBotName()],
                        C.REQ_LIST_QUEUES,
                      )
                    : this.controller.goToScreen(y.ScreenType.Login, {
                        afterLogin: (e) =>
                          new S.MainMenuRoute(y.ScreenType.QuickGame, {
                            messages: e,
                          }),
                      }),
                  this.requestPlayerProfileRefresh();
              }
              async onStack() {
                await this.unrender();
              }
              async onLeave() {
                this.updateQueueState(E.None),
                  this.refreshProfileTask &&
                    (this.refreshProfileTask.cancel(),
                    (this.refreshProfileTask = void 0)),
                  this.disposables.dispose(),
                  this.wolCon.isOpen() &&
                    this.quickMatchChannelName &&
                    this.wolCon.leaveChannel(this.quickMatchChannelName),
                  await this.unrender();
              }
              async unrender() {
                this.availQueueRefreshIntervalId &&
                  (clearInterval(this.availQueueRefreshIntervalId),
                  (this.availQueueRefreshIntervalId = void 0)),
                  (this.form = void 0),
                  await this.controller.hideSidebarButtons();
              }
              handleError(e, t, { fatal: i }) {
                this.updateQueueState(E.None),
                  this.errorHandler.handle(e, t, () => {
                    i &&
                      (this.wolService.closeWolConnection(),
                      this.controller?.goToScreen(y.ScreenType.Home));
                  });
              }
            }),
            t("QuickGameScreen", g);
        },
      };
    },
  ),
  