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
 * General operation and focus checking for popups.
 **/

define("wmsy-tests/test-popups",
            ["wmsy/wmsy", "wmsy-plat/page-test-helper", "exports"],
            function(wmsy, pth, exports) {

/**
 * - Popups actually pop up.
 * - They pop up at the requested locations.
 * - Calling done makes them go away.
 * - Click away logic works to make them go away.
 */
/*exports.testPopupGeneral =*/ function testPopupGeneral(test) {
  var wy = new wmsy.WmsyDomain({id: "pu-general", domain: "pu-general"});
  // the popup
  wy.defineWidget({
    name: "hopon",
    constraint: {
      type: "pop",
      clickAway: true,

    }
  });

  // the root widget that pops up the popup
  wy.defineWidget({
    popups: {

    }
  });
};

/**
 * Check that:
 * - We push a new focus stack frame thing.
 *   - Tab should not let us escape to another focus domain.
 *   - Focus should not change because of things that happened in the popup.
 * - Escape makes them go away.
 */
/*exports.testPopupFocus = */function testPopupFocus(test) {

};

}); // end define
