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

require.def("wmsy-tests/test-vs-generative",
            ["wmsy/viewslice-static", "exports"],
            function(vst, exports) {

/**
 * A static view slice on the whole thing should return the whole thing.
 */
exports.testFullSpan = function(test) {
  var list = [1, 2, 3, 4];
  var listener = {
    didSeek: function(aBaseIndex, aItems) {
      this.gotDidSeek = true;
      test.assertEqual(aBaseIndex, 0, "base should be at zero");
      test.assertEqual(aItems.length, list.length, "list lengths");
      test.assertEqual(aItems.toString(), list.toString(), "list contents");
    },
    gotDidSeek: false,
  };
  var slice = new vst.StaticViewSlice(list, listener);
  slice.seek(0);
  test.assert(listener.gotDidSeek);
};

/**
 * Partial view slice requestKnown contract.
 */
exports.testPartialSpanBasics = function(test) {
  var list = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  var listener = {
    didSeek: function(aBaseIndex, aItems) {
      this.gotDidSeek = true;
      test.assertEqual(aBaseIndex, 4, "base should be at 3");
      test.assertEqual(aItems.length, 5, "list length");
      test.assertEqual(aItems.toString(), [4, 5, 6, 7, 8].toString(),
                       "list contents");
    },
    gotDidSeek: false,
  };

  var slice = new vst.StaticViewSlice(list, listener);
  slice.seek(6, 2, 2);
  test.assert(listener.gotDidSeek);
  test.assertEqual(slice.availLow, 4, "low avail");
  test.assertEqual(slice.availHigh, 2, "high avail");

  // grow on the bottom within bounds
  var growed = slice.requestKnown(-2);
  test.assertEqual(growed.length, 2, "lowgrow size");
  test.assertEqual(growed.toString(), [2, 3].toString(), "lowgrow contents");
  test.assertEqual(slice.availLow, 2, "low avail");
  test.assertEqual(slice.availHigh, 2, "high avail");

  // grow on the top within bounds
  growed = slice.requestKnown(1);
  test.assertEqual(growed.length, 1, "higrow size");
  test.assertEqual(growed.toString(), [9].toString(), "higrow contents");
  test.assertEqual(slice.availLow, 2, "low avail");
  test.assertEqual(slice.availHigh, 1, "high avail");

  // grow on the bottom to the limit
  growed = slice.requestKnown(-2);
  test.assertEqual(growed.length, 2, "lowgrow size");
  test.assertEqual(growed.toString(), [0, 1].toString(), "lowgrow contents");
  test.assertEqual(slice.availLow, 0, "low avail");
  test.assertEqual(slice.availHigh, 1, "high avail");

  // grow on the top to the limit
  growed = slice.requestKnown(1);
  test.assertEqual(growed.length, 1, "higrow size");
  test.assertEqual(growed.toString(), [10].toString(), "higrow contents");
  test.assertEqual(slice.availLow, 0, "low avail");
  test.assertEqual(slice.availHigh, 0, "high avail");
};

/**
 * Test seeking logic (and reverse mapping) with a key-based ordering.
 */
exports.seekKeyBased = function(test) {
  function nameFetcher(o) {
    return o;
  }
  function nameComparator(a, b) {
    return a.localeCompare(b);
  }
  var listener = {
    didSeek: function(aBaseIndex, aItems) {
      this.gotDidSeek = true;
      listener.base = aBaseIndex;
      listener.items = aItems;
    },
    gotDidSeek: false,
    reset: function() {
      this.base = this.items = this.gotDidSeek = null;
    },
  };

  var list = ["alpha", "bobo", "omegb", "philharmonia", "zeta", "zoot"];
  var slice = new vst.StaticViewSlice(list, listener, null,
                                      nameFetcher, nameComparator);

  slice.seek("omegc", 1, 1);
  test.assert(listener.gotDidSeek);
  test.assertEqual(listener.base, 1, "base should be at 1");
  test.assertEqual(listener.items.length, 3, "list length");
  test.assertEqual(listener.items.toString(),
                   ["bobo", "omegb", "philharmonia"].toString(),
                   "list contents");
  test.assertEqual(slice.availLow, 1, "low avail");
  test.assertEqual(slice.availHigh, 2, "high avail");
  listener.reset();

  // searchKnown for known values should work...
  test.assertEqual(slice.searchKnown("bobo"), 1, "searchKnown");
  test.assertEqual(slice.searchKnown("omegb"), 2, "searchKnown");
  test.assertEqual(slice.searchKnown("philharmonia"), 3, "searchKnown");
  // searchKnown for values outside our known range should end up clamping to
  //  the buffered values...
  test.assertEqual(slice.searchKnown("a"), 1, "searchKnown");
  test.assertEqual(slice.searchKnown("zzzz"), 3, "searchKnown");


  slice.seek("omegb", 1, 1);
  test.assert(listener.gotDidSeek);
  test.assertEqual(listener.base, 1, "base should be at 1");
  test.assertEqual(listener.items.length, 3, "list length");
  test.assertEqual(listener.items.toString(),
                   ["bobo", "omegb", "philharmonia"].toString(),
                   "list contents");
  test.assertEqual(slice.availLow, 1, "low avail");
  test.assertEqual(slice.availHigh, 2, "high avail");
  listener.reset();

  slice.seek("omega", 1, 1);
  test.assert(listener.gotDidSeek);
  test.assertEqual(listener.base, 0, "base should be at 0");
  test.assertEqual(listener.items.length, 3, "list length");
  test.assertEqual(listener.items.toString(),
                   ["alpha", "bobo", "omegb"].toString(),
                   "list contents");
  test.assertEqual(slice.availLow, 0, "low avail");
  test.assertEqual(slice.availHigh, 3, "high avail");
  listener.reset();

  slice.seek("philharmonia", 1, 1);
  test.assert(listener.gotDidSeek);
  test.assertEqual(listener.base, 2, "base should be at 2");
  test.assertEqual(listener.items.length, 3, "list length");
  test.assertEqual(listener.items.toString(),
                   ["omegb", "philharmonia", "zeta"].toString(),
                   "list contents");
  test.assertEqual(slice.availLow, 2, "low avail");
  test.assertEqual(slice.availHigh, 1, "high avail");
  listener.reset();

  slice.seek("a", 1, 1);
  test.assert(listener.gotDidSeek);
  test.assertEqual(listener.base, 0, "base should be at 0");
  test.assertEqual(listener.items.length, 2, "list length");
  test.assertEqual(listener.items.toString(),
                   ["alpha", "bobo"].toString(),
                   "list contents");
  test.assertEqual(slice.availLow, 0, "low avail");
  test.assertEqual(slice.availHigh, 4, "high avail");
  listener.reset();

  slice.seek("zzzzzzzzz", 1, 1);
  test.assert(listener.gotDidSeek);
  test.assertEqual(listener.base, 4, "base should be at 4");
  test.assertEqual(listener.items.length, 2, "list length");
  test.assertEqual(listener.items.toString(),
                   ["zeta", "zoot"].toString(),
                   "list contents");
  test.assertEqual(slice.availLow, 4, "low avail");
  test.assertEqual(slice.availHigh, 0, "high avail");

  test.assertEqual(slice.translateIndex(2), "omegb", "translate");
  listener.reset();
};

}); // end require.def
