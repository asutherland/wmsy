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

require.def("wmsy-tests/test-vs-array",
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
  var splicedIn = null;
  var listener = {
    didSeek: function(aItems, aMoreExpected, aSlice) {
      this.gotDidSeek = true;
      test.assertEqual(aItems.length, 5, "list length");
      test.assertEqual(aItems.toString(), [4, 5, 6, 7, 8].toString(),
                       "list contents");
    },
    didSplice: function(aIndex, aHowMany, aItems, aRequested, aMoreExpected,
                        aSlice) {
      splicedIn = aItems;
    },
    gotDidSeek: false,
  };

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

  splicedIn = null;
  // grow lastwards within bounds
  slice.grow(1);
  test.assertEqual(splicedIn.length, 1, "higrow size");
  test.assertEqual(splicedIn.toString(), [9].toString(), "higrow contents");
  test.assert(!slice.atFirst);
  test.assert(!slice.atLast);
  test.assertEqual(slice.liveList.toString(),
                   [2, 3, 4, 5, 6, 7, 8, 9].toString(),
                   "highgrow liveList");

  splicedIn = null;
  // grow firstwards to the limit
  slice.grow(-2);
  test.assertEqual(splicedIn.length, 2, "lowgrow size");
  test.assertEqual(splicedIn.toString(), [0, 1].toString(), "lowgrow contents");
  test.assert(slice.atFirst);
  test.assert(!slice.atLast);
  test.assertEqual(slice.liveList.toString(),
                   [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].toString(),
                   "lowgrow liveList");

  splicedIn = null;
  // grow lastwards to the limit
  slice.grow(1);
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
  var list = [];
  var splicedIn = null;
  var listener = {
    didSeek: function(aItems, aMoreExpected, aSlice) {
      this.gotDidSeek = true;
      test.assertEqual(aItems.length, 5, "list length");
      test.assertEqual(aItems.toString(), [4, 5, 6, 7, 8].toString(),
                       "list contents");
    },
    didSplice: function(aIndex, aHowMany, aItems, aRequested, aMoreExpected,
                        aSlice) {
      splicedIn = aItems;
    },
    gotDidSeek: false,
  };

  test.assert(slice.atFirst);
  test.assert(slice.atLast);

  slice.mutateSplice(0, 0, "c");
  test.assert(slice.atFirst);
  test.assert(slice.atLast);

  slice.mutateSplice(0, 0, "a");
  test.assert(slice.atFirst);
  test.assert(slice.atLast);

  slice.mutateSplice(undefined, 0, "e");
  test.assert(slice.atFirst);
  test.assert(slice.atLast);

  slice.mutateSplice(1, 0, "b");
  test.assert(slice.atFirst);
  test.assert(slice.atLast);

  slice.mutateSplice(3, 0, "d");
  test.assert(slice.atFirst);
  test.assert(slice.atLast);

  slice.noteRanges(1, 1, 4, 4);
  test.assert(!slice.atFirst);
  test.assert(!slice.atLast);



};

}); // end require.def
