/**
 * Test focus mechanisms,
 */

/**
 * Simple setup with just focusable items in a vertical widget list.
 */
exports.testSimpleFocus = function testSimpleFocus(test) {
  var wy = new wmsy.WmsyDomain({id: "f-simple", domain: "f-simple"});

  wy.defineWidget({
    name: "container",
    constraint: {
      type: "root",
    },
    structure: {
      items: wy.widgetList({type: "item"}, "items"),
    },
  });
  wy.defineWidget({
    name: "item",
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



    test.done();
  }
};

/**
 * Vertical list of vertical lists whose items are the only focusable things.
 */
exports.testSimpleNestedFocus = function testSimpleNestedFocus(test) {
  var wy = new wmsy.WmsyDomain({id: "f-nested", domain: "f-nested"});

};

/**
 * Vertical list of widgets where each widget has a list of messages on the
 *  right and a single contact on the left.  Vertical focus changes on the
 *  messages should hop to the next set of messages while vertical focus
 *  changes amongst the contacts.
 */
exports.testTwoTierNestedFocus = function testTwoTierNestedFocus(test) {
  var wy = new wmsy.WmsyDomain({id: "f-ttnested", domain: "f-ttnested"});

};

/**
 * Two independent vertical focus domains.
 */
exports.testTwoVerticalDomains = function testTwoVerticalDomains(test) {
  var wy = new wmsy.WmsyDomain({id: "f-twovdomains", domain: "f-twovdomains"});

};

/**
 * Test that we can imitate traditional tree-focus.
 */
exports.testTreeFocus = function testTreeFocus(test) {
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
exports.testPopupFocus = function testPopupFocus(test) {

};
