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

/**
 * test-harness2 results renderer; this is an updated version of a partially
 *  completed attempt to a) get duration information for unit tests and
 *  b) report rich meta-data about results from jetpack test runs.  That
 *  still generally sounds good, but the revised plan for now is to focus on
 *  getting the tests running in the browser given the decreased turnaround
 *  and ability to bring better debugging tools into play.
 *
 * We are using narscribblus'/jstut's platform stuff since the general
 *  situation is pretty close and it could be useful to be able to suck
 *  stuff out of comments and use them or correlate backtraces.
 **/

require.def("wmsy/examples/testresults-show",
  [
    "./testresults-ui",
    "narscribblus-plat/package-info",
    "narscribblus-plat/utils/env",
    "narscribblus/utils/pwomise",
    "exports"
  ],
  function(
    $ui,
    $pkginfo,
    $env,
    $pwomise,
    exports
  ) {

var when = $pwomise.when;


exports.main = function main() {
  var env = $env.getEnv();
  if (!("package" in env) || !("rev" in env)) {
    var body = document.getElementsByTagName("body")[0];
    body.innerHTML = "No package argument, no rev argument, no service.";
    return;
  }
  var packageName = env["package"];
  var rev = env.rev;
  var path = packageName + "/" + rev + ".json";

  when($pkginfo.loadAnything(path, "test-runs"), exports.showResults);
};

exports.showResults = function(aJSONString) {
  var results = JSON.parse(aJSONString);
  var wy = $ui.wy;
  var body = document.getElementsByTagName("body")[0];
  var binder = wy.wrapElement(body);
  binder.bind({type: "test-run-batch", obj: results});
};

}); // end require.def
