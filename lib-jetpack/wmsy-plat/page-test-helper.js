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
 * When unit tests go bad, it's nice to be able to look at the generated web
 *  page and have some remote concept of what is going on.  Also, maybe we want
 *  to be able to show off our cool unit tests or something.  In any event, we
 *  need a way to support both fast tests and taking a looky loo.  We've been
 *  using page-worker so far for actual tests (which is nice because we avoid
 *  paint costs), but for running, we want to create tabs in the browsery
 *  thing.
 **/

var Pages = require("page-worker");
var tabs = require("tabs");
var FakeTestRunner = require("wmsy/introspect/list-tests").FakeTestRunner;

exports.makeTestPage = function(testHandle, testFunc) {
  var pageContent = "<div id='root'></div>";
  // use page-worker if it's not our fake runner
  if (testHandle.__proto__ !== FakeTestRunner.prototype) {
    var page = Pages.add(Pages.Page({
      content: pageContent,
      onReady: function() {
        testFunc(page.document, page.window);
        // remove the page when done.
        Pages.remove(page);
      }
    }));
  }
  else {
    tabs.open({
      url: "data:text/html," + pageContent,
      onOpen: function(tab) {
        // since it's a data URL it should already be fully loaded...
        testFunc(tab.contentDocument, tab.contentWindow);
      }
    });
  }
};
