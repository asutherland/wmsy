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
            ["wmsy/viewslice-array", "exports"],
            function($vs_array, exports) {

/**
 * Test the general workyness of the generative view slice with ordered key
 *  space with simple translate and scale operation.
 */
exports.seekKeyBased = function(test) {
  function valToKey(val) {
    return (val - 10) * 2;
  }

  test.assertEqual(valToKey(0), -20);
  test.assertEqual(valToKey(1), -18);
  test.assertEqual(valToKey(10), 0);
  test.assertEqual(valToKey(20), 20);

  function keyToVal(key) {
    return Math.floor((key / 2) + 10);
  }

  test.assertEqual(keyToVal(-20), 0);
  test.assertEqual(keyToVal(-18), 1);
  test.assertEqual(keyToVal(0),  10);
  test.assertEqual(keyToVal(20), 20);

  function genFromVal(val) {
    return "#" + val;
  }

  test.assertEqual(genFromVal(0), "#0");
  test.assertEqual(genFromVal(1), "#1");
  test.assertEqual(genFromVal(2), "#2");

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

  var slice = new $vs_array.GenerativeViewSlice(
    genFromVal, 0, 1000, listener, keyToVal, valToKey);

  slice.seek(valToKey(0), 1, 1);
  test.assert(listener.gotDidSeek);
  test.assertEqual(listener.base, 0, "base");
  test.assertEqual(listener.items.length, 2, "list length");
  test.assertEqual(listener.items.toString(),
                   ["#0", "#1"].toString(),
                   "list contents");
  test.assertEqual(slice.availLow, 0, "low avail");
  test.assertEqual(slice.availHigh, 998, "high avail");
  listener.reset();

  var growed = slice.requestKnown(2);
  test.assertEqual(growed.toString(),
                   ["#2", "#3"],
                   "grown contents");

  test.assertEqual(slice.translateIndex(0), valToKey(0));

  // searchKnown for known values should work...
  test.assertEqual(slice.searchKnown(valToKey(0)), 0, "searchKnown");
  test.assertEqual(slice.searchKnown(valToKey(1)), 1, "searchKnown");
  // searchKnown for values outside our known range should end up clamping to
  //  the buffered values...
  test.assertEqual(slice.searchKnown(valToKey(-10)), 0, "searchKnown");
  test.assertEqual(slice.searchKnown(valToKey(2000)), 3, "searchKnown");

  slice.seek(valToKey(999), 1, 1);
  test.assert(listener.gotDidSeek);
  test.assertEqual(listener.base, 998, "base");
  test.assertEqual(listener.items.length, 2, "list length");
  test.assertEqual(listener.items.toString(),
                   ["#998", "#999"].toString(),
                   "list contents");
  test.assertEqual(slice.availLow, 998, "low avail");
  test.assertEqual(slice.availHigh, 0, "high avail");
  listener.reset();

  slice.seek(valToKey(400), 1, 1);
  test.assert(listener.gotDidSeek);
  test.assertEqual(listener.base, 399, "base");
  test.assertEqual(listener.items.length, 3, "list length");
  test.assertEqual(listener.items.toString(),
                   ["#399", "#400", "#401"].toString(),
                   "list contents");
  test.assertEqual(slice.availLow, 399, "low avail");
  test.assertEqual(slice.availHigh, 598, "high avail");
  listener.reset();


};

}); // end require.def
