/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at:
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is Mozilla Messaging Code.
 *
 * The Initial Developer of the Original Code is
 *   The Mozilla Foundation
 * Portions created by the Initial Developer are Copyright (C) 2010
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Andrew Sutherland <asutherland@asutherland.org>
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

/**
 * Kickstarts the debug UI.
 **/

define("wmsy/debugui/app",
  [
    "wmsy/wmsy",
    "wmsy/debugui/dusi-vis-decision-space",
    "exports",
  ],
  function (
    $wmsy,
    $vis_decision_space,
    exports
  ) {

var wy = exports.wy = new $wmsy.WmsyDomain({id: "app",
                                            domain: "wmsy-debug",
                                            clickToFocus: true});

wy.defineWidget({
  name: "debug-ui-root-menu",
  doc: "The Debug UI's root menu.",
  focus: wy.focus.domain.vertical("closeButton", "tools"),
  constraint: {
    type: "ui-root-menu",
  },
  popups: {
    tool: {
      popupWidget: wy.libWidget({type: "popup"}),
      constraint: {
        type: "tool",
      },
      clickAway: true,
      position: {
        leftAlign: "root",
        topAlign: "root",
      },
    },
  },
  structure: {
    closeButton: wy.button("Close"),
    toolsLabel: "Tools:",
    tools: wy.vertList({type: "ui-root-menu-item"}, "tools"),
  },
  events: {
    closeButton: {
      command: function() {
        this.destroy();
        this.domNode.parentNode.removeChild(this.domNode);
      }
    },
    tools: {
      command: function(binding) {
        var toolInvocObj = {
          // pull the tool id out of the menu's bound object
          id: binding.obj.id,
          // and give the tool the domain...
          domain: this.obj.domain,
        };
        this.popup_tool(toolInvocObj, this, function() {
          // actually, we don't care when the popup goes away
        });
      },
    },
  },
  style: {
    root: [
      "position: absolute;",
      "left: 20px;",
      "top: 20px;",
      "border: 10px solid rgba(192, 192, 192, 0.6);",
      "border-radius: 4px;",
      "background-color: black;",
      "color: white;",
      "width: 30em;",
    ],
  }
});

wy.defineWidget({
  name: "debug-ui-root-menu-item",
  doc: "Menu items for the root debug UI menu.",
  constraint: {
    type: "ui-root-menu-item",
  },
  focus: wy.focus.item,
  structure: {
    name: wy.bind("name"),
    desc: wy.bind("desc"),
  },
  style: {
    root: {
      ":focused": [
        "background-color: #444444;",
        "border: 1px solid white;",
      ],
    },
    name: [
      "font-size: 150%;",
      "display: block;",
    ],
    desc: [
      "color: gray;",
    ],
  }
});

var DebugUI = {
  tools: [
    {
      name: "Visualize Decision Tree",
      desc: "Show a tree visualization of the decision space's " +
              "current decision tree and which branches are referenced " +
              "by partials.",
      id: "vis-decision-tree",
    }
  ],
};

/**
 * Inject the menu UI-ish thing into the document.  It wants to be an
 *  absolutely positioned floating thing rooted at the top of the document in
 *  order to (hopefully) try and avoid screwing with whatever else is going on
 *  in the document.
 */
exports.showDebugUIForDomain = function showDebugUIForDomain(doc, domain) {
  var bodyElem = doc.body;

  var rootObj = {
    tools: DebugUI.tools,
    domain: domain,
  };

  var emitter = wy.wrapElement(bodyElem);
  emitter.emit({type: "ui-root-menu", obj: rootObj});
};

}); // end define
