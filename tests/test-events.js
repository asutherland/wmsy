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

/**
 * Test wmsy event dispatching, mainly clicking.
 **/

define("wmsy-tests/test-events",
  [
    "wmsy/wmsy",
    "wmsy-plat/page-test-helper",
    "wmsy-plat/dom-test-helper",
    "wmsy-plat/statist-test-helper",
    "exports"
  ],
  function(wmsy, pth, dth, $sth, exports) {

var sendMouseEvent = dth.sendMouseEvent;

exports.__framework = $sth;

/**
 * - Clicking on a sub-element with a handler triggers the sub-element's handler
 *   and not the root (or the sibling).
 * - Clicking on a sub-element without a handler triggers the root handler.
 */
exports.testClickOnSubElement = function testClickOnSubElement(E) {
  var wy = new wmsy.WmsyDomain({id: "simple-widget", domain: "e-widget"});

  var clickEventBinder = E.defStateEvent("click",
                                         {this: true, args: ["target"]});

  wy.defineWidget({
    name: "simple-widget",
    constraint: {
      type: "simple-widget",
    },
    structure: {
      subA: "foo",
      subB: "bar",
      subC: "baz",
    },
    events: {
      subA: {
        click: clickEventBinder("subA"),
      },
      subB: {
        click: clickEventBinder("subB"),
      },
      root: {
        click: clickEventBinder("root"),
      }
    }
  });

  E.inPage(function(doc, win) {
    var emitter = wy.wrapElement(doc.getElementById("root"));
    var binding = emitter.emit({type: "simple-widget", obj: {}});

    E.wmsyBindingAsHierarchy(binding);

    E.round("click subA")
      .click("subA")
      .state({subA: [{this: binding, target: binding}]});

    E.round("click subC")
      .click("subC")
      .state({root: [{this: binding, target: binding}]});
  });
};

/**
 * - Clicking on a sub-widget triggers the closest owning widget handler; this
 *   means the sub-widget element itself as well as the root.
 */
exports.testClickOnSubWidget = function testClickOnSubWidget(E) {
  var wy = new wmsy.WmsyDomain({id: "subwidget", domain: "e-subwidget"});

  var clickEventBinder = E.defStateEvent("click",
                                         {this: true, args: ["target"]});

  wy.defineWidget({
    name: "sub-widget",
    constraint: {
      type: "sub-widget",
    },
    structure: {
      foo: "blah",
    },
    // no events in this guy
  });

  wy.defineWidget({
    name: "sub-widget-event-eater",
    constraint: {
      type: "sub-widget-event-eater",
    },
    structure: {
      foo: "blah",
    },
    events: {
      root: {
        click: clickEventBinder("subB:root"),
      }
    }
  });

  wy.defineWidget({
    name: "root-widget",
    constraint: {
      type: "root-widget",
    },
    structure: {
      subA: wy.subWidget({type: "sub-widget"}),
      subB: wy.subWidget({type: "sub-widget-event-eater"}),
      subC: wy.subWidget({type: "sub-widget"}),
    },
    events: {
      subA: {
        click: clickEventBinder("subA"),
      },
      subB: {
        click: clickEventBinder("subB"),
      },
      root: {
        click: clickEventBinder("root"),
      }
    }
  });

  E.inPage(function(doc, win) {
    var emitter = wy.wrapElement(doc.getElementById("root"));
    var bRoot = emitter.emit({type: "root-widget", obj: {}});

    E.wmsyBindingAsHierarchy(bRoot, ":");

    var bSubA = E.getSubWidgetAndNameIt("subA");
    var bSubB = E.getSubWidgetAndNameIt("subB"); // bRoot.subB_element.binding;
    var bSubC = E.getSubWidgetAndNameIt("subC");

    E.group("subA => subA handler on root widget");
    E.round("click subA's foo, trigger subA")
      .click(["subA", "foo"])
      .state({subA: [{this: bRoot, target: bSubA}]});
    // clicking on the root of the sub-widget should work too.  (one DOM node
    //  effectively shared by the two bindings, which is interesting).
    E.round("click subA, trigger subA")
      .click(["subA"])
      .state({subA: [{this: bRoot, target: bSubA}]});


    E.group("subB => root handler on subB widget");
    E.round("click subB's foo, trigger subB:root")
      .click(["subB", "foo"])
      .state({"subB:root": [{this: bSubB, target: bSubB}]});
    E.round("click subB, trigger subB:root")
      .click(["subB"])
      .state({"subB:root": [{this: bSubB, target: bSubB}]});

    E.group("subC => root handler on root widget");
    E.round("click subC's foo, trigger root")
      .click(["subC", "foo"])
      .state({root: [{this: bRoot, target: bSubC}]});
    E.round("click subC, trigger root")
      .click(["subC"])
      .state({root: [{this: bRoot, target: bSubC}]});
  });
};

/**
 * - Clicking on a sub-widget created by a widget-list should fire the
 *   sub-element handler on the parent widget's sub-element.
 */
exports.testClickOnWidgetList = function testClickOnWidgetList(E) {
  var wy = new wmsy.WmsyDomain({id: "widgetlist", domain: "e-widgetlist"});

  var clickEventBinder = E.defStateEvent("click",
                                         {this: true, args: ["target"]});

  wy.defineWidget({
    name: "sub-widget",
    constraint: {
      type: "sub-widget",
    },
    structure: {
      foo: "blah",
    },
    // no events in this guy
  });

  wy.defineWidget({
    name: "sub-widget-event-eater",
    constraint: {
      type: "sub-widget-event-eater",
    },
    structure: {
      foo: "blah",
    },
    events: {
      root: {
        click: clickEventBinder("subB:root"),
      }
    }
  });

  wy.defineWidget({
    name: "root-widget",
    constraint: {
      type: "root-widget",
    },
    structure: {
      subA: wy.widgetList({type: "sub-widget"}, "kids"),
      subB: wy.widgetList({type: "sub-widget-event-eater"}, "kids"),
      subC: wy.widgetList({type: "sub-widget"}, "kids"),
    },
    events: {
      subA: {
        click: clickEventBinder("subA"),
      },
      subB: {
        click: clickEventBinder("subB"),
      },
      root: {
        click: clickEventBinder("root"),
      },
    }
  });

  var obj = {
    kids: ["a", "b", "c"]
  };

  E.inPage(function(doc, win) {
    var emitter = wy.wrapElement(doc.getElementById("root"));
    var bRoot = emitter.emit({type: "root-widget", obj: obj});

    E.wmsyBindingAsHierarchy(bRoot, ":");

    E.group("subA list items => subA handler");
    var bSubAKidA = E.getSubWidgetAndNameIt(["subA", 0]),
        bSubAKidB = E.getSubWidgetAndNameIt(["subA", 1]);
    E.round("click subA's item 0's foo, trigger subA")
      .click(["subA", 0, "foo"])
      .state({subA: [{this: bRoot, target: bSubAKidA}]});
    E.round("click subA's item 0's root, trigger subA")
      .click(["subA", 0])
      .state({subA: [{this: bRoot, target: bSubAKidA}]});
    E.round("click subA's item 1's root, trigger subA")
      .click(["subA", 1])
      .state({subA: [{this: bRoot, target: bSubAKidB}]});

    E.group("subB list items => sub-widget handlers");
    var bSubBKidC = E.getSubWidgetAndNameIt(["subB", 2]);
    E.round("click subB's item 2's foo, trigger sub-widget handler")
      .click(["subB", 2, "foo"])
      .state({"subB:root": [{this: bSubBKidC, target: bSubBKidC}]});
    E.round("click subB's item 2's root, trigger sub-widget handler")
      .click(["subB", 2])
      .state({"subB:root": [{this: bSubBKidC, target: bSubBKidC}]});

    E.group("subC list items => root handler");
    var bSubCKidB = E.getSubWidgetAndNameIt(["subC", 1]);
    E.round("click subC's item 1's foo, trigger root handler")
      .click(["subC", 1, "foo"])
      .state({root: [{this: bRoot, target: bSubCKidB}]});
    E.round("click subC's item 1's root, trigger root handler")
      .click(["subC", 1, "foo"])
      .state({root: [{this: bRoot, target: bSubCKidB}]});
  });
};

}); // end define
