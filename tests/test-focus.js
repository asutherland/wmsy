/**
 * Test focus mechanisms,
 */

var Pages = require("page-worker");

var wmsy = require("wmsy/wmsy");

var sendKeyEvent = require("wmsy/dom-test-helper").sendKeyEvent;

function bindPush(aDomNode, aVertical) {
  return {
    up: function() {
      sendKeyEvent(aDomNode, 0, 38, false);
    },
    down: function() {
      sendKeyEvent(aDomNode, 0, 40, false);
    },
    left: function() {
      sendKeyEvent(aDomNode, 0, 37, false);
    },
    right: function() {
      sendKeyEvent(aDomNode, 0, 39, false);
    },
    more: function() {
      sendKeyEvent(aDomNode, 0, aVertical ? 40 : 39);
    },
    less: function() {
      sendKeyEvent(aDomNode, 0, aVertical ? 38 : 37);
    }
  };
}

function baseListFocus(test, aVertical) {
  var vertString = aVertical ? "vertical" : "horizontal";

  var wy = new wmsy.WmsyDomain({id: "f-list-" + vertString,
                                domain: "f-list-" + vertString});

  wy.defineWidget({
    name: "container",
    focus: wy.focus.domain[vertString]("items"),
    constraint: {
      type: "root",
    },
    structure: {
      items: wy.widgetList({type: "item"}, "items", {vertical: aVertical}),
    },
  });
  wy.defineWidget({
    name: "item",
    focus: wy.focus.item,
    constraint: {
      type: "item",
    },
    structure: {
      label: wy.bind("id"),
    },
  });

  var objs = {
    a: {id: "a"},
    b: {id: "b"},
    c: {id: "c"},
  };

  var objRoot = {
    items: [objs.a, objs.b, objs.c],
  };

  test.waitUntilDone();

  var page = Pages.add(Pages.Page({
    onReady: check,
    content: "<div id='root'></div>",
  }));

  function check() {
    var emitter = wy.wrapElement(page.document.getElementById("root"));
    var binding = emitter.emit({type: "root", obj: objRoot});

    var fm = page.document.wmsyFocusManager;
    var push = bindPush(binding.domNode, aVertical);

    // 'a' should be focused by default
    test.assertEqual(fm.focusedBinding.obj.id, "a");

    // push down and get to 'b'
    push.more();
    test.assertEqual(fm.focusedBinding.obj.id, "b");

    // push down and get to 'c'
    push.more();
    test.assertEqual(fm.focusedBinding.obj.id, "c");

    // push down and stay on 'c'
    push.more();
    test.assertEqual(fm.focusedBinding.obj.id, "c");

    // push up and get to 'b'
    push.less();
    test.assertEqual(fm.focusedBinding.obj.id, "b");

    // push up and get to 'a'
    push.less();
    test.assertEqual(fm.focusedBinding.obj.id, "a");

    // push up and stay on 'a'
    push.less();
    test.assertEqual(fm.focusedBinding.obj.id, "a");

    test.done();
  }
};

/**
 * Simple setup with just focusable items in a vertical widget list.
 */
exports.testVertListFocus = function testVertListFocus(test) {
  baseListFocus(test, true);
};

exports.testHorizListFocus = function testHorizListFocus(test) {
  baseListFocus(test, false);
};


/**
 * Vertical list of vertical lists whose items are the only focusable things.
 */
exports.xtestSimpleNestedFocus = function testSimpleNestedFocus(test) {
  var wy = new wmsy.WmsyDomain({id: "f-nested", domain: "f-nested"});

};

/**
 * Vertical list of widgets where each widget has a list of messages on the
 *  right and a single contact on the left.  Vertical focus changes on the
 *  messages should hop to the next set of messages while vertical focus
 *  changes amongst the contacts.
 */
exports.xtestTwoTierNestedFocus = function testTwoTierNestedFocus(test) {
  var wy = new wmsy.WmsyDomain({id: "f-ttnested", domain: "f-ttnested"});

};

/**
 * Two independent vertical focus domains.
 */
exports.xtestTwoVerticalDomains = function testTwoVerticalDomains(test) {
  var wy = new wmsy.WmsyDomain({id: "f-twovdomains", domain: "f-twovdomains"});

};

exports.xtestNestedItems = function testNestedItems(test) {
  var wy = new wmsy.WmsyDomain({id: "f-nesteditem", domain: "f-nesteditem"});

};

/**
 * Test that we can imitate traditional tree-focus.
 */
exports.xtestTreeFocus = function testTreeFocus(test) {
  var wy = new wmsy.WmsyDomain({id: "f-tree", domain: "f-tree"});

  wy.defineWidget({
    name: "tree-node",
    constraint: {
      type: "node",
    },
    structure: {
      label: wy.bind("name"),
    }
  });

  var objRoot = {
    label: "root",
    children: [
      {
        label: "a",
        children: [],
      },
      {
        label: "b",
        children: [
          {
            label: "b1",
            children: [],
          },
          {
            label: "b2",
            children: [],
          }
        ]
      },
      {
        label: "c",
        children: [],
      }
    ],
  };

};

/**
 * Trigger a popup that has its own focus domain or what not going on and make
 *  sure that:
 * - Moving focus around inside the popup works
 * - The focus state of the document remains unchanged, especially when we go
 *   back.
 */
exports.xtestPopupFocus = function testPopupFocus(test) {

};
