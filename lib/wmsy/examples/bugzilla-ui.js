/*****************************BEGIN LICENSE BLOCK *****************************
* Version: MPL 1.1/GPL 2.0/LGPL 2.1
*
* The contents of this file are subject to the Mozilla Public License Version
* 1.1 (the "License"); you may not use this file except in compliance with the
* License. You may obtain a copy of the License at http://www.mozilla.org/MPL/
*
* Software distributed under the License is distributed on an "AS IS" basis,
* WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License for
* the specific language governing rights and limitations under the License.
*
* The Original Code is Thunderbird Jetpack Functionality.
*
* The Initial Developer of the Original Code is the Mozilla Foundation.
* Portions created by the Initial Developer are Copyright (C) 2010 the Initial
* Developer. All Rights Reserved.
*
* Contributor(s):
*  Andrew Sutherland <asutherland@asutherland.org> (Original Author)
*
* Alternatively, the contents of this file may be used under the terms of either
* the GNU General Public License Version 2 or later (the "GPL"), or the GNU
* Lesser General Public License Version 2.1 or later (the "LGPL"), in which case
* the provisions of the GPL or the LGPL are applicable instead of those above.
* If you wish to allow use of your version of this file only under the terms of
* either the GPL or the LGPL, and not to allow others to use your version of
* this file under the terms of the MPL, indicate your decision by deleting the
* provisions above and replace them with the notice and other provisions
* required by the GPL or the LGPL. If you do not delete the provisions above, a
* recipient may use your version of this file under the terms of any one of the
* MPL, the GPL or the LGPL.
*
****************************** END LICENSE BLOCK ******************************/

define(
  [
    "wmsy/wmsy",
    "wmsy/examples/bugzilla-model",
    "wmsy/examples/bugzilla-app",
    // import mainly for side-effects
    "wmsy/examples/bugzilla-vis",
    "exports",
  ],
  function(
    wmsy,
    $model,
    app,
    bvis,
    exports
  ) {

var wy = exports.wy = new wmsy.WmsyDomain({id: "bugzilla-ui",
                                           clickToFocus: true});

wy.defineIdSpace("tag", function(tagDesc) { return tagDesc.id; });

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
  doc: "Show a single bug on a page.",
  constraint: {
    type: "bug-detail",
  },
  focus: wy.focus.domain.vertical("runs"),
  structure: {
    header: {
      title : {
        summary: wy.bind("summary")
      },
    },
      /*
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
      */
    body: {
      timeline: wy.subWidget({subwidget: "bug-activity-vis"}),
      runBox: {
        //runWrap: {
          runs: wy.libWidget(
            {
              type: "virt-list",
              constraint: {type: "bug-run"},
              jumpConstraint: {type: "hyper-jump"},
              layout: "linear",
              vertical: true,
            },
            "runsSlice"),
        //}
      },
    },
  },
  impl: {
    postInitUpdate: function() {
      // (the runs virt-list will have been instantiated during the update pass)
      // seek the virtual list widget to the top...
      this.emit_seek(0, 0, 0, 0);
    },
  },
  emit: ["seek"],
  // the vis (timeline) and the virt-list (runs) need to talk
  relay: ["seek", "visibleBindings", "virtScroll",
          // re-categorization of users needs to repaint the vis.
          // XXX this should instead register universal interest to the idspace
          "visNeedsUpdate"],
  style: {
    root : [
      "display: box;",
      "box-orient: vertical;",
      "box-flex: 1;",
      "height: 100%;",
      "max-width: 960px;",
    ],
    // --- header
    header: [
      "font-weight: bold;",
      "padding: 2em 0;"
    ],
    // --- body
    body: [
      "display: box;",
      "box-orient: horizontal;",
      "box-direction: reverse;",
      "box-flex: 1.0;",
    ],

    timeline: [
      "width: 187px;",
    ],

    runBox: [
      "display: box;",
      "box-orient: vertical;",
      "border-left: 2px solid #C3D9FF;",
      "box-flex: 1.0;",
    ],

    runWrap: [
      "display: block;",
      "height: 100%;",
      "overflow: hidden;",
    ],

    runs: [
      "box-flex: 1;",
      "display: block;",
      "height: 100%;",
      "overflow: hidden;",
    ],
    more: [
      "box-flex: 1;",
    ],
  }
});

wy.defineWidget({
  name: "hyper-jump",
  doc: "Virtual list widget jump transition widget.",
  constraint: {
    type: "hyper-jump",
  },
  structure: {
    ellipsis: "...",
  },
  style: {
    ellipsis: [
      "font-size: 400%;",
      "text-align: center;",
    ],
  },
});

wy.defineWidget({
  name: "bug-change-with-comment",
  doc: "Unified representation of bug comments and other changes",
  constraint: {
    type: "bug-run",
  },
  focus: wy.focus.container.horizontal("author", "events"),
  structure: {
    // the absolute block is the traditional comment block
    absoluteBlock: {
      body: {
        bodyLeft: {
          author: wy.widget({type: "commenter"}, "author")
        },
        events: wy.vertList({type: "bug-event"}, "events"),
      }
      //commment: wy.contentStream("comments", "comment"),
    },
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
      "padding-bottom: 10px;",
      "border-bottom: 1px solid #E5ECF9;"
    ],

    body: [
      "display: table-row;",
    ],
    bodyLeft: [
      "display: table-cell;",
      "vertical-align: top;",
      "width: 150px;"
    ],
    events: [
      "display: table-cell;",
      "vertical-align: top;",
      "padding-left: 5px;"
    ],
  },
});

wy.defineWidget({
  name: "bug-event-within-run",
  doc: "A bug event within the context of a run which handles the author.",
  constraint: {
    type: "bug-event",
  },
  focus: wy.focus.item,
  structure: wy.block({
    /*
    meta : wy.flow({
      labelComment : "comment ",
      id: wy.bind("displayId"),
      labelOn : " on ",
      date: wy.widget({type: "date"}, "date")
    }),
     */
    comment: wy.bind("comment"),
    // the delta block is off to the right and shows... deltas...
    deltaBlock: {
      attachmentChanges: wy.widgetList({type: "attachment-changes"},
                                       "attachmentChanges"),
    }
  }, {zebra: "zebra"}),
  style: {
    root: {
      _: [
        "margin-bottom: 5px;",
      ],
      '[zebra="even"]': [
        "background-color: #eeeeee;",
      ],
      '[zebra="odd"]': [
        "background-color: #dddddd;",
      ],
      ":focused": [
       "background-color: #ffd280 !important;",
      ]
    },
    meta: [
      "text-align: right;",
      "color: #aaa;",
      "padding-bottom: 3px;"
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
      "padding-left: 0.4em;",
    ],
  }
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
      person : {
        photo: wy.bindImage("avatar24"),
        handle: wy.bind("handle")
      },
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
  focus: wy.focus.item,
  structure: {
    person : {
      role: wy.subWidget({type: "bug-person-tag-slot", group: "role"}),
      photo : wy.bindImage("avatar24"),
      name : {
        handle: wy.bind("handle"),
        email : wy.bind("email")
      }
    },
  },
  emit: ["changeTagRole"],
  events: {
    root: {
      enter_key: function() {
        this.emit_changeTagRole();
      }
    }
  },
  style: {
    root: {
      ":focused": [
        "background-color: #ffd280;",
      ]
    },
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

var CSS_COMMON_HATS = {
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
};

wy.defineWidget({
  name: "bug-person-tag-slot-role",
  doc: "Displays the current state of a multi-valued tag slot.",
  constraint: {
    type: "bug-person-tag-slot",
    group: "role",
  },
  structure: wy.bind(wy.NONE, {role: ["tags", "role"]}),
  style: {
    root: CSS_COMMON_HATS,
  },
  popups: {
    tagMutator: {
      popupWidget: wy.libWidget({type: "popup"}),
      constraint: {
        type: "bug-person-tag-mutator",
        group: "role",
      },
      clickAway: true,
      centerOnFocus: "icon",
      position: {
        leftAlign: "root",
      }
    }
  },
  events: {
    root: {
      click: function () {
        this.__receive_changeTagRole();
      }
    }
  },
  emit: ["visNeedsUpdate"],
  receive: {
    changeTagRole: function() {
      var dis = this;
      this.popup_tagMutator(this.obj, this, function() {
                              app.saveState();
                              dis.updateSimilar();
                              dis.emit_visNeedsUpdate();
                            });
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
  focus: wy.focus.domain.vertical("values"),
  structure: {
    values: wy.widgetList({type: "person-tag-value"},
                          wy.fromConstraint("group", function(group) {
                            return $model.BugPeeps.tagGroups[group];
                          })),
  },
  style: {
    root: [
      "background-color: white;",
      "border: 1px solid black;",
      "cursor: pointer;",
      "padding: 2px;",
    ]
  },
  impl: {
    postInitUpdate: function() {
      // mark the currently selected item by using the index; the better way
      //  to do this is to expose some idspace-based helpers or allow for
      //  finding by object identity.
      var tagValue = this.obj.tags[this.__parameter_group];
      var selBind = this.values_findById("tag", tagValue);
      selBind.focus();
    }
  },
  events: {
    values: {
      command: function(valueBinding) {
        this.obj.tags[this.__parameter_group] = valueBinding.obj.id;
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
  focus: wy.focus.item,
  structure: wy.flow({
    icon: wy.bind(wy.NONE, {role: "id"}),
    label: wy.bind("label"),
    desc: wy.bind("desc"),
  }),
  style: {
    root: {
      _: [
        "color: #4e9a06;",
        "font-family: sans-serif;",
      ],
      ':focused': [
        "background-color: #4e9a06;",
        "color: white;",
      ],
      ":hover": [
        "background-color: #73d216;",
        "color: white;",
      ]
    },
    icon: wy.cssFuse(CSS_COMMON_HATS, {
      _: [
        "display: inline-block;",
        "margin-right: 0.5em;",
        "margin-left: 0.4em;",
      ]
    }),
    label: [
      "display: inline-block;",
      "min-width: 3em;",
    ],
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
    postInit: function() {
      this.domNode.textContent = this.obj.toLocaleString();
    },
  }
});

}); // end define
