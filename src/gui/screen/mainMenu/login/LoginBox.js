System.register(
    "gui/screen/mainMenu/login/LoginBox",
    [
      "react",
      "gui/screen/mainMenu/login/ServerList",
      "@puzzl/core/lib/async/Task",
      "network/HttpRequest",
      "network/WolConfig",
    ],
    function (e, t) {
      "use strict";
      var f, y, T, v, b, i;
      t && t.id;
      return {
        setters: [
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
        ],
        execute: function () {
          (i = (
            {
              regions: e,
              selectedRegion: t,
              selectedUser: i,
              pings: r,
              breakingNewsUrl: s,
              strings: a,
              onRegionChange: n,
              onRequestRegionRefresh: o,
              onSubmit: l,
            },
            c,
          ) => {
            let h = f.useRef(null),
              u = f.useRef(null),
              d = f.useRef(null),
              [g, p] = f.useState();
            f.useEffect(() => {
              setTimeout(() => u.current?.focus(), 50);
            }, []),
              f.useEffect(() => {
                if (s) {
                  let e = new T.Task(async (e) => {
                    let t = await new v.HttpRequest().fetchHtml(s, e);
                    (t = t.trim()), t.length && p(t);
                  });
                  return (
                    e.start().catch((e) => console.error(e)), () => e.cancel()
                  );
                }
              }, [s]);
            const m = () => {
              u.current && d.current && l(u.current.value, d.current.value);
            };
            f.useImperativeHandle(c, () => ({
              submit() {
                h.current?.requestSubmit ? h.current.requestSubmit() : m();
              },
            }));
            return f.default.createElement(
              "div",
              { className: "login-wrapper" },
              f.default.createElement(
                "div",
                { className: "title" },
                a.get("GUI:Login"),
              ),
              f.default.createElement(
                "form",
                {
                  onSubmit: (e) => {
                    e.preventDefault(), m();
                  },
                  className: "login-form login-box",
                  ref: h,
                },
                f.default.createElement(
                  "div",
                  { className: "field" },
                  f.default.createElement("label", null, a.get("TS:Region")),
                  i && t
                    ? f.default.createElement("input", {
                        type: "text",
                        value: t.label,
                        readOnly: !0,
                      })
                    : f.default.createElement(
                        f.default.Fragment,
                        null,
                        f.default.createElement(y.ServerList, {
                          regionId: t?.id,
                          regions: e,
                          pings: r,
                          strings: a,
                          onChange: (e) => {
                            n(e);
                          },
                        }),
                        f.default.createElement("button", {
                          type: "button",
                          className: "icon-button refresh-button",
                          onClick: o,
                        }),
                      ),
                ),
                f.default.createElement(
                  "div",
                  { className: "field" },
                  f.default.createElement("label", null, a.get("GUI:Nickname")),
                  f.default.createElement("input", {
                    name: "user",
                    type: "text",
                    required: !0,
                    minLength: b.MIN_USERNAME_LEN,
                    maxLength: b.MAX_USERNAME_LEN,
                    pattern: "[a-zA-Z0-9_\\-]+",
                    ref: u,
                    value: i,
                    readOnly: !!i,
                  }),
                ),
                f.default.createElement(
                  "div",
                  { className: "field" },
                  f.default.createElement("label", null, a.get("GUI:Password")),
                  f.default.createElement("input", {
                    name: "pass",
                    type: "password",
                    required: !0,
                    maxLength: b.MAX_PASS_LEN,
                    ref: d,
                  }),
                ),
                f.default.createElement("button", {
                  type: "submit",
                  style: { visibility: "hidden" },
                }),
              ),
              g &&
                f.default.createElement(
                  "fieldset",
                  { className: "news" },
                  f.default.createElement(
                    "legend",
                    null,
                    a.get("GUI:BreakingNews"),
                  ),
                  f.default.createElement("div", {
                    dangerouslySetInnerHTML: { __html: g },
                  }),
                ),
            );
          }),
            e("LoginBox", f.forwardRef(i));
        },
      };
    },
  ),
  