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
* Portions created by the Initial Developer are Copyright (C) 2009 the Initial
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


define("wmsy-tests/test-css",
            ["wmsy/wmsy-style", "exports"],
            function($style, exports) {

/**
 * Test CSS generation by transforming objects.  XXX legacy test, needs fancy.
 */
exports.testCssBasics = function testCssBasics(test) {
  var cssMapifications = [
    [{root: "a: b;"}, ".z-root {a: b;}"],
    [{foo: "a: b;"}, ".z-foo {a: b;}"],
    [{root: {":hover": {foo: "a: b;"}}}, ".z-root:hover > .z-foo {a: b;}"],
    [{foo: {":hover": "a: b;"}}, ".z-foo:hover {a: b;}"],
  ];
  const cssPrefix = "z-";

  var domain = new $style.WmsyStyleBundle("test");

  for (var i = 0; i < cssMapifications.length; i++) {
    var testObj = cssMapifications[i][0];
    var expected = cssMapifications[i][1];

    var blob = domain.styleChew(testObj, cssPrefix);
    blob = blob.replace(/\n/g, "")
               .replace(/ +/g, " ")
               .replace(/{ /g, "{");
    test.assertEqual(expected, blob);
  }
};

}); // end define
