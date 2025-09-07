System.register(
    "gui/screen/mainMenu/score/ScoreTable",
    [
      "classnames",
      "game/gameopts/constants",
      "gui/component/CountryIcon",
      "react",
      "util/format",
      "gui/screen/mainMenu/lobby/component/RankIndicator",
      "network/WolGameReport",
    ],
    function (e, t) {
      "use strict";
      var s, h, u, d, g, p, m, f;
      t && t.id;
      return {
        setters: [
          function (e) {
            s = e;
          },
          function (e) {
            h = e;
          },
          function (e) {
            u = e;
          },
          function (e) {
            d = e;
          },
          function (e) {
            g = e;
          },
          function (e) {
            p = e;
          },
          function (e) {
            m = e;
          },
        ],
        execute: function () {
          e(
            "ScoreTable",
            ({
              game: e,
              singlePlayer: t,
              tournament: i,
              localPlayer: r,
              gameReport: a,
              strings: n,
            }) => {
              const s = e
                .getNonNeutralPlayers()
                .filter((e) => !e.isObserver || e.defeated)
                .sort((e, t) => t.score - e.score);
              let o = i && a;
              var l = a?.players.find(
                (e) => e.name.toLowerCase() === r.name.toLowerCase(),
              );
              let c = l?.resultType;
              return (
                void 0 === c &&
                  (e.stalemateDetectTrait?.isStale() &&
                  0 === e.stalemateDetectTrait.getCountdownTicks()
                    ? (c = m.WolGameReportResult.Draw)
                    : r.defeated
                      ? e.alliances
                          .getAllies(r)
                          .filter((e) => !e.isAi && !e.defeated).length ||
                        (c = m.WolGameReportResult.Loss)
                      : r.isObserver || (c = m.WolGameReportResult.Win)),
                d.default.createElement(
                  "div",
                  { className: "score-wrapper" },
                  (c || !t) &&
                    d.default.createElement(
                      "div",
                      { className: "score-title" },
                      d.default.createElement(
                        "div",
                        { className: "game-result" },
                        c === m.WolGameReportResult.Win
                          ? n.get("gui:gameresultvictory")
                          : c === m.WolGameReportResult.Draw
                            ? n.get("gui:gameresultdraw")
                            : c === m.WolGameReportResult.Loss
                              ? n.get("gui:gameresultdefeat")
                              : "",
                      ),
                      !a &&
                        !t &&
                        (i || void 0 === c) &&
                        d.default.createElement(
                          "div",
                          { className: "pending-results" },
                          n.get("gui:gameresultwaiting"),
                        ),
                      l?.points &&
                        d.default.createElement(
                          "div",
                          { className: "points-gain" },
                          n.get("GUI:LadderPoints"),
                          " ",
                          l.points.value,
                          " (",
                          d.default.createElement(f, {
                            className: "points-gain-value",
                            value: l.points.gain,
                            win: c === m.WolGameReportResult.Win,
                          }),
                          ")",
                        ),
                    ),
                  d.default.createElement(
                    "div",
                    { className: "score-header" },
                    d.default.createElement(
                      "div",
                      { "data-r-tooltip": n.get("STT:MPScoreLabelMapName") },
                      n.get("TXT_MAP", e.gameOpts.mapTitle),
                    ),
                    d.default.createElement(
                      "div",
                      { "data-r-tooltip": n.get("STT:MPScoreLabelTime") },
                      n.get("GUI:Time"),
                      ": ",
                      g.formatTimeDuration(Math.floor(e.currentTime / 1e3)),
                    ),
                  ),
                  d.default.createElement(
                    "table",
                    null,
                    d.default.createElement(
                      "thead",
                      null,
                      d.default.createElement(
                        "tr",
                        null,
                        d.default.createElement("th", null),
                        d.default.createElement("th", {
                          className: "player-rank",
                        }),
                        d.default.createElement(
                          "th",
                          {
                            className: "player-name",
                            "data-r-tooltip": n.get("STT:MPScoreLabelPlayer"),
                          },
                          n.get("GUI:Player"),
                        ),
                        o &&
                          d.default.createElement(
                            "th",
                            { className: "number" },
                            n.get("GUI:MMR"),
                          ),
                        d.default.createElement(
                          "th",
                          {
                            className: "number",
                            "data-r-tooltip": n.get("STT:MPScoreLabelKills"),
                          },
                          n.get("GUI:Kills"),
                        ),
                        d.default.createElement(
                          "th",
                          {
                            className: "number",
                            "data-r-tooltip": n.get("STT:MPScoreLabelLosses"),
                          },
                          n.get("GUI:Losses"),
                        ),
                        d.default.createElement(
                          "th",
                          {
                            className: "number",
                            "data-r-tooltip": n.get("STT:MPScoreLabelBuilt"),
                          },
                          n.get("GUI:Built"),
                        ),
                        d.default.createElement(
                          "th",
                          {
                            className: "number",
                            "data-r-tooltip": n.get("STT:MPScoreLabelScore"),
                          },
                          n.get("GUI:Score"),
                        ),
                      ),
                    ),
                    d.default.createElement(
                      "tbody",
                      null,
                      s.map((t, e) => {
                        var i = a?.players.find(
                            (e) =>
                              e.name.toLowerCase() === t.name.toLowerCase(),
                          ),
                          r = i?.mmr?.value,
                          s = i?.mmr?.gain;
                        return d.default.createElement(
                          "tr",
                          { key: e, style: { color: t.color.asHexString() } },
                          d.default.createElement(
                            "td",
                            null,
                            d.default.createElement(u.CountryIcon, {
                              country: t.country.name,
                            }),
                          ),
                          d.default.createElement(
                            "td",
                            { className: "player-rank" },
                            i &&
                              d.default.createElement(p.RankIndicator, {
                                playerProfile: i,
                                strings: n,
                              }),
                          ),
                          d.default.createElement(
                            "td",
                            {
                              className: "player-name",
                              "data-r-tooltip": n.get("STT:MPScoreLabelPlayer"),
                            },
                            t.isAi
                              ? n.get(h.aiUiNames.get(t.aiDifficulty))
                              : t.name,
                          ),
                          o &&
                            d.default.createElement(
                              "td",
                              { className: "number player-mmr" },
                              r ?? "-",
                              void 0 !== s &&
                                d.default.createElement(
                                  d.default.Fragment,
                                  null,
                                  " (",
                                  d.default.createElement(f, {
                                    className: "mmr-gain",
                                    value: s,
                                    win:
                                      i?.resultType ===
                                      m.WolGameReportResult.Win,
                                  }),
                                  ")",
                                ),
                            ),
                          d.default.createElement(
                            "td",
                            {
                              className: "number",
                              "data-r-tooltip": n.get("STT:MPScoreLabelKills"),
                            },
                            t.getUnitsKilled(),
                          ),
                          d.default.createElement(
                            "td",
                            {
                              className: "number",
                              "data-r-tooltip": n.get("STT:MPScoreLabelLosses"),
                            },
                            t.getUnitsLost(),
                          ),
                          d.default.createElement(
                            "td",
                            {
                              className: "number",
                              "data-r-tooltip": n.get("STT:MPScoreLabelBuilt"),
                            },
                            t.getUnitsBuilt(),
                          ),
                          d.default.createElement(
                            "td",
                            {
                              className: "number",
                              "data-r-tooltip": n.get("STT:MPScoreLabelScore"),
                            },
                            t.score,
                          ),
                        );
                      }),
                    ),
                  ),
                )
              );
            },
          ),
            (f = ({ value: e, win: t, className: i }) => {
              let r;
              return (
                (r = 0 < e ? "+" : 0 === e ? (t ? "+" : "-") : ""),
                d.default.createElement(
                  "span",
                  { className: s.default(i, { positive: t }) },
                  r,
                  e,
                )
              );
            });
        },
      };
    },
  ),
  