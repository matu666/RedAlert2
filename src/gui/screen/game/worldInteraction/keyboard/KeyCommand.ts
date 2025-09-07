System.register(
  "gui/screen/game/worldInteraction/keyboard/KeyCommand",
  [],
  function (t, e) {
    "use strict";
    let TriggerMode: any;
    e && e.id;
    return {
      setters: [],
      execute: function () {
        let e: any;
        ((e = TriggerMode || t("TriggerMode", (TriggerMode = {})))[(e.KeyDown = 0)] = "KeyDown"),
          (e[(e.KeyUp = 1)] = "KeyUp"),
          (e[(e.KeyDownUp = 2)] = "KeyDownUp");
      },
    };
  },
);
