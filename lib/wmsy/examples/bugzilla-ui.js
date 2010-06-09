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
      title : {
        summary: wy.bind("summary")
      },
    },
    sidebar : {
      bugId: wy.flow({
        id: wy.bind("id")
      }),
      contextLine: {
        statusLine: wy.flow({
          labelStatus: "status: ",
          status: wy.bind("status")
        }),
        reporterLine: wy.flow({
            labelOn: "created by: ",
            reporter: wy.widget({type: "person"}, "reporter"),
        }),
        createdLine: wy.flow({
            labelOn: "created on: ",
            creation: wy.widget({type: "date"}, "creationDate"),
        })
      }
    },
    body: {
      events: wy.widget({type: "bug-events"}, "events"),
    }
  },
  style: {
    root : [
      ""
    ],
    // --- header
    header: [
      "font-weight: bold;",
      "margin: 2em 0;"
    ],
    // --- sidebar
    sidebar: [
      "display: table-cell;",
      "vertical-align: top;",
      "width: 200px;",
      "padding: 0 5px;",
      "border-right: 2px solid #C3D9FF;"
    ],
    // --- body
    body: [
      "display: table-cell;",
      "vertical-align: top;",
      "padding: 0 5px;"
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
      body: {
        bodyLeft: wy.flow({
          author: wy.widget({type: "commenter"}, "author")
        }),
        bodyRight: {
          meta : wy.flow({
            labelComment : "comment ",
            id: wy.bind("id"),
            labelOn : " on ",
            date: wy.widget({type: "date"}, "date")
          }),
          comment: wy.bind("comment")
        }
      }
      //commment: wy.contentStream("comments", "comment"),
    },
    // the delta block is off to the right and shows... deltas...
    deltaBlock: {
      attachmentChanges: wy.widgetList({type: "attachment-changes"},
                                       "attachmentChanges"),
    }
  },
  style: {
    root: [
      "clear: both;",
      "margin-bottom: 1em;",
    ],

    absoluteBlock: [
      "display: table;",
      "font-size: 90%;",
      "width: 100%;",
      "margin-bottom: 10px;",
      "padding-bottm: 10px;",
      "border-bottom: 1px solid #E5ECF9;"
    ],

    body: [
      "display: table-row;",
    ],
    meta: [
      "text-align: right;",
      "color: #aaa;",
      "padding-bottom: 3px;"
    ],
    bodyLeft: [
      "display: table-cell;",
      "vertical-align: top;",
      "width: 150px;"
    ],
    bodyRight: [
      "display: table-cell;",
      "vertical-align: top;",
      "padding: 5px;"
    ],
    comment: [
      "display: block;",
      "padding: 10px;",
      "font-family: monospace;",
      "white-space: pre-wrap;",
      "font-size: 12px;",
      "line-height: 14px;"
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
  name: "bug-person",
  doc: "A simple person representation",
  constraint: {
    type: "person",
  },
  structure: {
      person : wy.flow({
        photo: wy.bindImage("avatar24"),
        handle: wy.bind("handle")
      }),
  },
  style: {
    root: [
      //"font-family: sans-serif;",
    ],
    person: [
      "padding: 3.5px;",
    ],
    photo: [
      "display: inline-block;",
      "vertical-align: middle;",
      "width: 24px;",
      "min-width: 24px;",
      "height: 24px;",
      "margin-right: 3px;"
    ],
    handle: [
      "color: #666;",
      "font-weight: bold;"
    ]
  }
});

wy.defineWidget({
  name: "bug-person-commenter",
  doc: "People with context tags",
  constraint: {
    type: "commenter",
  },
  structure: {
      person : {
        role: wy.subWidget({type: "bug-person-tag-slot", group: "role"}, null),
        photo : wy.bindImage("avatar24"),
        name : {
          handle: wy.bind("handle"),
          email : wy.bind("email")
        }
      },
  },
  style: {
    root: [
      //"font-family: sans-serif;",
    ],
    person: [
      "display: table;",
      "width: 100%;"
    ],
    role: [
      "margin-left: 9px",
    ],
    photo: [
      "display: table-cell;",
      "vertical-align: middle;",
      "background-color: transparent;",
      "background-position: center center;",
      "width: 24px;",
      "height: 24px;",
      "padding: 5px;",
      "padding-top: 0px",
    ],
    name : [
      "display: table-cell;",
      "vertical-align: middle;",
      "padding: 5px;"
    ],
    handle: [
      "display: block;",
      "color: #666;",
      "font-weight: bold;"
    ],
    email: [
      "display: block;",
      "font-size: x-small;",
      "color: #888;",
    ]
  }
});

wy.defineWidget({
  name: "bug-person-tag-slot",
  doc: "Displays the current state of a multi-valued tag slot.",
  constraint: {
    type: "bug-person-tag-slot",
    group: wy.WILD,
  },
  structure: wy.bind(wy.fromConstraint("group", function(group, obj) {
                       return obj.tags[group];
                     })),
});

wy.defineWidget({
  name: "bug-person-tag-slot-role",
  doc: "Displays the current state of a multi-valued tag slot.",
  constraint: {
    type: "bug-person-tag-slot",
    group: "role",
  },
  structure: wy.bind(null, {role: ["tags", "role"]}),
  style: {
    root: {
      _: [
        "background: url(hats.png) no-repeat;",
        "width: 16px;",
        "height: 16px;",
      ],
      '[role="dev"]': ["background-position: -0px 0px"],
      '[role="driver"]': ["background-position: -16px 0px"],
      '[role="qa"]': ["background-position: -32px 0px"],
      '[role="pro"]': ["background-position: -48px 0px"],
      '[role="user"]': ["background-position: -64px 0px"],
      '[role="sad"]': ["background-position: -80px 0px"],
    }
  },
  popups: {
    tagMutator: {
      constraint: {
        type: "bug-person-tag-mutator",
        group: "role",
      },
      // XXX the plan is to register a capturing click listener that checks
      //  whether the click happened outside our area, and if so, close our
      //  widget.  if the click happened inside the widget, the plan is to
      //  let the widget handle things.
      clickAway: true,
      position: {
        above: "root",
      }
    }
  },
  events: {
    root: {
      click: function() {
        console.log("click handler has this of", this);
        var dis = this;
        this.popup_tagMutator(this.obj, function() { dis.update(); });
        console.log("popup done");
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
      "background-color: white;",
      "border: 1px solid blue;",
      "cursor: pointer;",
    ]
  },
  impl: {
    postInit: function() {
      // mark the currently selected item!
      var selBind = this.values_itemMap[this.obj.tags[this._parameter_group]];
      selBind.domNode.setAttribute("selected", true);
    }
  },
  events: {
    values: {
      click: function(valueBinding) {
        this.obj.tags[this._parameter_group] = valueBinding.obj.id;
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
