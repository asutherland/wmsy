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
 * This file tests the emit/receive/relay rendezvous and transmission
 *  mechanisms.  Besides making sure things get wired up correctly initially,
 *  we also want to make sure that dynamic changes are also handled.
 */

define("wmsy-tests/test-emit-receive",
            ["wmsy/wmsy", "wmsy-plat/page-test-helper", "exports"],
            function(wmsy, pth, exports) {

/**
 * A one-to-one emit/receive ancestor/descendent relationship.
 */
exports.testOneToOneEmitReceive = function testOneToOneEmitReceive(test) {
  var wy = new wmsy.WmsyDomain({id: "er-oto", domain: "er-oto"});

  var topHeard, bottomAlphaHeard, bottomBetaHeard;

  wy.defineWidget({
    name: "top",
    constraint: {
      type: "top",
    },
    structure: {
      middle: wy.widget({type: "middle"}, "middle"),
    },
    emit: ["topSays"],
    receive: {
      bottomSays: function(aWhat) {
        topHeard = aWhat;
      }
    }
  });
  // interpose an intermediate binding to make sure adjacency is not required
  wy.defineWidget({
    name: "middle-inert",
    constraint: {
      type: "middle",
    },
    structure: {
      bottom: wy.widget({type: "bottom"}, "bottom"),
    }
  });
  wy.defineWidget({
    name: "bottom-alpha",
    constraint: {
      type: "bottom",
      obj: {kind: "alpha"},
    },
    structure: "blah",
    emit: ["bottomSays"],
    receive: {
      topSays: function(aWhat) {
        bottomAlphaHeard = aWhat;
      }
    }
  });
  wy.defineWidget({
    name: "bottom-beta",
    constraint: {
      type: "bottom",
      obj: {kind: "beta"},
    },
    structure: "blah",
    emit: ["bottomSays"],
    receive: {
      topSays: function(aWhat) {
        bottomBetaHeard = aWhat;
      }
    }
  });

  var obj = {
    middle: {
      bottom: {
        kind: "alpha"
      }
    }
  };

  test.waitUntilDone();
  pth.makeTestPage(test, gotPage);
  function gotPage(doc, win) {
    var emitter = wy.wrapElement(doc.getElementById("root"));

    var top = emitter.emit({type: "top", obj: obj});
    var bottom = top.middle_element.binding.bottom_element.binding;
    topHeard = bottomAlphaHeard = bottomBetaHeard = null;

    // - down link
    top.emit_topSays("what what");
    test.assertEqual(bottomAlphaHeard, "what what");
    test.assertEqual(topHeard, null);
    test.assertEqual(bottomBetaHeard, null);
    topHeard = bottomAlphaHeard = bottomBetaHeard = null;

    // - up link
    bottom.emit_bottomSays("robomodon");
    test.assertEqual(topHeard, "robomodon");
    test.assertEqual(bottomAlphaHeard, null);
    test.assertEqual(bottomBetaHeard, null);
    topHeard = bottomAlphaHeard = bottomBetaHeard = null;

    // - cause bottom to get rebound by an update
    obj.middle.bottom.kind = "beta";
    top.update();
    top.emit_topSays("alpha blocker");
    test.assertEqual(bottomBetaHeard, "alpha blocker");
    test.assertEqual(topHeard, null);
    test.assertEqual(bottomAlphaHeard, null);

    // (It's not particularly interesting to cause 'top' to be rebound because
    // that will necessarily destroy all its children so it just ends up being
    // the initial case again.)

    test.done();
  }
};

/**
 * One-to-one sibling/cousin relationship mediated by use of 'relay'.
 */
exports.testOneToOneRelay = function testOneToOneRelay(test) {
  var wy = new wmsy.WmsyDomain({id: "er-oto-relay", domain: "er-oto-relay"});

  var rightSaid, rightHandHeard, rightHookHeard;

  wy.defineWidget({
    name: "root",
    constraint: {
      type: "root"
    },
    relay: ["rightSays", "leftSays"],
    structure: {
      left: wy.widget({type: "left"}, "left"),
      right: wy.widget({type: "right"}, "right"),
    },
  });
  wy.defineWidget({
    name: "left",
    constraint: {
      type: "left",
    },
    structure: "lefty",
    emit: ["leftSays"],
    receive: {
      rightSays: function(aWhat) {
        rightSaid = aWhat;
      }
    }
  });
  wy.defineWidget({
    name: "right-hand",
    constraint: {
      type: "right",
      obj: {kind: "hand"},
    },
    structure: "righty",
    emit: ["rightSays"],
    receive: {
      leftSays: function(aWhat) {
        rightHandHeard = aWhat;
      }
    }
  });
  wy.defineWidget({
    name: "right-hook",
    constraint: {
      type: "right",
      obj: {kind: "hook"},
    },
    structure: "hooky",
    emit: ["rightSays"],
    receive: {
      leftSays: function(aWhat) {
        rightHookHeard = aWhat;
      }
    }
  });

  var obj = {
    left: {
    },
    right: {
      kind: "hand",
    }
  };

  test.waitUntilDone();
  pth.makeTestPage(test, gotPage);
  function gotPage(doc, win) {
    var emitter = wy.wrapElement(doc.getElementById("root"));

    var root = emitter.emit({type: "root", obj: obj});
    var left = root.left_element.binding;
    var right = root.right_element.binding;
    rightSaid = rightHandHeard = rightHookHeard = null;

    left.emit_leftSays("wait for it...");
    test.assertEqual(rightHandHeard, "wait for it...");
    test.assertEqual(rightSaid, null);
    test.assertEqual(rightHookHeard, null);
    rightSaid = rightHandHeard = rightHookHeard = null;

    right.emit_rightSays("fred");
    test.assertEqual(rightSaid, "fred");
    test.assertEqual(rightHandHeard, null);
    test.assertEqual(rightHookHeard, null);
    rightSaid = rightHandHeard = rightHookHeard = null;

    // - rebind right...
    obj.right.kind = "hook";
    root.update();
    left.emit_leftSays("was it worth it?");
    test.assertEqual(rightHookHeard, "was it worth it?");
    test.assertEqual(rightSaid, null);
    test.assertEqual(rightHandHeard, null);

    test.done();
  }
};

/**
 * Have a binding that uses two orthogonal signals that talk to different
 *  bindings, one direct, one via relay, both with multi binds.  Dynamically
 *  change the many bindings in the process too.
 * This proves:
 * - Our connection code handles multiple signals orthogonally...
 * - We actually use a list and iterate for notifications...
 * - Our dynamic changes in the face of list changes are competent...
 */
exports.testComplexEmitReceive = function testComplexEmitReceive(test) {
  var wy = new wmsy.WmsyDomain({id: "er-complex", domain: "er-complex"});

  var bingoSaid, bingoHeard, bangoSaid, bangoHeard;

  wy.defineWidget({
    name: "top",
    constraint: {
      type: "top",
    },
    structure: {
      bingo: wy.widget({type: "bingo"}, "bingo"),
      bango: wy.widget({type: "bango"}, "bango"),
    },
    relay: ["bingoToMany", "manyToBingo"],
  });
  wy.defineWidget({
    name: "bingo",
    constraint: {
      type: "bingo",
    },
    structure: "basement",
    emit: ["bingoToMany"],
    receive: {
      manyToBingo: function(aWho) {
        bingoHeard.push(aWho);
      }
    }
  });
  wy.defineWidget({
    name: "bango",
    constraint: {
      type: "bango",
    },
    structure: {
      kids: wy.widgetList({type: "kid"}, "kids"),
    },
    emit: ["bangoToKids"],
    receive: {
      kidsToBango: function(aWho) {
        bangoHeard.push(aWho);
      }
    }
  });
  wy.defineWidget({
    name: "kid",
    constraint: {
      type: "kid",
    },
    structure: wy.bind("id"),
    emit: ["kidsToBango", "manyToBingo"],
    receive: {
      bingoToMany: function() {
        bingoSaid.push(this.obj.id);
        this.emit_manyToBingo(this.obj.id);
      },
      bangoToKids: function() {
        bangoSaid.push(this.obj.id);
        this.emit_kidsToBango(this.obj.id);
      }
    }
  });

  var objs = {
    a: {id: "a"},
    b: {id: "b"},
    c: {id: "c"},
  };

  var objRoot = {
    bingo: {},
    bango: {
      kids: [objs.a, objs.b]
    }
  };

  test.waitUntilDone();
  pth.makeTestPage(test, gotPage);

  function assertListsEq(a, b, expl) {
    a.sort();
    b.sort();
    test.assertEqual(a.toString(), b.toString(), expl);
  }
  function resetLists() {
    bingoSaid = [];
    bingoHeard = [];
    bangoSaid = [];
    bangoHeard = [];
  }

  function gotPage(doc, win) {
    var emitter = wy.wrapElement(doc.getElementById("root"));

    var top = emitter.emit({type: "top", obj: objRoot});
    var bingo = top.bingo_element.binding;
    var bango = top.bango_element.binding;
    resetLists();

    bingo.emit_bingoToMany();
    bango.emit_bangoToKids();
    assertListsEq(bingoSaid, ["a", "b"]);
    assertListsEq(bingoHeard, ["a", "b"]);
    assertListsEq(bangoSaid, ["a", "b"]);
    assertListsEq(bangoHeard, ["a", "b"]);
    resetLists();

    // kill off a, add c
    bango.kids_slice.mutateSplice(0, 1);
    bango.kids_slice.mutateSplice(1, 0, objs.c);

    bingo.emit_bingoToMany();
    bango.emit_bangoToKids();
    assertListsEq(bingoSaid, ["b", "c"]);
    assertListsEq(bingoHeard, ["b", "c"]);
    assertListsEq(bangoSaid, ["b", "c"]);
    assertListsEq(bangoHeard, ["b", "c"]);
    resetLists();

    test.done();
  }
};

}); // end define
