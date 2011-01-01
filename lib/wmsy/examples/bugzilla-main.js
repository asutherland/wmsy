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

define(
  [
    "wmsy/examples/bugzilla-api",
    "wmsy/examples/bugzilla-model",
    "wmsy/examples/bugzilla-ui",
    "wmsy/examples/bugzilla-app",
    "exports",
  ],
  function(
    api,
    bzm,
    ui,
    app,
    exports
  ) {
var wy = ui.wy;

exports.getFakeData = function main_getFakeData(aCallback) {
  var xhr = new XMLHttpRequest();
  xhr.open("GET", "../../../fakedata/tb31rc1blockers.json");
  xhr.addEventListener("load", function() {
      aCallback(JSON.parse(xhr.responseText).bugs);
    }, false);
  xhr.send(null);
};

exports.showBugList = function main_showBugList(aRawBugs) {
  app.loadState();
  var bugs = bzm.chewBugs(aRawBugs);

  var binder = wy.wrapElement(document.getElementById("content"));

  for (var i = 0; i < bugs.length; i++) {
    var bug = bugs[i];
    binder.bind({type: "bug", obj: bug});
  }
};

exports.showBugDetail = function main_showBugDetail(aRawBugs) {
  app.loadState();
  var bugs = bzm.chewBugs(aRawBugs);

  var binder = wy.wrapElement(document.getElementById("body"));

  binder.bind({type: "bug-detail", obj: bugs[0]});
};

exports.main = function bugzilla_main() {
  getFakeData(exports.showBugList);
};

}); // end define
