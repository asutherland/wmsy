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
 * Test that we handle illegal things / extremely bad ideas.  These are usually
 *  bad things I have caused that would never be intentional and could save
 *  everyone a lot of trouble if we tell them about it rather than have them
 *  have to debug it.
 **/


define("wmsy-tests/test-illegal",
            ["wmsy/wmsy", "wmsy-plat/page-test-helper", "exports"],
            function(wmsy, pth, exports) {

/**
 * Avoid a widget trying to instantiate itself as a (sub)widget.
 */
exports.testSelfRecursive = function testSelfRecursive(test) {
  var wy = new wmsy.WmsyDomain({id: "recursive", domain: "i-recursive"});

  wy.defineWidget({
    name: "recursed",
    constraint: {
      type: "self-recursive",
    },
    structure: {
      sub: wy.subWidget({}),
    },
  });

  test.waitUntilDone();
  pth.makeTestPage(test, gotPage);
  function gotPage(doc, win) {
    var emitter = wy.wrapElement(doc.getElementById("root"));

    test.assertRaises(function asplode() {
      var binding = emitter.emit({type: "self-recursive", obj: {}});
    }, "self-recursive binding detected: i-recursive--recursive--recursed--sub");

    test.done();
  }
};

}); // end define
