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

require.def("wmsy-tests/test-events",
  [
    "wmsy/wmsy",
    "wmsy-plat/page-test-helper",
    "wmsy-plat/dom-test-helper",
    "exports"
  ],
  function(wmsy, pth, dth, exports) {

var sendMouseEvent = dth.sendMouseEvent;

/**
 * - Clicking on a sub-element with a handler triggers the sub-element's handler
 *   and not the root (or the sibling).
 * - Clicking on a sub-element without a handler triggers the root handler.
 */
exports.testClickOnSubElement = function testClickOnSubElement(test) {
  var wy = new wmsy.WmsyDomain({id: "simple-widget", domain: "e-widget"});

  var clickedA = false, clickedB = false, clickedRoot = false;

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
        click: function() {
          clickedA = true;
        },
      },
      subB: {
        click: function() {
          clickedB = true;
        }
      },
      root: {
        click: function() {
          clickedRoot = true;
        }
      }
    }
  });

  test.waitUntilDone();
  pth.makeTestPage(test, gotPage);
  function gotPage(doc, win) {
    var emitter = wy.wrapElement(doc.getElementById("root"));
    var binding = emitter.emit({type: "simple-widget", obj: {}});

    test.assert(binding, "Binding created?");

    sendMouseEvent({type: "click"}, binding.subA_element, win);
    test.assert(clickedA, "subA should get a click event");
    test.assert(!clickedB, "subB should not get a click event");
    test.assert(!clickedRoot, "root should not get a click event");

    clickedA = false;
    sendMouseEvent({type: "click"}, binding.subC_element, win);
    test.assert(!clickedA, "subA should not get a click event");
    test.assert(!clickedB, "subB should not get a click event");
    test.assert(clickedRoot, "root should get a click event");

    test.done();
  }
};

/**
 * - Clicking on a sub-widget triggers the closest owning widget handler; this
 *   means the sub-widget element itself as well as the root.
 */
exports.testClickOnSubWidget = function testClickOnSubWidget(test) {
  var wy = new wmsy.WmsyDomain({id: "subwidget", domain: "e-subwidget"});

  var clickedA = false, clickedB = false, clickedSubB = false,
      clickedRoot = false;
  var eventThis = null, eventTargetBinding = null;

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
        click: function (targetBinding) {
          clickedSubB = true;
          eventThis = this;
          eventTargetBinding = targetBinding;
        }
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
        click: function(targetBinding) {
          clickedA = true;
          eventThis = this;
          eventTargetBinding = targetBinding;
        },
      },
      subB: {
        click: function(targetBinding) {
          clickedB = true;
          eventThis = this;
          eventTargetBinding = targetBinding;
        }
      },
      root: {
        click: function(targetBinding) {
          clickedRoot = true;
          eventThis = this;
          eventTargetBinding = targetBinding;
        }
      }
    }
  });

  test.waitUntilDone();
  pth.makeTestPage(test, gotPage);
  function gotPage(doc, win) {
    var emitter = wy.wrapElement(doc.getElementById("root"));
    var bRoot = emitter.emit({type: "root-widget", obj: {}});

    test.assert(bRoot, "Binding created?");

    // - sub A => subA handler
    var bSubA = bRoot.subA_element.binding;
    function checkA() {
      test.assert(clickedA, "subA should get a click event");
      test.assert(!clickedB, "subB should not get a click event");
      test.assert(!clickedSubB, "subB sub-widget should not get a click event");
      test.assert(!clickedRoot, "root should not get a click event");
      test.assertEqual(eventThis, bRoot, "this should be root binding's");
      test.assertEqual(eventTargetBinding, bSubA,
                       "target binding should be subA");
      clickedA = false; // clean up
    }
    // clicking on "foo" under subA should trigger subA
    sendMouseEvent({type: "click"}, bSubA.foo_element, win);
    checkA();
    // clicking on the root of the sub-widget should work too.  (one DOM node
    //  effectively shared by the two bindings, which is interesting).
    sendMouseEvent({type: "click"}, bSubA.domNode, win);
    checkA();

    // - sub B => sub-widget handler
    var bSubB = bRoot.subB_element.binding;
    function checkSubB() {
      test.assert(!clickedA, "subA should not get a click event");
      test.assert(!clickedB, "subB should not get a click event");
      test.assert(clickedSubB, "subB sub-widget should get a click event");
      test.assert(!clickedRoot, "root should get a click event");
      test.assertEqual(eventThis, bSubB, "this should be subB's binding");
      test.assertEqual(eventTargetBinding, bSubB,
                       "target binding should be subB");
      clickedSubB = false; // clean up
    }
    sendMouseEvent({type: "click"}, bSubB.foo_element, win);
    checkSubB();
    sendMouseEvent({type: "click"}, bSubB.domNode, win);
    checkSubB();

    // - sub C => root handler
    function checkRoot() {
      test.assert(!clickedA, "subA should not get a click event");
      test.assert(!clickedB, "subB should not get a click event");
      test.assert(!clickedSubB, "subB sub-widget should not get a click event");
      test.assert(clickedRoot, "root should get a click event");
      test.assertEqual(eventThis, bRoot, "this should be root binding's");
      test.assertEqual(eventTargetBinding, bSubC,
                       "target binding should be subC");
      clickedRoot = false; // clean up
    }
    var bSubC = bRoot.subC_element.binding;
    // clicking on "foo" under subC should trigger root's root.
    sendMouseEvent({type: "click"}, bSubC.foo_element, win);
    checkRoot();
    // likewise just on subC
    sendMouseEvent({type: "click"}, bSubC.domNode, win);
    checkRoot();

    test.done();
  }
};

/**
 * - Clicking on a sub-widget created by a widget-list should fire the
 *   sub-element handler on the parent widget's sub-element.
 */
exports.testClickOnWidgetList = function testClickOnWidgetList(test) {
  var wy = new wmsy.WmsyDomain({id: "widgetlist", domain: "e-widgetlist"});

  var clickedA = false, clickedB = false, clickedSubB = false,
      clickedRoot = false;
  var eventThis = null, eventTargetBinding = null;

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
        click: function (targetBinding) {
          clickedSubB = true;
          eventThis = this;
          eventTargetBinding = targetBinding;
        }
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
        click: function(targetBinding) {
          clickedA = true;
          eventThis = this;
          eventTargetBinding = targetBinding;
        },
      },
      subB: {
        click: function(targetBinding) {
          clickedB = true;
          eventThis = this;
          eventTargetBinding = targetBinding;
        }
      },
      root: {
        click: function(targetBinding) {
          clickedRoot = true;
          eventThis = this;
          eventTargetBinding = targetBinding;
        }
      }
    }
  });

  var obj = {
    kids: ["a", "b", "c"]
  };

  test.waitUntilDone();
  pth.makeTestPage(test, gotPage);
  function gotPage(doc, win) {
    var emitter = wy.wrapElement(doc.getElementById("root"));
    var bRoot = emitter.emit({type: "root-widget", obj: obj});

    test.assert(bRoot, "Binding created?");

    // - sub A => subA handler
    var eSubA = bRoot.subA_element;
    var bSubAkidA = eSubA.children[0].binding;
    test.assertEqual(bSubAkidA.obj, "a");
    function checkA(kidBinding) {
      test.assert(clickedA, "subA should get a click event");
      test.assert(!clickedB, "subB should not get a click event");
      test.assert(!clickedSubB, "subB sub-widget should not get a click event");
      test.assert(!clickedRoot, "root should not get a click event");
      test.assertEqual(eventThis, bRoot, "this should be root binding's");
      test.assertEqual(eventTargetBinding, kidBinding,
                       "target binding obj should be desired kid binding");
      clickedA = false; // clean up
    }
    // clicking on "foo" under subA's kid A should trigger subA
    sendMouseEvent({type: "click"}, bSubAkidA.foo_element, win);
    checkA(bSubAkidA);
    // kid A's root too...
    sendMouseEvent({type: "click"}, bSubAkidA.domNode, win);
    checkA(bSubAkidA);
    // kid B too...
    var bSubAkidB = eSubA.children[1].binding;
    test.assertEqual(bSubAkidB.obj, "b");
    sendMouseEvent({type: "click"}, bSubAkidB.foo_element, win);
    checkA(bSubAkidB);
    // kid A's root too...
    sendMouseEvent({type: "click"}, bSubAkidB.domNode, win);
    checkA(bSubAkidB);


    // - sub B => sub-widget handler
    var eSubB = bRoot.subB_element;
    var bSubBkidC = eSubB.children[2].binding;
    function checkSubB() {
      test.assert(!clickedA, "subA should not get a click event");
      test.assert(!clickedB, "subB should not get a click event");
      test.assert(clickedSubB, "subB sub-widget should get a click event");
      test.assert(!clickedRoot, "root should get a click event");
      test.assertEqual(eventThis, bSubBkidC, "this should be b-c's binding");
      test.assertEqual(eventTargetBinding, bSubBkidC,
                       "target binding should be subBkidC");
      clickedSubB = false; // clean up
    }
    sendMouseEvent({type: "click"}, bSubBkidC.foo_element, win);
    checkSubB();
    sendMouseEvent({type: "click"}, bSubBkidC.domNode, win);
    checkSubB();

    // - sub C => root handler
    var eSubC = bRoot.subC_element;
    var bSubCkidB = eSubC.children[1].binding;
    function checkRoot() {
      test.assert(!clickedA, "subA should not get a click event");
      test.assert(!clickedB, "subB should not get a click event");
      test.assert(!clickedSubB, "subB sub-widget should not get a click event");
      test.assert(clickedRoot, "root should get a click event");
      test.assertEqual(eventThis, bRoot, "this should be root binding's");
      test.assertEqual(eventTargetBinding, bSubCkidB,
                       "target binding should be subC");
      clickedRoot = false; // clean up
    }
    // clicking on "foo" under subC should trigger root's root.
    sendMouseEvent({type: "click"}, bSubCkidB.foo_element, win);
    checkRoot();
    // likewise just on subC
    sendMouseEvent({type: "click"}, bSubCkidB.domNode, win);
    checkRoot();

    test.done();
  }
};

}); // end require.def
