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

/**
 * Parameterizable test where all we have is a widget list of focusable items
 *  inside a single domain.
 */
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

exports.testVertListFocus = function testVertListFocus(test) {
  baseListFocus(test, true);
};

exports.testHorizListFocus = function testHorizListFocus(test) {
  baseListFocus(test, false);
};

/**
 * Parameterizable test where all we have is a widget that is a focus domain
 *  that has a bunch of sub-widgets that are focusable.
 */
function baseWidgetFocus(test, aVertical) {
  var vertString = aVertical ? "vertical" : "horizontal";

  var wy = new wmsy.WmsyDomain({id: "f-widget-" + vertString,
                                domain: "f-widget-" + vertString});

  wy.defineWidget({
    name: "container",
    focus: wy.focus.domain[vertString]("a", "b", "c"),
    constraint: {
      type: "root",
    },
    structure: {
      a: wy.widget({type: "item"}, "a"),
      c: wy.widget({type: "item"}, "c"), // intentionally out of sequence
      b: wy.widget({type: "item"}, "b"),
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

  var objRoot = {
    a: {id: "a"},
    b: {id: "b"},
    c: {id: "c"},
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

}

exports.testVertWidgetFocus = function testVertListFocus(test) {
  baseWidgetFocus(test, true);
};

exports.testHorizWidgetFocus = function testHorizListFocus(test) {
  baseWidgetFocus(test, false);
};


/**
 * All same-orientation same-domain mixture.
 */
function baseNestedListFocus(test, aVertical) {
  var vertString = aVertical ? "vertical" : "horizontal";

  var wy = new wmsy.WmsyDomain({id: "f-nestedlist-" + vertString,
                                domain: "f-nestedlist-" + vertString});

  wy.defineWidget({
    name: "root",
    focus: wy.focus.domain[vertString]("items", "nested"),
    constraint: {
      type: "root",
    },
    structure: {
      items: wy.widgetList({type: "item"}, "items", {vertical: aVertical}),
      nested: wy.widgetList({type: "nested"}, "nested"),
    },
  });
  wy.defineWidget({
    name: "nested",
    focus: wy.focus.container[vertString]("i1", "thing", "i2"),
    constraint: {
      type: "nested",
    },
    structure: {
      i1: wy.widgetList({type: "item"}, "items1", {vertical: aVertical}),
      thing: wy.widget({type: "item"}, "thing"),
      i2: wy.widgetList({type: "item"}, "items2", {vertical: aVertical}),
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

  var objRoot = {
    items: [{id: "a"}, {id: "b"}],
    nested: [
      {
        id: "kid1",
        items1: [{id: "c"}],
        thing: {id: "d"},
        items2: [],
      },
      {
        id: "kid2",
        items1: [],
        thing: {id: "e"},
        items2: [{id: "f"}, {id: "g"}],
      }
    ],
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

    var letters = ["a", "b", "c", "d", "e", "f", "g"], i;
    for (i = 0; i < letters.length; i++) {
      test.assertEqual(fm.focusedBinding.obj.id, letters[i]);
      push.more();
    }
    for (i = letters.length - 1; i >= 0; i--) {
      test.assertEqual(fm.focusedBinding.obj.id, letters[i]);
      push.less();
    }
    push.less();
    test.assertEqual(fm.focusedBinding.obj.id, "a");

    test.done();
  }

}

exports.testVertNestedListFocus = function testVertNestedListFocus(test) {
  baseNestedListFocus(test, true);
};
exports.testHorizNestedListFocus = function testHorizNestedListFocus(test) {
  baseNestedListFocus(test, false);
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
