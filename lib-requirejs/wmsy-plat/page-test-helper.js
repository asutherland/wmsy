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


define("wmsy-plat/page-test-helper",
  [
    "exports",
  ],
  function(
    exports
  ) {

var body = null;

/**
 * The style to set on iframes to have them not visually interfere with our page
 *  but still allow the tests to have sane layout occurring.
 *
 * Right now this is just initial guesswork.
 */
var IFRAME_STYLE =
  "position: absolute; left: 0px; top: 0px; visibility: hidden; " +
  "width: 1024px; height: 800px;";

/**
 * Creates an iframe to run the test in along the lines of how the page-worker
 *  mechanism works.  The global "document" is assumed.
 */
exports.makeTestPage = function(testHandle, testFunc) {
  var doc = document;
  if (body == null) {
    body = doc.getElementsByTagName("body")[0];
  }

  var iframe = doc.createElement("iframe");
  iframe.setAttribute("style", IFRAME_STYLE);
  body.appendChild(iframe);
  // Okay, so data url's fail the same origin test and then we get sad, so...
  // There may be a less dumb way to do this, but this worked for narscribblus
  //  when it used iframes and this works for us now.
  iframe.contentDocument.open();
  iframe.contentDocument.write("<div id='root'></div>");
  iframe.contentDocument.close();

  setTimeout(function() {
    testFunc(iframe.contentDocument, iframe.contentWindow);
    body.removeChild(iframe);
  }, 0);
};

}); // end define
