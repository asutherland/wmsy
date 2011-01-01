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
 * Test widget list functionality not covered elsewhere.
 **/

define("wmsy-tests/test-widget-list",
            ["wmsy/wmsy", "wmsy-plat/page-test-helper", "exports"],
            function(wmsy, pth, exports) {

/**
 * Make sure ensureVisible with a straightforward list is able to scroll
 *  horizontally/vertically.
 */
function baseEnsureVisibleSimple(test, aVertical) {
  var vertString = aVertical ? "vertical" : "horizontal";

  var wy = new wmsy.WmsyDomain({id: "wl-ensurevisible-" + vertString,
                                domain: "wl-ensurevisible-" + vertString});

  // be able to map the leaf value bindings from their value
  wy.defineIdSpace("value", function(val) { return val; });

  wy.defineWidget({
    name: "container",
    constraint: {
      type: "container",
    },
    structure: {
      items: wy.widgetList({type: "item"}, "items",
                           {vertical: aVertical}),
    },
    style: {
      items: [
        "width: 100px;",
        "height: 100px;",
        "overflow: hidden;",
        aVertical ? "" : "white-space: nowrap;",
      ],
    },
  });

  wy.defineWidget({
    name: "list-item",
    constraint: {
      type: "item",
    },
    idspaces: ["value"],
    structure: {
      numba: wy.bind(wy.SELF),
    },
    style: {
      root: [
        aVertical ? "" : "display: inline-block;",
        "min-height: 40px; height: 40px; max-height: 40px;",
        "min-width: 40px; width: 40px; max-width: 40px;",
        "margin-bottom: 10px;",
        "margin-right: 10px;",
        "overflow: hidden;",
      ],
    }
  });

  var rootObj = {
    items: [],
  };
  var count = 15;
  for (var i = 0; i < count; i++) {
    rootObj.items.push(i);
  }

  test.waitUntilDone();
  pth.makeTestPage(test, gotPage);


  var frozeFrame;
  function freezeFrame(binding) {
    frozeFrame = binding.domNode.getBoundingClientRect();
  }
  function explodeOnMovement(binding) {
    var nowFrame = binding.domNode.getBoundingClientRect();
    test.assert((frozeFrame.left == nowFrame.left) &&
                (frozeFrame.top == nowFrame.top) &&
                (frozeFrame.right == nowFrame.right) &&
                (frozeFrame.bottom == nowFrame.bottom),
                "bindings should not move unless told to");
  }


  function gotPage(doc) {
    var emitter = wy.wrapElement(doc.getElementById("root"));
    var container = emitter.emit({type: "container", obj: rootObj});

    var dude, idSpace = emitter.idSpace;
    function goDude(i, aDoFocus) {
      dude = idSpace.findBindingsUsingId("value", i)[0];
      if (aDoFocus === undefined || aDoFocus) {
        dude.ensureVisible();
      }
    }

    var endAttr = aVertical ? "bottom" : "right";
    function assertEndsMatch() {
      test.assertEqual(container.items_element.getBoundingClientRect()[endAttr],
                       dude.domNode.getBoundingClientRect()[endAttr],
                       "ends need to match");
    }
    var begAttr = aVertical ? "top" : "left";
    function assertBegMatch() {
      test.assertEqual(container.items_element.getBoundingClientRect()[begAttr],
                       dude.domNode.getBoundingClientRect()[begAttr],
                       "beginning need to match");
    }


    // scroll to the last dude.
    goDude(count - 1);
    assertEndsMatch(container, dude);

    // back to the front
    goDude(0);
    assertBegMatch(container, dude);

    // someone already visible should not move.
    goDude(1, false);
    freezeFrame(dude);
    goDude(1);
    explodeOnMovement(dude);

    // things should work even not at the ends and be stable
    goDude(count - 3);
    assertEndsMatch(container, dude);
    freezeFrame(dude);
    goDude(count - 3);
    explodeOnMovement(dude);

    goDude(3);
    assertBegMatch(container, dude);
    freezeFrame(dude);
    goDude(3);
    explodeOnMovement(dude);

    test.done();
  };
};

exports.testEnsureVisibleSimpleVert = function ensureVisibleSimpleVert(test) {
  baseEnsureVisibleSimple(test, true);
};
exports.testEnsureVisibleSimpleHoriz = function ensureVisibleSimpleHoriz(test) {
  baseEnsureVisibleSimple(test, false);
};


/**
 * Make sure ensureVisible handles:
 * - A focusable item embedded in a non-scrolly container which is then embedded
 *    in a scrolly container. (We actually do this as part of the next test, but
 *    it's important to check.)
 * - Nested scrolly things so that we have to scroll twice.
 */
exports.testEnsureVisibleComplex = function testEnsureVisibleComplex(test) {
  var wy = new wmsy.WmsyDomain({id: "wl-ensurevisible-complex",
                                domain: "wl-ensurevisible-complex"});

  // be able to map the leaf value bindings from their value
  wy.defineIdSpace("value", function(val) { return val; });

  wy.defineWidget({
    name: "outer-container",
    constraint: {
      type: "outer-container",
    },
    structure: {
      inners: wy.vertList({type: "inner-container"}, "inners"),
    },
    style: {
      root: [
        "margin: 0;",
        "padding: 0;",
      ],
      // we want 3 visible across, and only 1 ever vertically
      //  visible (we use some margin to pad the 40 out to 50)
      inners: [
        "width: 120px;",
        "height: 50px;",
        "overflow: hidden;",
      ],
    },
  });
  wy.defineWidget({
    name: "inner-container",
    constraint: {
      type: "inner-container",
    },
    structure: {
      groups: wy.horizList({type: "group"}, "groups"),
    },
    style: {
      root: [
        "min-height: 40px; height: 40px; max-height: 40px;",
        "margin-bottom: 10px;",
      ],
      groups: [
        "white-space: nowrap;",
        "overflow: hidden;",
      ],
    }
  });
  wy.defineWidget({
    name: "group",
    constraint: {
      type: "group",
    },
    structure: {
      things: wy.horizList({type: "item"}, "vals"),
    },
    style: {
      root: [
        "display: inline-block;",
        "white-space: normal;",
      ],
    }
  });
  wy.defineWidget({
    name: "item",
    constraint: {
      type: "item",
    },
    idspaces: ["value"],
    structure: {
      label: wy.bind(wy.SELF),
    },
    style: {
      root: [
        "display: inline-block;",
        "min-width: 40px; width: 40px; max-width: 40px;",
        "min-height: 40px; height: 40px; max-height: 40px;",
        "overflow: hidden;",
      ],
    }
  });


  var GROUP_NAMES = ["fruits", "animals"];
  // The id attributes were from we required id mappings for rich objects
  //  in lists. I think they may be useful again in the future, leaving in
  //  for now.
  var rootObj = {
    inners: [
      {
        id: "a",
        groups: [
          {id: "fruits", vals: ["apple", "a tomato"]},
          {id: "animals", vals: ["aardvark", "ant"]}
        ]
      },
      {
        id: "b",
        groups: [
          {id: "fruits", vals: ["banana", "blueberry"]},
          {id: "animals", vals: ["baboon", "barky dog"]}
        ]
      },
      {
        id: "c",
        groups: [
          {id: "fruits", vals: ["cantaloupe", "cherry"]},
          {id: "animals", vals: ["carnivorous plant", "cat", "chinchilla"]}
        ]
      },
    ]
  };

  test.waitUntilDone();

  pth.makeTestPage(test, gotPage);

  function gotPage(doc) {
    var emitter = wy.wrapElement(doc.getElementById("root"));
    var container = emitter.emit({type: "outer-container", obj: rootObj});

    var innerContainer, group, dude, idSpace = emitter.idSpace;
    // set innerContainer, group, and dude based on the name.  also,
    //  ensureVisible the dude.
    function goDude(name) {
      // use our idspace mechanism to find the dude then walk upwards to
      //  figure out the others.
      dude = idSpace.findBindingsUsingId("value", name)[0];
      group = dude.__parentBinding;
      innerContainer = group.__parentBinding;
      dude.ensureVisible();
    }

    function dudeMaker(attrName) {
      return function() {
        test.assertEqual(
          container.inners_element.getBoundingClientRect()[attrName],
          dude.domNode.getBoundingClientRect()[attrName],
          "container and dude must line up at their " + attrName);
      };
    }

    var dudeAtTop = dudeMaker("top"), dudeAtBottom = dudeMaker("bottom");
    var dudeAtLeft = dudeMaker("left"), dudeAtRight = dudeMaker("right");

    // sanity check the base-case; we should see "apple" in the upper left.
    goDude("apple");
    dudeAtTop();
    dudeAtLeft();

    // scroll down to "cantaloupe" so only one dimension gets exercised
    goDude("cantaloupe");
    dudeAtBottom();
    dudeAtLeft();

    // now right to "chinchilla" again so only one dimension gets exercised
    goDude("chinchilla");
    dudeAtBottom();
    dudeAtRight();

    // now up to apple (whose inner container never scrolled)
    goDude("apple");
    dudeAtTop();
    dudeAtLeft();

    // now down a bit and right some... barky dog!
    goDude("barky dog");
    dudeAtBottom();
    dudeAtRight();

    // now down and left a bit... cherry!
    goDude("cherry");
    dudeAtBottom();
    dudeAtLeft();

    test.done();
  }
};

}); // end define
