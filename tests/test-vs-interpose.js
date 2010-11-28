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

require.def("wmsy-tests/test-vs-interpose",
            ["wmsy/viewslice-array", "wmsy/viewslice-interpose", "exports"],
            function($vsa, $vsi, exports) {

function alphaClassify(s) {
  return s[0].toLocaleUpperCase();
}
function alphaGen(pre, post) {
  if (post !== undefined)
    return post[0].toLocaleUpperCase();
  return "!";
}
var alphaSliceDef = {
  classifier: alphaClassify,
  maker: alphaGen,
};


/**
 * Test that a full-span seek results in the expected fully processed result.
 *  Try with all first/last settings.
 */
exports.testFullSeek = function(test) {
  var list = ["Aa", "Ab", "Ba", "Ca", "Cd"];
  var expectedList = ["A", "Aa", "Ab", "B", "Ba", "C", "Ca", "Cd"];
  var listener = {
    didSeek: function(aItems, aMoreExpected, aSlice) {
      test.assertEqual(aItems.toString(), expectedList.toString());
      this.heardSeek = true;
    },
    heardSeek: false,
  };
  function reset() {
    listener.heardSeek = false;
  }

  // -- defaults (first: yes, last: no)
  var rawSlice = new $vsa.ArrayViewSlice(list, listener);
  var interpSlice = new $vsi.DecoratingInterposingViewSlice(
                          rawSlice, alphaSliceDef);
  interpSlice.seek(0);
  test.assert(listener.heardSeek);
  test.assert(interpSlice.atFirst);
  test.assert(interpSlice.atLast);

  // -- no, no
  expectedList = ["Aa", "Ab", "B", "Ba", "C", "Ca", "Cd"];
  reset();
  rawSlice = new $vsa.ArrayViewSlice(list, listener);
  interpSlice = new $vsi.DecoratingInterposingViewSlice(
                  rawSlice,
                  {
                    classifier: alphaClassify,
                    maker: alphaGen,
                    makeFirst: false,
                    makeLast: false,
                  });
  interpSlice.seek(0);
  test.assert(listener.heardSeek);
  test.assert(interpSlice.atFirst);
  test.assert(interpSlice.atLast);

  // -- no, yes
  expectedList = ["Aa", "Ab", "B", "Ba", "C", "Ca", "Cd", "!"];
  reset();
  rawSlice = new $vsa.ArrayViewSlice(list, listener);
  interpSlice = new $vsi.DecoratingInterposingViewSlice(
                  rawSlice,
                  {
                    classifier: alphaClassify,
                    maker: alphaGen,
                    makeFirst: false,
                    makeLast: true,
                  });
  interpSlice.seek(0);
  test.assert(listener.heardSeek);
  test.assert(interpSlice.atFirst);
  test.assert(interpSlice.atLast);

  // -- yes, yes
  expectedList = ["A", "Aa", "Ab", "B", "Ba", "C", "Ca", "Cd", "!"];
  reset();
  rawSlice = new $vsa.ArrayViewSlice(list, listener);
  interpSlice = new $vsi.DecoratingInterposingViewSlice(
                  rawSlice,
                  {
                    classifier: alphaClassify,
                    maker: alphaGen,
                    makeFirst: true,
                    makeLast: true,
                  });
  interpSlice.seek(0);
  test.assert(listener.heardSeek);
  test.assert(interpSlice.atFirst);
  test.assert(interpSlice.atLast);
};

/**
 * Perform a partial seek, then incrementally grow until we hit the boundaries.
 *  Perform translateIndex a few times during the process to verify it is also
 *  adapting correctly.
 */
exports.testPartialSeekAndGrowAndTranslate = function(test) {
  var list = ["Aa", "Ab", "Ba", "Ca", "Cd"];
  var spliced = null, splicedex = null;
  var listener = {
    didSeek: function(aItems, aMoreExpected, aSlice) {
      spliced = aItems;
    },
    didSplice: function(aIndex, aHowMany, aItems, aRequested, aMoreExpected,
                        aSlice) {
      splicedex = aIndex;
      spliced = aItems;
    },
  };
  function reset() {
    spliced = splicedex = null;
  }

  var rawSlice = new $vsa.ArrayViewSlice(list, listener);
  var slice = new $vsi.DecoratingInterposingViewSlice(rawSlice, alphaSliceDef);

  reset();
  slice.seek(1, 0, 0);
  test.assertSamey(spliced, ["Ab"]);
  test.assertSamey(slice.liveList, ["Ab"]);
  test.assertEqual(slice.translateIndex(0), 1);
  test.assert(!slice.atFirst);
  test.assert(!slice.atLast);

  reset();
  slice.grow(1);
  test.assertEqual(splicedex, 1);
  test.assertSamey(spliced, ["B", "Ba"]);
  test.assertSamey(slice.liveList, ["Ab", "B", "Ba"]);
  test.assertEqual(slice.translateIndex(0), 1);
  test.assertEqual(slice.translateIndex(1), 2);
  test.assertEqual(slice.translateIndex(2), 2);
  test.assert(!slice.atFirst);
  test.assert(!slice.atLast);

  reset();
  slice.grow(-1);
  test.assertEqual(splicedex, 0);
  test.assertSamey(spliced, ["A", "Aa"]);
  test.assertSamey(slice.liveList, ["A", "Aa", "Ab", "B", "Ba"]);
  test.assertEqual(slice.translateIndex(0), 0);
  test.assertEqual(slice.translateIndex(1), 0);
  test.assertEqual(slice.translateIndex(2), 1);
  test.assertEqual(slice.translateIndex(3), 2);
  test.assertEqual(slice.translateIndex(4), 2);
  test.assert(slice.atFirst);
  test.assert(!slice.atLast);

  reset();
  slice.grow(1);
  test.assertEqual(splicedex, 5);
  test.assertSamey(spliced, ["C", "Ca"]);
  test.assertSamey(slice.liveList, ["A", "Aa", "Ab", "B", "Ba", "C", "Ca"]);
  test.assert(slice.atFirst);
  test.assert(!slice.atLast);

  reset();
  slice.grow(1);
  test.assertEqual(splicedex, 7);
  test.assertSamey(spliced, ["Cd"]);
  test.assertSamey(slice.liveList,
                   ["A", "Aa", "Ab", "B", "Ba", "C", "Ca", "Cd"]);
  test.assert(slice.atFirst);
  test.assert(slice.atLast);
};

exports.testMultipleSeeks = function(test) {
  var list = ["Aa", "Ab", "Ba", "Ca", "Cd"];
  var spliced = null, splicedex = null;
  var listener = {
    didSeek: function(aItems, aMoreExpected, aSlice) {
      spliced = aItems;
    },
    didSplice: function(aIndex, aHowMany, aItems, aRequested, aMoreExpected,
                        aSlice) {
      splicedex = aIndex;
      spliced = aItems;
    },
  };
  function reset() {
    spliced = splicedex = null;
  }

  var rawSlice = new $vsa.ArrayViewSlice(list, listener);
  var slice = new $vsi.DecoratingInterposingViewSlice(rawSlice, alphaSliceDef);

  reset();
  slice.seek(1, 1, 1);
  test.assertSamey(spliced, ["A", "Aa", "Ab", "B", "Ba"]);
  test.assertSamey(slice.liveList, ["A", "Aa", "Ab", "B", "Ba"]);
  test.assert(slice.atFirst);
  test.assert(!slice.atLast);

  reset();
  slice.seek(1, 2, 2);
  test.assertSamey(spliced, ["A", "Aa", "Ab", "B", "Ba", "C", "Ca"]);
  test.assertSamey(slice.liveList, ["A", "Aa", "Ab", "B", "Ba", "C", "Ca"]);
  test.assert(slice.atFirst);
  test.assert(!slice.atLast);

  reset();
  slice.seek(2, 1, 2);
  test.assertSamey(spliced, ["Ab", "B", "Ba", "C", "Ca", "Cd"]);
  test.assertSamey(slice.liveList, ["Ab", "B", "Ba", "C", "Ca", "Cd"]);
  test.assert(!slice.atFirst);
  test.assert(slice.atLast);

  reset();
  slice.seek(2, 2, 0);
  test.assertSamey(spliced, ["A", "Aa", "Ab", "B", "Ba"]);
  test.assertSamey(slice.liveList, ["A", "Aa", "Ab", "B", "Ba"]);
  test.assert(slice.atFirst);
  test.assert(!slice.atLast);

  reset();
  slice.seek(2, 10, 0);
  test.assertSamey(spliced, ["A", "Aa", "Ab", "B", "Ba"]);
  test.assertSamey(slice.liveList, ["A", "Aa", "Ab", "B", "Ba"]);
  test.assert(slice.atFirst);
  test.assert(!slice.atLast);
};

exports.testNoteRanges = function(test) {
  var list = ["Aa", "Ab", "Ba", "Ca", "Cd"];
  var spliced = null, splicedex = null, delcount = null;
  var listener = {
    didSeek: function(aItems, aMoreExpected, aSlice) {
      spliced = aItems;
    },
    didSplice: function(aIndex, aHowMany, aItems, aRequested, aMoreExpected,
                        aSlice) {
      splicedex = aIndex;
      spliced = aItems;
      delcount = aHowMany;
    },
  };
  function reset() {
    spliced = splicedex = delcount = null;
  }

  var rawSlice = new $vsa.ArrayViewSlice(list, listener);
  var slice = new $vsi.DecoratingInterposingViewSlice(rawSlice, alphaSliceDef);

  slice.seek(0);
  // base casefor sanity; already tested by previous test cases...
  test.assertSamey(spliced, ["A", "Aa", "Ab", "B", "Ba", "C", "Ca", "Cd"]);

  // -- trying to chop off just the "A" should not do anything
  slice.noteRanges();

  // -- chopping off Aa should work though.

  // -- chopping Cd off the end should work

  // -- chopping Ca off the end should take C with it

  
};

exports.testExternalChanges = function(test) {
};

}); // end require.def
