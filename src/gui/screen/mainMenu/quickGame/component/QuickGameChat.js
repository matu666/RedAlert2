System.register(
    "gui/screen/mainMenu/quickGame/component/QuickGameChat",
    [
      "react",
      "gui/component/Chat",
      "gui/component/List",
      "gui/component/ChannelUser",
      "network/chat/ChatMessage",
    ],
    function (e, t) {
      "use strict";
      var l, c, h, u, d;
      t && t.id;
      return {
        setters: [
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
            u = e;
          },
          function (e) {
            d = e;
          },
        ],
        execute: function () {
          e(
            "QuickGameChat",
            ({
              strings: i,
              messages: e,
              channels: t,
              localUsername: r,
              users: s,
              chatHistory: a,
              playerProfiles: n,
              onSendMessage: o,
            }) =>
              l.default.createElement(
                l.default.Fragment,
                null,
                l.default.createElement(c.Chat, {
                  strings: i,
                  messages: e,
                  channels: t ?? [],
                  chatHistory: a,
                  localUsername: r,
                  onSendMessage: o,
                  tooltips: {
                    input: i.get("STT:LobbyEditInput"),
                    output: i.get("STT:LobbyEditOutput"),
                    button: i.get("STT:EmoteButton"),
                  },
                }),
                l.default.createElement(
                  h.List,
                  {
                    className: "players-list",
                    tooltip: i.get("STT:LobbyListUsers"),
                  },
                  s.map((e) => {
                    var t = n.get(e.name);
                    return l.default.createElement(u.ChannelUser, {
                      key: e.name,
                      user: e,
                      playerProfile: t,
                      strings: i,
                      onClick: () => {
                        a.lastComposeTarget.value = {
                          type: d.ChatRecipientType.Whisper,
                          name: e.name,
                        };
                      },
                    });
                  }),
                ),
              ),
          );
        },
      };
    },
  ),
  