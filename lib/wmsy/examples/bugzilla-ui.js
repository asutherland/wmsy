var wmsy = require("wmsy/wmsy");
var wy = new wmsy.WmsyDomain({id: "bugzilla-ui"});

////////////////////////////////////////////////////////////////////////////////
//// Bug List Level

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
      patches: wy.widgetFlow({type: "patch"}, "activePatches"),
    }),
  },
});

wy.defineWidget({
  name: "patch-status-mini",
  doc: "Show the status of a patch on a bug.",
  constraint: {
    type: "patch",
  },
  structure: wy.flow({
    flags: wy.widgetFlow({type: "flag"}, "flags", {separator: ", "})
  }),
  style: {

  }
});

wy.defineWidget({
  name: "flag-status",
  doc: "Convey flags",
  constraint: {
    type: "flag",
  },
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

////////////////////////////////////////////////////////////////////////////////
//// Bug Detail Level

wy.defineWidget({
  name: "bug-page",
  doc: "",
  structure: {
    comments: wy.widget({type: "bug-comments"}, "comments"),
  }
});

wy.defineWidget({
  name: "bug-change-with-comment",
  constraint: {
    type: "comment",

  },
  structure: {
    commment: wy.contentStream("comments", "comment"),
  }
});

wy.defineWidget({
  name: "bug-person-header",
  doc: "People with context tags",
  constraint: {
    type: "person",
  },
  structure: wy.flow({
    handle: wy.bind("handle"),
    category: wy.widget({type: "bug-person-tags", group: "category"}),
    mood: wy.widget({type: "bug-person-tags", group: "mood"}),
  }),
});

/**
 * Generic person header tags display intended to resemble a little button bar.
 */
wy.defineWidget({
  name: "bug-person-header-tags",
  doc: "Tag setting/display after a person's name in a header.",
  constraint: {
    type: "bug-person-tags",
    group: wy.WILD,
  },
  structure: wy.flow({
  }),
});
