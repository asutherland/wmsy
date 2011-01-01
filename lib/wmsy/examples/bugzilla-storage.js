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
 * Store stuff in localStorage.  This is not meant to be generic.  That comes
 *  later.
 **/

define(["exports"], function(exports) {

var OUR_NAME = "bug-bug-goose";

/**
 * Grab data requiring a revision number of aRev.  We return null if there is
 *  no data stored or its revision tag was wrong.
 */
exports.gimmie = function(aRev) {
  var whatwhat = window.localStorage.getItem(OUR_NAME);
  if (!whatwhat)
    return whatwhat;
  whatwhat = JSON.parse(whatwhat);
  if (whatwhat.rev != aRev)
    return null;
  return whatwhat.data;
};

/**
 * Store a revision-tagged object.
 */
exports.reverseGimmie = function(aRev, aWhatWhat) {
  // atul's bugzilla thing says the iPad sucks and we need to do this, although
  //  that was for sessionStorage.  Can't hurt.
  window.localStorage.removeItem(OUR_NAME);

  var persist = {
    rev: aRev,
    data: aWhatWhat,
  };
  window.localStorage.setItem(OUR_NAME, JSON.stringify(persist));
};

}); // end define
