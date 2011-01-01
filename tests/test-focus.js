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
 * Test focus mechanisms,
 */

define("wmsy-tests/test-focus",
  [
    "wmsy/wmsy",
    "wmsy-plat/page-test-helper",
    "wmsy-plat/dom-test-helper",
    "exports"
  ],
  function(wmsy, pth, dth, exports) {

var sendKeyEvent = dth.sendKeyEvent;

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
  pth.makeTestPage(test, gotPage);
  function gotPage(doc, win) {
    var emitter = wy.wrapElement(doc.getElementById("root"));
    var binding = emitter.emit({type: "root", obj: objRoot});

    var fm = doc.wmsyFocusManager;
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
  pth.makeTestPage(test, gotPage);
  function gotPage(doc, win) {
    var emitter = wy.wrapElement(doc.getElementById("root"));
    var binding = emitter.emit({type: "root", obj: objRoot});

    var fm = doc.wmsyFocusManager;
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
      nested: wy.widgetList({type: "nested"}, "nested", {vertical: aVertical}),
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
  pth.makeTestPage(test, gotPage);
  function gotPage(doc, win) {
    var emitter = wy.wrapElement(doc.getElementById("root"));
    var binding = emitter.emit({type: "root", obj: objRoot});

    var fm = doc.wmsyFocusManager;
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

exports.testVertListsInHorizContainer =
    function testVertListsInHorizContainer(test) {
  var wy = new wmsy.WmsyDomain({id: "f-vertinhoriz", domain: "f-vertinhoriz"});
  wy.defineWidget({
    name: "root",
    focus: wy.focus.domain.horizontal("i1", "i2"),
    constraint: {
      type: "root",
    },
    structure: {
      i1: wy.vertList({type: "item"}, "items1"),
      i2: wy.vertList({type: "item"}, "items2"),
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
    items1: [{id: "a1"}, {id: "a2"}],
    items2: [{id: "b1"}, {id: "b2"}],
  };

  test.waitUntilDone();
  pth.makeTestPage(test, gotPage);
  function gotPage(doc, win) {
    var emitter = wy.wrapElement(doc.getElementById("root"));
    var binding = emitter.emit({type: "root", obj: objRoot});

    var fm = doc.wmsyFocusManager;
    var push = bindPush(binding.domNode);

    // initial focus on a1, vertical things should work in-list
    test.assertEqual(fm.focusedBinding.obj.id, "a1");
    push.down();
    test.assertEqual(fm.focusedBinding.obj.id, "a2");
    // but over-stepping should not do anything...
    push.down();
    test.assertEqual(fm.focusedBinding.obj.id, "a2");

    // and then going to the right should work correctly
    push.right();
    test.assertEqual(fm.focusedBinding.obj.id, "b1");
    push.up();
    test.assertEqual(fm.focusedBinding.obj.id, "b1");
    push.down();
    test.assertEqual(fm.focusedBinding.obj.id, "b2");
    push.left();
    test.assertEqual(fm.focusedBinding.obj.id, "a1");

    test.done();
  }
};

/**
 * Vertical list of widgets where each widget has a list of messages on the
 *  right and a single contact on the left.  Vertical focus changes on the
 *  messages should hop to the next set of messages while vertical focus
 *  changes amongst the contacts.
 */
exports.testTwoTierNestedFocus = function testTwoTierNestedFocus(test) {
  var wy = new wmsy.WmsyDomain({id: "f-ttnested", domain: "f-ttnested"});

  wy.defineWidget({
    name: "root",
    focus: wy.focus.domain.vertical("clusters"),
    constraint: {
      type: "root",
    },
    structure: {
      clusters: wy.vertList({type: "message-cluster"}, "clusters"),
    },
  });
  wy.defineWidget({
    name: "message-cluster",
    focus: wy.focus.container.horizontal("contact", "messages"),
    constraint: {
      type: "message-cluster",
    },
    structure: {
      contact: wy.widget({type: "contact"}, "contact"),
      messages: wy.vertList({type: "message"}, "messages"),
    },
  });
  wy.defineWidget({
    name: "contact",
    focus: wy.focus.item,
    constraint: {
      type: "contact",
    },
    structure: {
      label: wy.bind("id"),
    },
  });
  wy.defineWidget({
    name: "message",
    focus: wy.focus.item,
    constraint: {
      type: "message",
    },
    structure: {
      label: wy.bind("id"),
    },
  });

  var objRoot = {
    clusters: [
      {
        id: "cl1",
        contact: {id: "a"},
        messages: [{id: "a1"}, {id: "a2"}]
      },
      {
        id: "cl2",
        contact: {id: "b"},
        messages: [{id: "b1"}]
      },
      {
        id: "cl3",
        contact: {id: "c"},
        messages: []
      },
      {
        id: "cl4",
        contact: {id: "d"},
        messages: [{id: "d1"}]
      }
    ]
  };

  test.waitUntilDone();
  pth.makeTestPage(test, gotPage);
  function gotPage(doc, win) {
    var emitter = wy.wrapElement(doc.getElementById("root"));
    var binding = emitter.emit({type: "root", obj: objRoot});

    var fm = doc.wmsyFocusManager;
    var push = bindPush(binding.domNode);

    // initial focus should be contact 'a'
    test.assertEqual(fm.focusedBinding.obj.id, "a");

    // down gets us to contact 'b'
    push.down();
    test.assertEqual(fm.focusedBinding.obj.id, "b");

    // move right to get into b's messages...
    push.right();
    test.assertEqual(fm.focusedBinding.obj.id, "b1");

    // up gets us to the last of a's messages...
    push.up();
    test.assertEqual(fm.focusedBinding.obj.id, "a2");

    // left gets us back to contact 'a'
    push.left();
    test.assertEqual(fm.focusedBinding.obj.id, "a");

    // going right again will put us on a1; we did not save our position.
    push.right();
    test.assertEqual(fm.focusedBinding.obj.id, "a1");

    // let's go down and hope that we end up at d1 bypassing c entirely...
    push.down(); // => a2
    test.assertEqual(fm.focusedBinding.obj.id, "a2");
    push.down(); // => b1
    test.assertEqual(fm.focusedBinding.obj.id, "b1");
    push.down(); // => hopefully d1
    test.assertEqual(fm.focusedBinding.obj.id, "d1");

    test.done();
  }
};

/**
 * Have the root element not have a focus domain.
 */
exports.testDeepDownDomains = function testDeepDownDomains(test) {
  var wy = new wmsy.WmsyDomain({id: "f-deepdomain", domain: "f-deepdomain"});
  wy.defineWidget({
    name: "root",
    constraint: {
      type: "root",
    },
    structure: {
      focusy: wy.widget({type: "focusy"}, "focusy"),
    },
  });
  wy.defineWidget({
    name: "focusy",
    focus: wy.focus.domain.vertical("blah"),
    constraint: {
      type: "focusy",
    },
    structure: {
      blah: wy.widget({type: "blah"}, "blah"),
    }
  });
  wy.defineWidget({
    name: "blah",
    focus: wy.focus.item,
    constraint: {
      type: "blah",
    },
    structure: {
      label: wy.bind("id"),
    }
  });

  var objRoot = {
    focusy: {
      blah: {
        id: "blih",
      }
    }
  };

  test.waitUntilDone();
  pth.makeTestPage(test, gotPage);
  function gotPage(doc, win) {
    var emitter = wy.wrapElement(doc.getElementById("root"));
    var binding = emitter.emit({type: "root", obj: objRoot});

    var fm = doc.wmsyFocusManager;

    test.assertEqual(fm.focusedBinding.obj.id, "blih");

    test.done();
  }
};

/**
 * Handle the case where there is initially nothing focusable, then we have
 *  something focusable but it gets destroyed, then we have something focusable.
 */

/**
 * Test that killing off the active focus domain correctly transfers the active
 *  focus domain status elsewhere.
 */

/**
 * Two independent vertical focus domains.
 */
/*
exports.xestTwoVerticalDomains = function testTwoVerticalDomains(test) {
  var wy = new wmsy.WmsyDomain({id: "f-twovdomains", domain: "f-twovdomains"});

};

exports.xestNestedItems = function testNestedItems(test) {
  var wy = new wmsy.WmsyDomain({id: "f-nesteditem", domain: "f-nesteditem"});

};
*/

/**
 * Test that we can imitate traditional tree-focus.
 */
/*
exports.xestTreeFocus = function testTreeFocus(test) {
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
*/

}); // end define
