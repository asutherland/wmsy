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
 * Build a UI that displays a list of all our tests.  If you click on a test,
 *  then we open that test in a new tab and run it.
 **/

var wmsy = require("wmsy/wmsy");
var ut = require("unit-test");
var file = require("file");

function MeinTestRunner() {
  this.passed = 0;
  this.failed = 0;
  this.testRunSummary = [];
}
MeinTestRunner.prototype = {
  __proto__: ut.TestRunner.prototype,
  // cause failures to die fatally so we can check what is up, yo.
  fail: function fail(message) {
    this.__proto__.__proto__.fail.call(this, message);
    throw new Error("DYING SO THAT YOU MIGHT INVESTIGATE");
  }
};
exports.FakeTestRunner = MeinTestRunner;

function loadAndRun(testFileName) {
  var runner = new MeinTestRunner();
  var moduleName = testFileName.slice(0, -3);
  var module = require(moduleName);
  var tests = [];
  for (var name in module) {
    tests.push({
      testFunction: module[name],
      name: moduleName + "." + name
    });
  }
  runner.startMany({tests: tests, onDone: function() {}});
}

var wy = new wmsy.WmsyDomain({id: "wmsy-introspect-list-tests",
                              domain: "wmsy-introspect-tests"});

wy.defineWidget({
  name: "test-list",
  constraint: {
    type: "test-list",
  },
  structure: {
    desc: "Click on a test to open it in a new tab:",
    tests: wy.widgetList({type: "test"}, "tests", {id: wy.SELF}),
  }
});

wy.defineWidget({
  name: "test",
  constraint: {
    type: "test",
  },
  structure: {
    name: wy.bind(wy.SELF),
  },
  events: {
    root: {
      click: function() {
        loadAndRun(this.obj);

      }
    }
  }
});


/**
 * Find all our tests and construct very limited meta-data about them.
 */
function findTests() {
  var diskPath;
  // Find the actual file-system path of our tests directory...
  for (var uriKey in packaging.options.resources) {
    if (!/^.+-wmsy-tests$/.test(uriKey))
      continue;

    diskPath = packaging.options.resources[uriKey];
    break;
  }
  if (!diskPath)
    throw new Error("Unable to locate unit test directory");

  console.log("listing files in", diskPath);
  var files = file.list(diskPath);
  var test_files = [];
  for (var i = 0; i < files.length; i++) {
    var name = files[i];
    if (/^test-.*\.js$/.test(name)) {
      console.log("  found test", name);
      test_files.push(name);
    }
  }
  return {
    dir: diskPath,
    tests: test_files,
  };
}

exports.manifest = function(doc) {
  var testsInfo = findTests();

  var emitter = wy.wrapElement(doc.getElementById("root"));
  var container = emitter.emit({type: "test-list", obj: testsInfo});
};
