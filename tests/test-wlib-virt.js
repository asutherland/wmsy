/**
 * Test the virtual widget list widget.
 *
 * (Base case: homogeneous 1d widget instances)
 * - Test user-surfaced scroll-wheel logic:
 *   - Pads appropriately.
 *   - Nukes widgets that are outside the retention area.
 *   - Obeys the outbound API telling what widgets are currently visible.
 * - Test the seek API:
 *   - Test visual positioning logic (and padding calculations on top of that).
 *   - Test overlapping seeks.
 *   - Test discontinuous seeks work and nuke other stuff.
 *   - Test adjacent but not overlapping seeks.
 *   - Obeys the outbound API saying what widgets are currently visible.
 *
 * (More complex: tiling homogeneous 2d widget instances like contacts)
 * - Scroll wheel basics; make sure padding works exactly correctly.
 * - Seek basics.
 *
 * (Most complex: heterogeneous widget instances with tiling and non-tiling)
 * - Scroll wheel...
 * - Seek...
 */

var Pages = require("page-worker");
var wmsy = require("wmsy/wmsy");
var dth = require("wmsy/dom-test-helper");
var wheelScrollUp = dth.wheelScrollUp, wheelScrollDown = dth.wheelScrollDown;

/**
 * Close over the checkKids function for reuse convenience.
 *
 * @param kids A live nodelist of the children nodes of the virtual list
 *     binding.
 * @param test The test instance to invoke all assertion/test methods on.
 */
function makeKidHelpers() {
  var kids, test, binding;
  var visibleExpected = false;
  var desc, preKids, parPre, fullVisKids, parPost, postKids;
  return {
  bind: function(aKids, aTest, aBinding) {
    kids = aKids;
    test = aTest;
    binding = aBinding;
  },

  visibleBindings: function kidHelperVisibleBindings(aBindings) {
    if (!visibleExpected)
      test.fail("unexpected update via visibleBindings: " + aBindings);
    else
      test.pass("expected update via visibleBindings");
    visibleExpected = false;

    test.assertEqual(aBindings.length,
                     parPre.length + fullVisKids.length + parPost.length,
                     desc + " visible binding count (actual != desired)");

    var il, ik = 0;
    for (il = 0; il < parPre.length; il++, ik++) {
      test.assertEqual(parPre[il], aBindings[ik].obj,
                       desc + " parpre kid #" + il + " @ vis kids #" + ik);
    }
    for (il = 0; il < fullVisKids.length; il++, ik++) {
      test.assertEqual(fullVisKids[il], aBindings[ik].obj,
                       desc + " vis kid #" + il + " @ vis kids #" + ik);
    }
    for (il = 0; il < parPost.length; il++, ik++) {
      test.assertEqual(parPost[il], aBindings[ik].obj,
                       desc + " parpost kid #" + il + " @ vis kids #" + ik);
    }
  },

  /**
   * Tell us expectations for the kid states prior to performing an action so
   *  that we can have visibleBindings ready to check and avoid having to
   *  duplicate the expectations for checkKids.  All values should be provided
   *  as the (equivalent) binding values.  All lists must be provided.
   *
   * @param aDesc A brief description of the current state for error message
   *     purposes.
   * @param aPreKids Nodes not displayed at all but intentionally buffered or
   *     retained/not discarded above the visible area..
   * @param aParPre Partially visible nodes at the top.
   * @param aFullVisKids Fully visible nodes.
   * @param aParPost Partially visible nodes at the bottom.
   * @param aPostKids Nodes not displayed but buffered/retained below the
   *     visible area.
   */
  expectKids: function expectKids(aDesc,
                     aPreKids, aParPre, aFullVisKids, aParPost, aPostKids) {
    desc = aDesc;
    preKids = aPreKids;
    parPre = aParPre;
    fullVisKids = aFullVisKids;
    parPost = aParPost;
    postKids = aPostKids;

    visibleExpected = true;
  },

  /**
   * Perform a fairly thorough check that all the expected nodes exist and
   *  that their visibility states are as expected.  Also verify the itemMap
   *  contains exactly the set of visible kids.
   */
  checkKids: function checkKids() {
    if (visibleExpected)
      test.fail(desc + ": did not receive expected update via visibleBindings");

    var expectedItemMap = {}, itemMap = binding.itemMap;

    test.assertEqual(kids.length,
                     preKids.length + parPre.length + fullVisKids.length +
                       parPost.length + postKids.length,
                     desc + " total kid count (actual != expected)");
    var il, ik = 0, kid;
    for (il = 0; il < preKids.length; il++, ik++) {
      test.assertEqual(preKids[il], kids[ik].binding.obj,
                       desc + " pre kid #" + il + " @ all kids #" + ik);
      kid = preKids[il];
      expectedItemMap[kid] = true;
      if (!(kid in itemMap))
        test.fail("kid " + kid + " not in item map!");
    }
    for (il = 0; il < parPre.length; il++, ik++) {
      test.assertEqual(parPre[il], kids[ik].binding.obj,
                       desc + " parpre kid #" + il + " @ all kids #" + ik);
      kid = parPre[il];
      expectedItemMap[kid] = true;
      if (!(kid in itemMap))
        test.fail("kid " + kid + " not in item map!");
    }
    for (il = 0; il < fullVisKids.length; il++, ik++) {
      test.assertEqual(fullVisKids[il], kids[ik].binding.obj,
                       desc + " vis kid #" + il + " @ all kids #" + ik);
      kid = fullVisKids[il];
      expectedItemMap[kid] = true;
      if (!(kid in itemMap))
        test.fail("kid " + kid + " not in item map!");
    }
    for (il = 0; il < parPost.length; il++, ik++) {
      test.assertEqual(parPost[il], kids[ik].binding.obj,
                       desc + " parpost kid #" + il + " @ all kids #" + ik);
      kid = parPost[il];
      expectedItemMap[kid] = true;
      if (!(kid in itemMap))
        test.fail("kid " + kid + " not in item map!");
    }
    for (il = 0; il < postKids.length; il++, ik++) {
      test.assertEqual(postKids[il], kids[ik].binding.obj,
                       desc + " post kid #" + il + " @ all kids #" + ik);
      kid = postKids[il];
      expectedItemMap[kid] = true;
      if (!(kid in itemMap))
        test.fail("kid " + kid + " not in item map!");
    }

    // make sure the index ranges are correct...
    test.assertEqual(binding.firstIndex, preKids[0], "firstIndex");
    test.assertEqual(binding.lastIndex, postKids[postKids.length-1],
                     "lastIndex");

    // now make sure the item map does not have anything not in the expected
    for (var id in itemMap) {
      if (!(id in expectedItemMap))
        test.fail("item map has " + id + " but it is not expected!");
    }
  }
  };
}


exports.testVirtHomogeneous = function testVirtHomogeneous(test) {
  var wy = new wmsy.WmsyDomain({id: "virt-same", domain: "wl-v-same"});
  var kidHelpers = makeKidHelpers();
  var expectKids = kidHelpers.expectKids, checkKids = kidHelpers.checkKids;

  wy.defineWidget({
    name: "container",
    constraint: {
      type: "container",
    },
    structure: {
      items: wy.libWidget({type: "virt-list",
                           constraint: {type: "item"},
                           id: wy.SELF}, "items"),
    },
    style: {
      root: [
        "width: 100px;",
        "height: 200px;",
      ],
      items: [
        "width: 100%;",
        "height: 100%;",
      ],
    },
    emit: ["seek"],
    receive: {
      visibleBindings: kidHelpers.visibleBindings,
    }
  });

  wy.defineWidget({
    name: "list-item",
    constraint: {
      type: "item",
    },
    structure: {
      numba: wy.bind(wy.SELF),
    },
    style: {
      root: [
        "min-height: 40px; height: 40px; max-height: 40px;",
        "margin-bottom: 10px;",
        "overflow: hidden;",
      ],
    }
  });

  var rootObj = {
    items: [],
  };
  for (var i = 0; i < 1000; i++) {
    rootObj.items.push(i);
  }

  test.waitUntilDone();

  var page = Pages.add(Pages.Page({
    onReady: check,
    content: "<div id='root'></div>",
  }));

  function check() {
    var emitter = wy.wrapElement(page.document.getElementById("root"));

    // - check initial setup and padding (0, 0 - 200, 320)
    kidHelpers.bind(null, test); // partial bind; virtual widget not yet avail
    expectKids("initial", [], [], [0, 1, 2, 3], [], [4, 5, 6]);


    var binding = emitter.emit({type: "container", obj: rootObj});
    var virtBinding = binding.items_element.binding;
    var virtNode = virtBinding.domNode;
    var kids = virtNode.children;
    kidHelpers.bind(kids, test, virtBinding); // full bind

    checkKids();

    // --- scrolling

    // Facts because of our 200px height but the 120px min buffer rule...:
    // - 120px will be padded out if required
    // - 240px will be retained, but anything beyond that gets discarded
    //
    // Low virtual pixel ranges (to ease sanity checking):
    //   0,  40:  0    200, 240:  4    400, 440:  8     600, 640: 12
    //  50,  90:  1    250, 290:  5    450, 490:  9     650, 690: 13
    // 100, 140:  2    300, 340:  6    500, 540: 10     700, 740: 14
    // 150, 190:  3    350, 390:  7    550, 590: 11     750, 790: 15

    // - scroll wheel up... nothing should happen!
    wheelScrollUp(virtNode, 120);

    // - scroll wheel down, scrolling should happen! (0, 120 - 320, 440)
    // 0,1 should be cached around from before, 7,8 should be newly added...
    expectKids("scrolled down 120", [0, 1], [2], [3, 4, 5], [6], [7, 8]);
    wheelScrollDown(virtNode, 120);
    checkKids();

    // - scroll wheel down, margin vis edge case (0, 240 - 440, 560)
    // thanks to margins 4 is not actually visible
    expectKids("scrolled down 240",
               [0, 1, 2, 3, 4], [], [5, 6, 7, 8], [], [9, 10, 11]);
    wheelScrollDown(virtNode, 120);
    checkKids();

    // - scroll wheel down, retained stuff falls off (120, 360 - 560, 680)
    expectKids("scrolled down 360",
               [2, 3, 4, 5, 6], [7], [8, 9, 10], [11], [12, 13]);
    wheelScrollDown(virtNode, 120);
    checkKids();

    // - scroll wheel up, nothing rebuilt, all retained (120, 240 - 440, 680)
    // The pre-bit doesn't build anything because the buffer is already
    //  satisfied.  Everything we padded in last scroll is retained.
    expectKids("scrolled up 240",
               [2, 3, 4], [], [5, 6, 7, 8], [], [9, 10, 11, 12, 13]);
    wheelScrollUp(virtNode, 120);
    checkKids();

    // - scroll wheel down, same as last 360 (120, 360 - 560, 680)
    expectKids("scrolled down 360",
               [2, 3, 4, 5, 6], [7], [8, 9, 10], [11], [12, 13]);
    wheelScrollDown(virtNode, 120);
    checkKids();

    // - scroll wheel down, more falls off (240, 480 - 680, 800)
    // (16 needs to get bound because we don't get the padding until the next
    //  dude shows up, I think...? (tired))
    expectKids("scrolled down 480",
               [4, 5, 6, 7, 8], [9], [10, 11, 12], [13], [14, 15, 16]);
    wheelScrollDown(virtNode, 120);
    checkKids();

    // - scroll wheel up, meh (240, 360 - 560, 800)
    expectKids("scrolled up 360",
               [4, 5, 6], [7], [8, 9, 10], [11], [12, 13, 14, 15, 16]);
    wheelScrollUp(virtNode, 120);
    checkKids();

    // - scroll wheel up, regenerate 2-4 (120, 240 - 440, 680)
    // (this is the first time we insert more than 1 prior node)
    // (this is the first time we truncate off the numerically high end)
    expectKids("scrolled up 240",
               [2, 3, 4], [], [5, 6, 7, 8], [], [9, 10, 11, 12, 13]);
    wheelScrollUp(virtNode, 120);
    checkKids();

    // --- seeking

    // Seeking does not work on the basis of pixel offsets; just item indices
    //  and relative positioning along the item in the question.

    // -- seek in the midst of where we are, checking positioning
    // (210, 450 - 650, 770)
    // - 9 at the top...
    expectKids("seek 9 @ top",
               [4, 5, 6, 7, 8], [], [9, 10, 11, 12], [], [13, 14, 15]);
    binding.emit_seek(9, 0.0, "top", 0);
    test.assertEqual(virtBinding.itemMap[9].domNode.getBoundingClientRect().top,
                     virtNode.getBoundingClientRect().top,
                     "9 should be aligned at the top");
    checkKids();

    // - 12 at the bottom (210, 440 - 640, 770)
    expectKids("seek 12 @ bottom",
               [4, 5, 6, 7, 8], [], [9, 10, 11, 12], [], [13, 14, 15]);
    binding.emit_seek(12, 1.0, "bottom", 0);
    test.assertEqual(
      virtBinding.itemMap[12].domNode.getBoundingClientRect().bottom,
      virtNode.getBoundingClientRect().bottom,
      "12 should be aligned at the bottom");
    checkKids();

    // XXX do more positioning stuff in the already extant range.

    // -- non-overlapping seek
    // - 32 @ top, (1480, 1600 - 1800, 1920)
    expectKids("seek 32 @ top",
               [29, 30, 31], [], [32, 33, 34, 35], [], [36, 37, 38]);
    binding.emit_seek(32, 0.0, "top", 0);
    checkKids();

    // -- adjacent seek
    // - 39 @ top (link before)
    expectKids("seek 39 @ top",
               [34, 35, 36, 37, 38], [], [39, 40, 41, 42], [], [43, 44, 45]);
    binding.emit_seek(39, 0.0, "top", 0);
    checkKids();

    // - 33 @ top (link after)
    expectKids("seek 33 @ top",
               [30, 31, 32], [], [33, 34, 35, 36], [], [37, 38, 39, 40, 41]);
    binding.emit_seek(33, 0.0, "top", 0);
    checkKids();


    // -- adjacent-ish seek
    // - 47

    test.done();
  }
};

/*
exports.testVirtTiled = function testVirtTiled(test) {
  var wy = new wmsy.WmsyDomain({id: "virt-tile", domain: "wl-v-tile"});

};

exports.testVirtHeterogeneous = function testVirtHeterogeneous(test) {
  var wy = new wmsy.WmsyDomain({id: "virt-diff", domain: "wl-v-diff"});

};
*/
