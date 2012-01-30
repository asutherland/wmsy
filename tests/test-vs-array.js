/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at:
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is Mozilla Messaging Code.
 *
 * The Initial Developer of the Original Code is
 *   The Mozilla Foundation
 * Portions created by the Initial Developer are Copyright (C) 2010
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Andrew Sutherland <asutherland@asutherland.org>
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

define("wmsy-tests/test-vs-array",
            ["wmsy/viewslice-array", "exports"],
            function(vst, exports) {

/**
 * An array view slice on the whole thing should return the whole thing.
 */
exports.testFullSpan = function(test) {
  var list = [1, 2, 3, 4];
  var listener = {
    didSeek: function(aItems, aMoreExpected, aSlice) {
      this.gotDidSeek = true;
      test.assertEqual(aItems.length, list.length, "list lengths");
      test.assertEqual(aItems.toString(), list.toString(), "list contents");
    },
    gotDidSeek: false,
  };
  var slice = new vst.ArrayViewSlice(list, listener);
  slice.seek(0);
  test.assert(listener.gotDidSeek);
  test.assert(slice.atFirst);
  test.assert(slice.atLast);
  test.assertEqual(slice.translateIndex(0), 0, "translate");
  test.assertEqual(slice.translateIndex(1), 1, "translate");
  test.assertEqual(slice.translateIndex(3), 3, "translate");
};

/**
 * Partial view slice requestKnown contract.
 */
exports.testPartialSpanBasics = function(test) {
  var list = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  var splicedIn = null, splicedex = null;
  var listener = {
    didSeek: function(aItems, aMoreExpected, aSlice) {
      this.gotDidSeek = true;
      test.assertEqual(aItems.length, 5, "list length");
      test.assertEqual(aItems.toString(), [4, 5, 6, 7, 8].toString(),
                       "list contents");
    },
    didSplice: function(aIndex, aHowMany, aItems, aRequested, aMoreExpected,
                        aSlice) {
      splicedex = aIndex;
      splicedIn = aItems;
    },
    gotDidSeek: false,
  };
  function reset() {
    splicedIn = splicedex = null;
  }

  var slice = new vst.ArrayViewSlice(list, listener);
  slice.seek(6, 2, 2);
  test.assert(listener.gotDidSeek);
  test.assert(!slice.atFirst);
  test.assert(!slice.atLast);
  test.assertEqual(slice.translateIndex(0), 4, "translate");
  test.assertEqual(slice.translateIndex(1), 5, "translate");
  test.assertEqual(slice.translateIndex(4), 8, "translate");

  // grow firstwards within bounds
  slice.grow(-2);
  test.assertEqual(splicedex, 0);
  test.assertEqual(splicedIn.length, 2, "lowgrow size");
  test.assertEqual(splicedIn.toString(), [2, 3].toString(), "lowgrow contents");
  test.assert(!slice.atFirst);
  test.assert(!slice.atLast);
  test.assertEqual(slice.liveList.toString(),
                   [2, 3, 4, 5, 6, 7, 8].toString(),
                   "lowgrow liveList");
  test.assertEqual(slice.translateIndex(0), 2, "translate");
  test.assertEqual(slice.translateIndex(1), 3, "translate");
  test.assertEqual(slice.translateIndex(6), 8, "translate");

  reset();
  // grow lastwards within bounds
  slice.grow(1);
  test.assertEqual(splicedex, 7);
  test.assertEqual(splicedIn.length, 1, "higrow size");
  test.assertEqual(splicedIn.toString(), [9].toString(), "higrow contents");
  test.assert(!slice.atFirst);
  test.assert(!slice.atLast);
  test.assertEqual(slice.liveList.toString(),
                   [2, 3, 4, 5, 6, 7, 8, 9].toString(),
                   "highgrow liveList");

  reset();
  // grow firstwards to the limit
  slice.grow(-2);
  test.assertEqual(splicedex, 0);
  test.assertEqual(splicedIn.length, 2, "lowgrow size");
  test.assertEqual(splicedIn.toString(), [0, 1].toString(), "lowgrow contents");
  test.assert(slice.atFirst);
  test.assert(!slice.atLast);
  test.assertEqual(slice.liveList.toString(),
                   [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].toString(),
                   "lowgrow liveList");

  reset();
  // grow lastwards to the limit
  slice.grow(1);
  test.assertEqual(splicedex, 10);
  test.assertEqual(splicedIn.length, 1, "higrow size");
  test.assertEqual(splicedIn.toString(), [10].toString(), "higrow contents");
  test.assert(slice.atFirst);
  test.assert(slice.atLast);
  test.assertEqual(slice.liveList.toString(),
                   [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].toString(),
                   "highgrow liveList");
};

/**
 * Test seeking logic (and reverse mapping) with a key-based ordering.
 */
exports.testSeekKeyBased = function(test) {
  function nameFetcher(o) {
    return o;
  }
  function nameComparator(a, b) {
    return a.localeCompare(b);
  }
  var listener = {
    didSeek: function(aItems, aMoreExpected, aSlice) {
      this.gotDidSeek = true;
      this.items = aItems;
    },
    gotDidSeek: false,
    reset: function() {
      this.items = this.gotDidSeek = null;
    },
  };

  var list = ["alpha", "bobo", "omegb", "philharmonia", "zeta", "zoot"];
  var slice = new vst.ArrayViewSlice(list, listener, null,
                                      nameFetcher, nameComparator);

  slice.seek("omegc", 1, 1);
  test.assert(listener.gotDidSeek);
  test.assertEqual(listener.items.length, 3, "list length");
  test.assertEqual(listener.items.toString(),
                   ["bobo", "omegb", "philharmonia"].toString(),
                   "list contents");
  test.assertEqual(slice.liveList.toString(),
                   ["bobo", "omegb", "philharmonia"].toString(),
                   "list contents");
  test.assert(!slice.atFirst);
  test.assert(!slice.atLast);
  test.assertEqual(slice.translateIndex(0), "bobo", "translate");
  test.assertEqual(slice.translateIndex(1), "omegb", "translate");
  test.assertEqual(slice.translateIndex(2), "philharmonia", "translate");
  listener.reset();

  slice.seek("omegb", 1, 1);
  test.assert(listener.gotDidSeek);
  test.assertEqual(listener.items.length, 3, "list length");
  test.assertEqual(listener.items.toString(),
                   ["bobo", "omegb", "philharmonia"].toString(),
                   "list contents");
  test.assertEqual(slice.liveList.toString(),
                   ["bobo", "omegb", "philharmonia"].toString(),
                   "list contents");
  test.assert(!slice.atFirst);
  test.assert(!slice.atLast);
  listener.reset();

  slice.seek("omega", 1, 1);
  test.assert(listener.gotDidSeek);
  test.assertEqual(listener.items.length, 3, "list length");
  test.assertEqual(listener.items.toString(),
                   ["alpha", "bobo", "omegb"].toString(),
                   "list contents");
  test.assertEqual(slice.liveList.toString(),
                   ["alpha", "bobo", "omegb"].toString(),
                   "list contents");
  test.assert(slice.atFirst);
  test.assert(!slice.atLast);
  listener.reset();

  slice.seek("philharmonia", 1, 1);
  test.assert(listener.gotDidSeek);
  test.assertEqual(listener.items.length, 3, "list length");
  test.assertEqual(listener.items.toString(),
                   ["omegb", "philharmonia", "zeta"].toString(),
                   "list contents");
  test.assertEqual(slice.liveList.toString(),
                   ["omegb", "philharmonia", "zeta"].toString(),
                   "list contents");
  test.assert(!slice.atFirst);
  test.assert(!slice.atLast);
  listener.reset();

  slice.seek("a", 1, 1);
  test.assert(listener.gotDidSeek);
  test.assertEqual(listener.items.length, 2, "list length");
  test.assertEqual(listener.items.toString(),
                   ["alpha", "bobo"].toString(),
                   "list contents");
  test.assertEqual(slice.liveList.toString(),
                   ["alpha", "bobo"].toString(),
                   "list contents");
  test.assert(slice.atFirst);
  test.assert(!slice.atLast);
  listener.reset();

  slice.seek("zzzzzzzzz", 1, 1);
  test.assert(listener.gotDidSeek);
  test.assertEqual(listener.items.length, 2, "list length");
  test.assertEqual(listener.items.toString(),
                   ["zeta", "zoot"].toString(),
                   "list contents");
  test.assertEqual(slice.liveList.toString(),
                   ["zeta", "zoot"].toString(),
                   "list contents");
  test.assert(!slice.atFirst);
  test.assert(slice.atLast);

  test.assertEqual(slice.translateIndex(0), "zeta", "translate");
  test.assertEqual(slice.translateIndex(1), "zoot", "translate");
  listener.reset();
};

exports.testExternalChangesAndNoteRanges = function(test) {
  // -- start out with a blank list
  var list = [];
  var spliced = null, splicedex = null, delcount = null;
  var listener = {
    didSeek: function(aItems, aMoreExpected, aSlice) {
      spliced = aItems;
    },
    didSplice: function(aIndex, aHowMany, aItems, aRequested, aMoreExpected,
                        aSlice) {
      splicedex = aIndex;
      delcount = aHowMany;
      spliced = aItems;
    },
  };
  function reset() {
    spliced = splicedex = delcount = null;
  }

  var slice = new vst.ArrayViewSlice(list, listener);
  slice.seek(0);
  test.assertSamey(spliced, []);
  test.assert(slice.atFirst);
  test.assert(slice.atLast);

  // -- build up abcde incrementally
  reset();
  slice.mutateSplice(0, 0, "c");
  test.assertSamey(spliced, ["c"]);
  test.assertSamey(slice.liveList, ["c"]);
  test.assertEqual(slice.translateIndex(0), 0);
  test.assert(slice.atFirst);
  test.assert(slice.atLast);

  reset();
  slice.mutateSplice(0, 0, "a");
  test.assertSamey(spliced, ["a"]);
  test.assertSamey(slice.liveList, ["a", "c"]);
  test.assertEqual(slice.translateIndex(0), 0);
  test.assertEqual(slice.translateIndex(1), 1);
  test.assert(slice.atFirst);
  test.assert(slice.atLast);

  reset();
  slice.mutateSplice(undefined, 0, "e");
  test.assertSamey(spliced, ["e"]);
  test.assertSamey(slice.liveList, ["a", "c", "e"]);
  test.assert(slice.atFirst);
  test.assert(slice.atLast);

  reset();
  // also try postSplice, since its code path differs slightly
  list.splice(1, 0, "b");
  slice.postSplice(1, 0);
  test.assertSamey(spliced, ["b"]);
  test.assertSamey(slice.liveList, ["a", "b", "c", "e"]);
  test.assert(slice.atFirst);
  test.assert(slice.atLast);

  reset();
  slice.mutateSplice(3, 0, "d");
  test.assertSamey(spliced, ["d"]);
  test.assertSamey(slice.liveList, ["a", "b", "c", "d", "e"]);
  test.assertEqual(slice.translateIndex(2), 2);
  test.assertEqual(slice.translateIndex(3), 3);
  test.assert(slice.atFirst);
  test.assert(slice.atLast);

  // -- use noteRanges to shrink our visibility
  reset();
  // chop one off the bottom
  slice.noteRanges(1, 1, 5, 5);
  test.assertEqual(splicedex, 0);
  test.assertEqual(delcount, 1);
  test.assertEqual(spliced, null);
  test.assertSamey(slice.liveList, ["b", "c", "d", "e"]);
  // chop one off the top
  reset();
  slice.noteRanges(0, 0, 3, 3);
  test.assertEqual(splicedex, 3);
  test.assertEqual(delcount, 1);
  test.assertEqual(spliced, null);
  test.assertSamey(slice.liveList, ["b", "c", "d"], "noteRanges");
  test.assertEqual(slice.translateIndex(0), 1);
  test.assertEqual(slice.translateIndex(1), 2);
  test.assertEqual(slice.translateIndex(2), 3);
  test.assert(!slice.atFirst);
  test.assert(!slice.atLast);

  // -- add stuff outside our visibility
  reset();
  slice.mutateSplice(0, 0, "(");
  test.assertEqual(spliced, null);
  test.assertSamey(slice.liveList, ["b", "c", "d"]);
  test.assertEqual(slice.translateIndex(0), 2);
  test.assertEqual(slice.translateIndex(1), 3);
  test.assertEqual(slice.translateIndex(2), 4);
  test.assertSamey(list, ["(", "a", "b", "c", "d", "e"]);

  reset();
  slice.mutateSplice(undefined, 0, ")");
  test.assertEqual(spliced, null);
  test.assertSamey(slice.liveList, ["b", "c", "d"]);
  test.assertEqual(slice.translateIndex(0), 2);
  test.assertEqual(slice.translateIndex(1), 3);
  test.assertEqual(slice.translateIndex(2), 4);
  test.assertSamey(list, ["(", "a", "b", "c", "d", "e", ")"]);

  // -- add stuff inside our visibility
  reset();
  slice.mutateSplice(3, 0, "bc");
  test.assertSamey(spliced, ["bc"]);
  test.assertSamey(slice.liveList, ["b", "bc", "c", "d"]);
  test.assertEqual(slice.translateIndex(0), 2);
  test.assertEqual(slice.translateIndex(1), 3);
  test.assertSamey(list, ["(", "a", "b", "bc", "c", "d", "e", ")"]);

  // -- delete stuff inside our visibility
  reset();
  slice.mutateSplice(4, 1);
  test.assertSamey(spliced, []);
  test.assertSamey(slice.liveList, ["b", "bc", "d"]);
  test.assertEqual(slice.translateIndex(1), 3);
  test.assertEqual(slice.translateIndex(2), 4);
  test.assertSamey(list, ["(", "a", "b", "bc", "d", "e", ")"]);

  // -- delete stuff outside our visibility
  reset();
  slice.mutateSplice(1, 1);
  test.assertEqual(spliced, null);
  test.assertSamey(slice.liveList, ["b", "bc", "d"]);
  test.assertEqual(slice.translateIndex(1), 2);
  test.assertEqual(slice.translateIndex(2), 3);
  test.assertSamey(list, ["(", "b", "bc", "d", "e", ")"]);

  // important edge case check! removing at the exclusive threshold does not
  //  shrink our range or generate a notification!
  reset();
  slice.mutateSplice(4, 1);
  test.assertEqual(spliced, null);
  test.assertSamey(slice.liveList, ["b", "bc", "d"]);
  test.assertEqual(slice.translateIndex(1), 2);
  test.assertEqual(slice.translateIndex(2), 3);
  test.assertSamey(list, ["(", "b", "bc", "d", ")"]);
};

exports.testHighLevelMutationHelpers = function(test) {
  function nameFetcher(o) {
    return o;
  }
  function nameComparator(a, b) {
    return a.localeCompare(b);
  }
  var listener = {
    didSplice: function(aIndex, aHowMany, aItems, aRequested, aMoreExpected,
                        aSlice) {
    },
    didSeek: function(aItems, aMoreExpected, aSlice) {
    },
  };

  var list = [];
  var slice = new vst.ArrayViewSlice(list, listener, null,
                                      nameFetcher, nameComparator);

  slice.add("free");
  test.assertEqual(list.toString(), ["free"].toString());

  slice.add("alloca");
  test.assertEqual(list.toString(), ["alloca", "free"].toString());

  slice.add("calloc");
  test.assertEqual(list.toString(), ["alloca", "calloc", "free"].toString());

  slice.add("malloc");
  test.assertEqual(list.toString(),
                   ["alloca", "calloc", "free", "malloc"].toString());

  slice.remove("free");
  test.assertEqual(list.toString(),
                   ["alloca", "calloc", "malloc"].toString());

  slice.remove("alloca");
  test.assertEqual(list.toString(),
                   ["calloc", "malloc"].toString());

  slice.remove("malloc");
  test.assertEqual(list.toString(),
                   ["calloc"].toString());

  slice.remove("calloc");
  test.assertEqual(list.toString(),
                   [].toString());
};

}); // end define
