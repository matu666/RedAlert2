System.register(
    "gui/screen/mainMenu/quickGame/component/QuickGameForm",
    [
      "classnames",
      "gui/component/Image",
      "gui/component/ButtonSelect",
      "gui/component/ColorSelect",
      "gui/component/CountrySelect",
      "gui/component/Option",
      "react",
      "gui/screen/mainMenu/lobby/component/RankIndicator",
      "gui/screen/mainMenu/quickGame/component/QuickGameChat",
    ],
    function (e, t) {
      "use strict";
      var g, p, m, f, y, T, v, b, S;
      t && t.id;
      return {
        setters: [
          function (e) {
            g = e;
          },
          function (e) {
            p = e;
          },
          function (e) {
            m = e;
          },
          function (e) {
            f = e;
          },
          function (e) {
            y = e;
          },
          function (e) {
            T = e;
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
        ],
        execute: function () {
          e("QuickGameForm", (t) => {
            let {
              strings: e,
              disabled: i,
              playerName: r,
              playerProfile: s,
              unrankedEnabled: a,
              ranked: n,
              type: o,
              availableTypes: l,
              enabledTypes: c,
              chatProps: h,
              onRankedChange: u,
              onTypeChange: d,
            } = t;
            return v.createElement(
              "div",
              { className: "qm-form" },
              v.createElement(
                "div",
                { className: "qm-top" },
                v.createElement(
                  "div",
                  { className: "opts" },
                  v.createElement(
                    "div",
                    { className: "item qm-game-type-item" },
                    v.createElement(
                      "label",
                      null,
                      v.createElement(
                        "span",
                        { className: "label" },
                        e.get("GUI:QuickMatchGameMode"),
                      ),
                      v.createElement(
                        "div",
                        { className: "qm-game-type" },
                        v.createElement(
                          m.ButtonSelect,
                          {
                            initialValue: o,
                            onSelect: (e) => d(e),
                            disabled: i,
                          },
                          l.map((e) =>
                            v.createElement(T.Option, {
                              value: e,
                              label: e,
                              key: e,
                              disabled: !c.includes(e),
                            }),
                          ),
                        ),
                        v.createElement(
                          m.ButtonSelect,
                          {
                            initialValue: String(Number(n)),
                            onSelect: (e) => {
                              u(Boolean(Number(e)));
                            },
                            disabled: i,
                          },
                          v.createElement(T.Option, {
                            value: "1",
                            label: e.get("GUI:Ranked"),
                          }),
                          v.createElement(T.Option, {
                            value: "0",
                            disabled: !a,
                            label: e.get("GUI:Unranked"),
                          }),
                        ),
                      ),
                    ),
                  ),
                  v.createElement(
                    "div",
                    { className: "item" },
                    v.createElement(
                      "label",
                      null,
                      v.createElement(
                        "span",
                        { className: "label" },
                        e.get("GUI:PreferredCountry"),
                      ),
                      v.createElement(y.CountrySelect, {
                        countryUiNames: t.countryUiNames,
                        countryUiTooltips: t.countryUiTooltips,
                        country: t.country,
                        availableCountries: t.availableCountries,
                        disabled: i,
                        strings: t.strings,
                        onSelect: (e) => t.onCountrySelect(e),
                      }),
                    ),
                  ),
                  v.createElement(
                    "div",
                    { className: "item" },
                    v.createElement(
                      "label",
                      null,
                      v.createElement(
                        "span",
                        { className: "label" },
                        e.get("GUI:PreferredColor"),
                      ),
                      v.createElement(f.ColorSelect, {
                        color: t.color,
                        availableColors: t.availableColors,
                        disabled: i,
                        strings: t.strings,
                        onSelect: (e) => t.onColorSelect(e),
                      }),
                    ),
                  ),
                ),
                v.createElement(
                  "fieldset",
                  { className: "qm-profile" },
                  v.createElement("legend", null, s?.name ?? r),
                  void 0 === s?.rank
                    ? s
                      ? v.createElement(
                          "div",
                          { className: "item placement" },
                          e.get("GUI:LadderPlacement", s.placementMatchesLeft),
                        )
                      : v.createElement("div", null)
                    : v.createElement(
                        v.Fragment,
                        null,
                        v.createElement(
                          "div",
                          { className: "player-rank" },
                          v.createElement(
                            "div",
                            { className: "rank-name" },
                            v.createElement(b.RankIndicator, {
                              playerProfile: s,
                              strings: e,
                            }),
                            " ",
                            e.get(b.RANK_LABELS.get(s.rankType)),
                          ),
                          v.createElement(
                            "div",
                            { className: "rank-number" },
                            e.get("GUI:Rank"),
                            " ",
                            s.rank,
                          ),
                        ),
                        s.promotionProgress &&
                          v.createElement(
                            "div",
                            {
                              className: g.default("item", "promo-progress", {
                                demotion: s.promotionProgress.demotion,
                              }),
                            },
                            v.createElement(
                              "span",
                              { className: "label" },
                              e.get("GUI:LadderPromoProgress"),
                            ),
                            v.createElement(
                              "span",
                              { className: "value" },
                              v.createElement(
                                "div",
                                { className: "next-rank" },
                                e.get(
                                  b.RANK_LABELS.get(
                                    s.promotionProgress.rankType,
                                  ),
                                ),
                                s.promotionProgress.demotion
                                  ? v.createElement(
                                      "span",
                                      { className: "demotion-indicator" },
                                      "▼",
                                    )
                                  : v.createElement(
                                      "span",
                                      { className: "promotion-indicator" },
                                      "▲",
                                    ),
                              ),
                              v.createElement("progress", {
                                value: s.promotionProgress.progress,
                                max: 1,
                              }),
                            ),
                          ),
                        v.createElement("hr", null),
                        v.createElement(
                          "div",
                          { className: "item" },
                          v.createElement(
                            "span",
                            { className: "label" },
                            e.get("GUI:LadderWins"),
                          ),
                          v.createElement(
                            "span",
                            { className: "value" },
                            s.wins ?? e.get("GUI:UnknownStats"),
                          ),
                        ),
                        void 0 !== s.points &&
                          v.createElement(
                            "div",
                            { className: "item" },
                            v.createElement(
                              "span",
                              { className: "label" },
                              e.get("GUI:LadderPoints"),
                            ),
                            v.createElement(
                              "span",
                              { className: "value" },
                              s.points,
                            ),
                          ),
                        void 0 !== s.bonusPool &&
                          v.createElement(
                            "div",
                            { className: "item" },
                            v.createElement(
                              "span",
                              { className: "label" },
                              e.get("GUI:ProfileBonusPool"),
                            ),
                            v.createElement(
                              "span",
                              { className: "value" },
                              s.bonusPool,
                            ),
                          ),
                        void 0 !== s.mmr &&
                          v.createElement(
                            "div",
                            { className: "item" },
                            v.createElement(
                              "span",
                              { className: "label" },
                              e.get("GUI:ProfileMMR"),
                            ),
                            v.createElement(
                              "span",
                              { className: "value" },
                              s.mmr,
                              void 0 !== s.provisionalMmr &&
                                v.createElement(
                                  "span",
                                  {
                                    className: "info",
                                    title:
                                      e.get("gui:profileprovmmr") +
                                      " " +
                                      s.provisionalMmr,
                                  },
                                  v.createElement(p.Image, { src: "info.png" }),
                                ),
                            ),
                          ),
                      ),
                ),
              ),
              v.createElement(
                "div",
                { className: "qm-bottom" },
                v.createElement(S.QuickGameChat, { ...h }),
              ),
            );
          });
        },
      };
    },
  ),
  