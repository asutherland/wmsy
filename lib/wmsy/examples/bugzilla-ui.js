var wmsy = require("wmsy/wmsy");
var wy = exports.wy = new wmsy.WmsyDomain({id: "bugzilla-ui"});

var prettyDate = require("wmsy/examples/date-utils").prettyDate;

////////////////////////////////////////////////////////////////////////////////
//// UI Top Level

wy.defineWidget({
  name: "bug-browser",
  doc: "A page for lists of bugs and a page for bug specifics.",
  constraint: {
    type: "bug-list",
  },
  structure: {
  },
  style: {
    root: [
      "-webkit-transition-property: left"
    ]
  }
});


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
      assignee: wy.bind(["assignee", "handle"]),
      patches: wy.widgetList({type: "patch"}, "activePatches"),
    }),
  },
  style: {
    root: {
      _: [
        "margin-top: 0.2em;",
      ],
      ":hover": [
        "background-color: #eeeeff;",
      ]
    },

    overviewBlock: [
      "border: 1px solid gray;",
      "border-left: none;",
    ],
    id: [
      "font-size: 120%;",
      "font-weight: bolder;",
      "border: 2px solid #204a87;",
      "padding: 2px;",
      "color: #3465a4;",
      "background-color: #fce94f;",
    ],
    summary: [
      "padding-left: 6px;",
      "padding-right: 4px;",
    ],

    assignee: [
      "vertical-align: top;",
      "margin-right: 0.5em;",
    ],
    patches: [
      "display: inline-block;",
    ],
  }
});

wy.defineWidget({
  name: "bug-activity-vis",
  doc: "Visualizes activity on the bug.",
  constraint: {
    type: "bug",
    subwidget: "bug-activity-vis",
  },
  structure: {},
  constructor: function() {
    // (ideally, we would not instantiate / process this for every widget
    //  instance.)

    // -- create the visualization

    // --

  },
  impl: {
    /**
     * Build sparse data series where we have one series per
     */
    chewData: function bug_act_vis_chewData() {

    }
  }
});

wy.defineWidget({
  name: "patch-status-mini",
  doc: "Show the status of a patch on a bug.",
  constraint: {
    type: "patch",
  },
  structure: wy.flow({
    desc: wy.bind("description"),
    flags: wy.widgetFlow({type: "flag"}, "flags", {separator: ", "})
  }),
  style: {
    desc: [
      "padding-right: 0.4em;",
    ],
  }
});

wy.defineWidget({
  name: "flag-status",
  doc: "Convey flags",
  constraint: {
    type: "flag",
  },
  structure: wy.bind("flagWhoDisplay", {status: "status"}),
  style: {
    root: {
      _: [
        "color: #fff;",
        "-moz-border-radius: 4px;",
        "-webkit-border-radius: 4px;",
        "padding: 0px 4px;",
        "font-size: 80%",
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

/*
wy.defineWidget({
  name: "faceted-bug-list",
  doc: "A filterable list of bugs",
});
*/

////////////////////////////////////////////////////////////////////////////////
//// Bug Detail Level


wy.defineWidget({
  name: "pretty-date",
  doc: "prettily formatted date, not sure this needs a special widget",
  constraint: {
    type: "date",
  },
  structure: "",
  impl: {
    preInit: function() {
      this.domNode.textContent = this.obj.toLocaleDateString();
    },
  }
});

wy.defineWidget({
  name: "bug-page",
  doc: "",
  constraint: {
    type: "bug-detail",
  },
  structure: {
    header: {
      contextLine: {
        status: wy.bind("status"),
        reporterBlock: wy.flow({
            reporter: wy.widget({type: "person"}, "reporter"),
            labelOn: " on ",
            creation: wy.widget({type: "date"}, "creationDate"),
          }),
      },
      summaryLine: wy.flow({
        id: wy.bind("id"),
        summary: wy.bind("summary"),
      }),
    },
    events: wy.widget({type: "bug-events"}, "events"),
  },
  style: {
    // -- context line
    contextLine: [
      "background-color: #204a87;",
      "color: white;",
      "width: 100%;",
      "padding: 0.2em;",
      "display: inline-block;", // I am doing this so I can float:right...
    ],
    reporterBlock: [
      "float: right;",
    ],

    // -- summary line
    summaryLine: [
    ],
    id: [
      "font-size: 160%;",
      "font-weight: bolder;",
      "border: 2px solid #204a87;",
      "padding: 2px;",
      "color: #3465a4;",
      "background-color: #fce94f;",
    ],
    summary: [
      "font-size: 120%;",
      "padding-left: 6px;",
      "padding-right: 4px;",
    ],
  }
});

wy.defineWidget({
  name: "bug-events",
  doc: "Comment collection, exists to add filtering/etc.",
  constraint: {
    type: "bug-events",
  },
  structure: {
    events: wy.widgetList({type: "bug-event"}, null),
  },
});

wy.defineWidget({
  name: "bug-change-with-comment",
  doc: "Unified representation of bug comments and other changes",
  constraint: {
    type: "bug-event",
  },
  structure: {
    header: wy.flow({
      id: wy.bind("id"),
      author: wy.widget({type: "person"}, "author"),
      date: wy.widget({type: "date"}, "date"),
    }),
    //commment: wy.contentStream("comments", "comment"),
    comment: wy.bind("comment"),
  },
  style: {
    root: [
    ],

    header: [
      "display: inline-block;",
      "border: 1px solid black;",
    ],
    id: [
      "border-right: 1px solid black;",
      "width: 2em;",
    ],
    date: [
      "float: right;",
    ],

    comment: [
      "display: inline-block;",
      "font-family: monospace;",
      "white-space: pre-wrap;",
      "width: 80em;",
    ],
  },
});

wy.defineWidget({
  name: "bug-person-header",
  doc: "People with context tags",
  constraint: {
    type: "person",
  },
  structure: wy.flow({
    handle: wy.bind("handle"),
/*
    category: wy.widget({type: "bug-person-tags", group: "category"}),
    mood: wy.widget({type: "bug-person-tags", group: "mood"}),
*/
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
