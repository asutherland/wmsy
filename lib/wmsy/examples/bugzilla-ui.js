var wmsy = require("wmsy/wmsy");
var wy = new wmsy.WmsyDomain({id: "bugzilla-ui"});

////////////////////////////////////////////////////////////////////////////////
//// Bug Top Level

wy.defineWidget({
  name: "bug-awareness",
  doc: "For bug list examination",
  constraint: {
    type: "bug",
  },
  structure: {
    overviewBlock: wy.flow({
      id: wy.bind("id"),
      summary: wy.bind("summary"),
    }),
    statusBlock: wy.flow({
      patches: wy.widgetList({type: "patch"}, "activePatches"),
    }),
  },
});

wy.defineWidget({
  name: "patch-status-mini",
  doc: "Show the status of a patch on a bug.",
  structure: wy.flow({
    flags: wy.widgetFlow({type: "flag"}, "flags", {separator: ", "})
  }),
  style: {

  }
});

wy.defineWidget({
  name: "flag-status",
  doc: "Convey flags",
  structure: wy.flow({
    who: wy.bind("who"),
  }),
  style: {
    root: {
      _: [
        "color: #fff;",
        "-moz-border-radius: 2px;",
        "-webkit-border-radius: 2px;",
      ],
      '[status="+"]': [
        "background-color: #4e9a06;",
      ],
      '[status="?"]': [
        "background-color: #555753;",
      ],
      '[status="-"]': [
        "background-color: #a40000;",
      ],
    }
  }
});

wy.defineWidget({
  name: "faceted-bug-list",
  doc: "A filterable list of bugs",
});
