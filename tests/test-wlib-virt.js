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
 **/

define("wmsy-tests/test-wlib-virt",
  [
    "wmsy/wmsy",
    "wmsy/viewslice-generative",
    "wmsy/wlib/virt-list-spy",
    "wmsy-plat/page-test-helper",
    "wmsy-plat/dom-test-helper",
    "exports"
  ],
  function(
    wmsy,
    $vs_gen,
    $spy,
    pth,
    dth,
    exports
  ) {

var wheelScrollUp = dth.wheelScrollUp, wheelScrollDown = dth.wheelScrollDown;

/**
 * Close over the checkKids function for reuse convenience.
 *
 * @args[
 *   @param[kids]{
 *     A live nodelist of the children nodes of the virtual list binding.
 *   }
 *   @param[test]{
 *     The test instance to invoke all assertion/test methods on.
 *   }
 * ]
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
   * @args[
   *   @param[aDesc]{
   *     A brief description of the current state for error message purposes.
   *   }
   *   @param[aPreKids]{
   *     Nodes not displayed at all but intentionally buffered or retained/not
   *     discarded above the visible area.
   *   }
   *   @param[aParPre]{
   *     Partially visible nodes at the top.
   *   }
   *   @param[aFullVisKids]{
   *     Fully visible nodes.
   *   }
   *   @param[aParPost]{
   *     Partially visible nodes at the bottom.
   *   }
   *   @param[aPostKids]{
   *     Nodes not displayed but buffered/retained below the visible area.
   *   }
   * ]
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
    test.assertEqual(binding.firstIndex, kids[0].binding.obj,
                     "firstIndex (actual != expected)");
    test.assertEqual(binding.lastIndex, kids[kids.length-1].binding.obj,
                     "lastIndex");

    // now make sure the item map does not have anything not in the expected
    for (var id in itemMap) {
      if (!(id in expectedItemMap))
        test.fail("item map has " + id + " but it is not expected!");
    }
  }
  };
}

/**
 * Virtual list widget test helper to simplify characterization of the
 *  assertions.
 *
 * We use a very simple identity transform generative view slice to populate
 *  our contents.
 */
function TestHelper(test, doc, win, wy, vertical, async) {
  this.test = test;
  this.doc = doc;
  this.win = win;
  this.wy = wy;
  this.vertical = vertical;
  this.async = async;

  this.wrapped = wy.wrapElement(doc.getElementById("root"));
  this.curBinding = null;
  this.spy = null;

  this._sliceSetup();

  var self = this;
  this.visibleBindingsHandler = function() {
    self._visibleBindingsCallback.apply(self, arguments);
  };
}
TestHelper.prototype = {
  _genSyncFunc: function() {

  },

  _genAsyncFunc: function() {
    this._pendingAsync = this._genSyncFunc.apply(this, arguments);
    return undefined;
  },

  _asyncFulfill: function() {

  },

  /**
   * Kill the binding and reinstantiate it.
   */
  _reinit: function() {
    if (this.curBinding) {
      this.curBinding.destroy();
      this.curBinding.domNode.parentNode.removeChild(this.curBinding.domNode);
    }

    this.slice = new $vs_gen.GenerativeViewSlice(
                   this.async ? this._genAsyncFunc : this._genSyncFunc,
                   this.firstKey, this.lastKeyEx, null
                 );

    this.obj = {items: this.slice};
    this.curBinding = this.wrapped.emit({type: "container", obj: this.obj});

    this.vBinding = this.curBinding.items_element.binding;
    this.spy = new $spy.VirtualListSpy(this.vBinding, this);
  },

  /**
   * Figure out the main keys in use with the backing view slice.
   */
  _sliceSetup: function() {
    this.firstKey = 0;
    this.lastKey = 99;
    this.lastKeyEx = this.lastKey + 1;
    this.middleKey = 50;

    this._pendingAsync = null;
  },

  /**
   * Callback handler for when the virtual list widget reports visible bindings;
   *  the test context uses our `visibleBindingsHandler` closed-over function
   *  when defining its widgets in order to direct the notifications to us.
   */
  _visibleBindingsCallback: function(aBindings, aDelta) {
  },

  /**
   * Get the ordering key for the slice-style index referencing the current
   *  set of visible items.
   */
  visibleKey: function(aIndex) {
  },

  /**
   * Get the ordering key for a thing in the pre or post buffer using slice
   *  indexing.
   */
  bufferKey: function(aDir, aIndex) {
  },

  /**
   * Nuke the binding and trigger the seek API with the goal of causing the
   *  first-seek logic to be used rather than the already-seeked logic.
   */
  initialSeek: function() {
    this._reinit();
    this.seek.apply(this, arguments);
  },

  /**
   * Trigger the seek API, trigger any resulting async requests, and wait for
   *  all follow-up requests to cease.
   */
  seek: function() {
    this.spy.clear();
    this.slice.seek.apply(this.slice, arguments);
    // trigger async completion if so.
    while (this._pendingAsync)
      this._asyncFulfill();


  },

  /**
   * Request a scroll, trigger any resulting async requests, and wait for all
   *  follow-up requests to cease.
   */
  scroll: function(aDir, aMag) {
    this.spy.clear();

  },

  /**
   * Assert that the last operation caused new buffering to occur (or not occur)
   *  in each direction.
   *
   * This is determined by observing grow requests, the resulting splices, and
   *  the resulting linear space occupied by the bindings for the spliced
   *  nodes.
   */
  assertBuffered: function() {
  },

  /**
   * Assert that the last operation caused (buffered) items to be discarded
   *  via noteRanges.
   *
   * We wrap noteRanges and check the aggregate length of pixels occupied by the
   *  bindings that are being destroyed.
   */
  assertDiscarded: function(aLowBufferRatio, aHighBufferRatio) {
  },

  /**
   * Assert that the current amount of spare space in each direction is
   *  approximately of a given buffer-relative size.
   *
   * Our data is the set of bound instances in the virtual list's set of
   *  bindings that lie outside the visible range.
   */
  assertSpare: function(aLowBufferRatio, aHighBufferRatio) {
  },

  /**
   * Assert that a spacer node was bound into existence, that its size was
   *  proportional to the provided buffer ratio, and that it was subsequently
   *  replaced by buffered contents.
   *
   * Our data points are obtained by thunking the functions that create/adjust/
   *  destroy spacer nodes plus our existing logic for buffering.
   */
  assertBackfilled: function() {
  },


};

/**
 * Parameterized core functionality testing.  All tests are run in both
 *  horizontal and vertical orientations with both synchronous and asynchronous
 *  viewslice mechanisms.  We also parameterize the size of the homogeneous
 *  elements and the viewport.  This does raise the question of whether our
 *  check logic could be buggy in the same fashion as the virtual list widget
 *  logic and erroneously pass.  Given the difficulty in mastering the
 *  precursor tests with hand-coded cases, it's deemed an acceptable tradeoff
 *  that will be checked with human inspection.
 *
 * Although tests are designed to operate in terms of buffer sizes without
 *  requiring changes, we do require that the retention limit is twice the
 *  (pre-)buffer size.
 */
function baseVirtTestPage(test, doc, win,
                          beVertical, beSynchronous, viewportDim, itemDim) {
  var domainName = "vl-" +
                     (beVertical ? "vert" : "horiz") + "-" +
                     (beSynchronous ? "sync" : "async");
  var wy = new wmsy.WmsyDomain({id: "virt-same", domain: domainName});

  var minorDim = 100;

  // --- instantiate and thunk
  var h = new TestHelper(test, doc, win, wy, beVertical, beSynchronous);

  // --- setup wmsy widgets

  wy.defineWidget({
    name: "container",
    constraint: {
      type: "container",
    },
    structure: {
      items: wy.libWidget(
        {
          type: "virt-list",
          constraint: {type: "item"},
          jumpConstraint: {type: "jump"},
          layout: "linear",
          vertical: beVertical,
          pixpect: itemDim,
        },
        "items"),
    },
    style: {
      root: [
        "width: " + (beVertical ? minorDim : viewportDim) + "px;",
        "height: " + (beVertical ? viewportDim : minorDim) + "px;",
      ],
      items: [
        "width: 100%;",
        "height: 100%;",
      ],
    },
    emit: ["seek"],
    receive: {
      visibleBindings: h.visibleBindingsHandler,
    }
  });

  var marginDim = 10;
  var itemSansMargin = itemDim - marginDim;
  var onAxisAttr = beVertical ? "height" : "width";
  var onAxisPostAttr = beVertical ? "bottom" : "right";
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
        "min-" + onAxisAttr + ": " + itemSansMargin + "px;",
        "" + onAxisAttr + ": " + itemSansMargin + "px;",
        "max-" + onAxisAttr + ": " + itemSansMargin + "px;",
        "margin-" + onAxisPostAttr + ": " + marginDim + "px;",
        "overflow: hidden;",
      ],
    }
  });


  // --- immutable test

  // -- initial seeks and scroll invariants

  // - seek to the top
  h.initialSeek(h.firstKey, 0.0, 0.0, 0);
  h.assertVisible(null, {first: h.firstKey}, true);

  // . focus should be on the first item
  h.assertFocused(h.firstKey);

  // - scrolling up from the top does nothing
  h.scroll(-1);

  // - seek to the bottom
  h.initialSeek(h.lastKey, 1.0, 1.0, 0);
  h.assertVisible(true, {last: h.lastKey}, null);

  // . focus should be on the last item
  h.assertFocused(h.lastKey);

  // - scrolling down from the bottom does nothing
  h.scroll(1);

  // - seek to the middle
  h.initialSeek(h.middleKey, 0.5, 0.5, 0);
  h.assertVisible(true, {somewhere: h.middleKey}, true);

  // . focus should be on the seek target
  h.assertFocused(h.middleKey);


  // -- scrolling: reasonable
  // (we are still seeked to the middle)

  // - up 0.8 buffer => pre buffering, no post culling (spare: 1.8)
  h.scroll(-1, {buffer: 0.8});
  h.assertBuffered(0.8, null);
  h.assertDiscarded(null, null);
  h.assertSpare(1.0, 1.8);

  // - up 0.8 buffer => pre buffering, post culling (spare 2.6, excess: ~0.6)
  h.scroll(-1, {buffer: 0.8});
  h.assertBuffered(0.8, null);
  h.assertDiscarded(null, 0.6);
  h.assertSpare(1.0, 2.0);

  // - down 0.8 => no post buffering (spare 1.2), no pre culling (spare 1.8)
  h.scroll(1, {buffer: 0.8});
  h.assertBuffered(null, null);
  h.assertDiscarded(null, null);
  h.assertSpare(1.8, 1.2);

  // - down 0.8 => post buffering (spare 0.5), pre culling (excess ~0.6)
  h.scroll(1, {buffer: 0.8});
  h.assertBuffered(null, 0.5);
  h.assertDiscarded(0.6, null);
  h.assertSpare(2.0, 1.0);


  // -- scrolling: ridiculous

  // - try and scroll beyond our buffer after-wise, hit the void, backfill
  h.initialSeek(h.middleKey, 0.5, 0.5, 0);
  h.scroll(-1, {buffer: 1.5});
  h.assertBackfilled(0.5, null);
  h.assertBuffered(1.5, null);
  h.assertDiscarded(null, 0.5);
  h.assertSpare(1.0, 2.0);

  // - try and scroll beyond our buffer before-wise, hit the void, backfill
  h.initialSeek(h.middleKey, 0.5, 0.5, 0);
  h.scroll(1, {buffer: 1.5});
  h.assertBackfilled(null, 0.5);
  h.assertBuffered(null, 1.5);
  h.assertDiscarded(0.5, null);
  h.assertSpare(2.0, 1.0);

  // -- inductive seek: within existing range
  // (translated to a scroll)

  // - (initial seek to the top)
  h.initialSeek(h.firstKey, 0, 0, 0);

  // - focus halfway down the first item
  h.seek(h.firstKey, 0.5, 0.0, 0);

  // - focus back up at the top of the first item
  h.seek(h.firstKey, 0.0, 0.0, 0);

  // - focus back up at the top of the first item with padding
  // we should not put ourselves in 'negative space'
  h.seek(h.firstKey, 0.0, 0.0, 10);

  // - focus at the bottom of the first item
  h.seek(h.firstKey, 1.0, 0.0, 0);

  // - seek to the subsequent visible item (assert its existence)
  h.seek(h.visibleKey(1), 0.0, 0.0, 0);

  // - seek to the first fully non-visible item in the post-buffer
  h.seek(h.bufferKey(1, 0), 0.0, 0.0, 0);

  // - seek to the last item in the post-buffer (edge case)
  h.seek(h.bufferKey(1, -1), 0.0, 0.0, 0);

  // -- inductive seek: outside existing range
  // (jump seek)

  // - (initial seek to the top)

  // - seek to the bottom

  // - seek to the middle

  // - seek to the first item outside of the post-range; should be a seek


  // --- insertions

  // -- insert just before first visible node; view unaffected

  // -- insert just after last visible node; view unaffected

  // -- insert just after first visible node; view affected

  // -- insert just before last visible node; view affected


  // --- deletions

  // -- delete just before first visible node; view unaffected

  // -- delete just after last visible node; view unaffected

  // -- delete partially visible first node; view stable-ish but affected
  // (we don't want the first fully visible node sliding off the screen)

  // -- delete partially visible last node; view affected

  // -- delete first fully visible node (equivalent to any fully visible node)



}

var VIEWPORT_DIM = 200, ITEM_DIM = 50;

exports.testVertSync = function(test) {
  test.waitUntilDone();
  pth.makeTestPage(test, function(doc, win) {
    baseVirtTestPage(test, doc, win,
                     true, true, VIEWPORT_DIM, ITEM_DIM);
    test.done();
  });
};

exports.testVertAsync = function(test) {
  test.waitUntilDone();
  pth.makeTestPage(test, function(doc, win) {
    baseVirtTestPage(test, doc, win,
                     true, false, VIEWPORT_DIM, ITEM_DIM);
    test.done();
  });
};

exports.testHorizSync = function(test) {
  test.waitUntilDone();
  pth.makeTestPage(test, function(doc, win) {
    baseVirtTestPage(test, doc, win,
                     false, true, VIEWPORT_DIM, ITEM_DIM);
    test.done();
  });
};

exports.testHorizAsync = function(test) {
  test.waitUntilDone();
  pth.makeTestPage(test, function(doc, win) {
    baseVirtTestPage(test, doc, win,
                     false, false, VIEWPORT_DIM, ITEM_DIM);
    test.done();
  });
};

/*
 * Test simultaneous insertion/deletion, which is only currently possible when
 *  using the interposing view slice mechanism.
 */

/*exports.testVirtHomogeneous = */ function testVirtHomogeneous(test) {
  var wy = new wmsy.WmsyDomain({id: "virt-same", domain: "wl-v-same"});
  var kidHelpers = makeKidHelpers();
  var expectKids = kidHelpers.expectKids, checkKids = kidHelpers.checkKids;

  wy.defineWidget({
    name: "container",
    constraint: {
      type: "container",
    },
    structure: {
      items: wy.libWidget(
        {
          type: "virt-list",
          constraint: {type: "item"},
          jumpConstraint: {type: "jump"},
          layout: "linear",
          vertical: aVert,
          pixpect: 50,
        },
        "items"),
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
  pth.makeTestPage(test, gotPage);
  function gotPage(doc, win) {
    var emitter = wy.wrapElement(doc.getElementById("root"));

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

/**
 * Make sure that we update our focus when things scroll out of view and when
 *  seeking.
 */
exports.testFocusUpdates = function() {};

/*
 * Make sure we handle under-predicting pixpects without dying.
 */

/*
 * Make sure we handle response fragmenting correctly.
 */

}); // end define
