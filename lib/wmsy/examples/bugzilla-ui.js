var wmsy = require("wmsy/wmsy");
var wy = exports.wy = new wmsy.WmsyDomain({id: "bugzilla-ui"});

var bzm = require("wmsy/examples/bugzilla-model");

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

/**
 * Bug List Entry
 */
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

/*
wy.defineWidget({
  name: "faceted-bug-list",
  doc: "A filterable list of bugs",
});
*/

////////////////////////////////////////////////////////////////////////////////
//// Bug Detail Level



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
    body: {
      events: wy.widget({type: "bug-events"}, "events"),
    }
  },
  style: {
    // --- header
    header: [
      "position: fixed;",
      "top: 0;",
      "z-index: 1001;",
    ],

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
      "background-color: white;",
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

    // --- body
    body: [
      "padding-top: 60px;",
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
    // the absolute block is the traditional comment block
    absoluteBlock: {
      header: wy.flow({
        id: wy.bind("id"),
        author: wy.widget({type: "person"}, "author"),
        date: wy.widget({type: "date"}, "date"),
      }),
      //commment: wy.contentStream("comments", "comment"),
      comment: wy.bind("comment"),
    },
    // the delta block is off to the right and shows... deltas...
    deltaBlock: {
      attachmentChanges: wy.widgetList({type: "attachment-changes"},
                                       "attachmentChanges"),
    }
  },
  style: {
    root: [
      "display: inline-block;",
      "width: 100%;",
    ],

    absoluteBlock: [
      "display: inline-block;",
      "float: left;",
      "font-family: monospace;",
      "font-size: 90%;",
      "width: 60em;",
    ],

    header: [
      "display: inline-block;",
      "border: 1px solid black;",
      "width: 100%;",
      "font-family: sans-serif;",
    ],
    id: [
      "border-right: 1px solid black;",
      "display: inline-block;",
      "width: 2em;",
      "text-align: center;",
      "margin-right: 0.4em;",
    ],
    date: [
      "float: right;",
    ],

    comment: [
      "display: inline-block;",
      "font-family: monospace;",
      "white-space: pre-wrap;",
    ],

    deltaBlock: [
      "float: left;",
      "padding-left: 0.4em;",
    ]
  },
});

////////////////////////////////////////////////////////////////////////////////
//// Common

wy.defineWidget({
  name: "attachment-changes",
  doc: "Display attachment changes",
  constraint: {
    type: "attachment-changes",
  },
  structure: {
    description: wy.bind(["attachment", "description"],
                         {obsolete: ["attachment", "isObsolete"]}),
    flagChanges: wy.widgetFlow({type: "patch-flag-status"}, "flagChanges"),
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
    category: wy.widget({type: "bug-person-tags", group: "category"}, null),
  }),
  style: {
    root: [
      //"font-family: sans-serif;",
    ],
  }
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

wy.defineWidget({
  name: "bug-person-tag",
  doc: "Displays the current state of a multi-valued tag slot.",
  constraint: {

  },
  structure: {

  },
  popups: {
    tagMutator: {
      constraint: {
        type: "bug-person-tag-mutator",
        group: "category",
      },
      // XXX the plan is to register a capturing click listener that checks
      //  whether the click happened outside our area, and if so, close our
      //  widget.  if the click happened inside the widget, the plan is to
      //  let the widget handle things.
      clickAway: true,
    }
  },
  events: {
    root: {
      click: function() {
        this.popup_tagMutator(this.obj);
      }
    }
  }
});

wy.defineWidget({
  name: "bug-person-tag-mutator",
  doc: "The popup to let you change the tag associated with a user.",
  constraint: {
    type: "bug-person-tag-mutator",
    group: wy.WILD,
  },
  structure: {
    values: wy.widgetList({type: "person-tag-value"},
                          wy.fromConstraint("group", function(group) {
                            return bzm.BugPeeps.tagGroups[group];
                          })),
  },
  style: {
    root: [
      "position: absolute;",
    ]
  },
  impl: {
    postInit: function() {
      // mark the currently selected item!
      var selNode = this.values_itemMap[this.obj.tags[this.param_group]];
      selNode.setAttribute("selected", true);
    }
  },
  events: {
    values: {
      click: function(valueBinding) {
        this.obj.tags[this.param_group] = valueBinding.obj.id;
        // XXX I think the popup_* function should be poking this into our
        //  instantiation.  it should remove our DOM node and its crazy
        //  clickAway hook, as well as call any callback that was registered.
        this.done();
      }
    }
  }
});

wy.defineWidget({
  name: "person-tag-value",
  doc: "per-tag display in the bug-person-tag-mutator",
  constraint: {
    type: "person-tag-value",
  },
  structure: wy.flow({
    label: wy.bind("label"),
    desc: wy.bind("desc"),
  }),
  style: {
    root: {
      _: [
        "color: #4e9a06;",
        "font-family: sans-serif;",
      ],
      '[selected="true"]': [
        "background-color: #4e9a06;",
        "color: white;",
      ]
    },
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
    flags: wy.widgetFlow({type: "patch-flag-status"}, "flags",
                         {separator: ", "})
  }),
  style: {
    desc: [
      "padding-right: 0.4em;",
    ],
  }
});

wy.defineWidget({
  name: "patch-flag-status",
  doc: "Convey flags",
  constraint: {
    type: "patch-flag-status",
  },
  structure: wy.bind("flagWhoDisplay", {status: "status",
                                        invert: "invert"}),
  style: {
    root: {
      _: [
        "color: #fff;",
        "-moz-border-radius: 4px;",
        "-webkit-border-radius: 4px;",
        "padding: 0px 4px;",
        "margin: 1px;",
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
      '[invert="true"]': [
        "text-decoration: line-through;",
      ],
    }
  }
});

wy.defineWidget({
  name: "pretty-date",
  doc: "prettily formatted date, not sure this needs a special widget",
  constraint: {
    type: "date",
  },
  structure: "",
  impl: {
    preInit: function() {
      this.domNode.textContent = this.obj.toLocaleString();
    },
  }
});
