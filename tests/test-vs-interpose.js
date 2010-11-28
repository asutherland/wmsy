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
  return post[0].toLocaleUpperCase();
}
var alphaSliceDef = {
  classifier: alphaClassify,
  maker: alphaGen,
};


function setupAlphaCheck(test) {
}

/**
 * Test that a full-span seek produces correct behaviour.
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

  var rawSlice = new $vsa.ArrayViewSlice(list, listener);
  var interpSlice = new $vsi.DecoratingInterposingViewSlice(
                      rawSlice, alphaSliceDef);
  interpSlice.seek(0);
  test.assert(listener.heardSeek);
  test.assert(interpSlice.atFirst);
  test.assert(interpSlice.atLast);
};

exports.testPartialSeek = function(test) {
  slice.seek(1, 0, 0);

  slice.grow(-1);

  slice.grow(1);

};

exports.testMultipleSeeks = function(test) {
};

exports.testTranslateIndex = function(test) {
};

exports.testGrow = function(test) {
};

exports.testNoteRanges = function(test) {
};

exports.testExternalChanges = function(test) {
};

}); // end require.def
