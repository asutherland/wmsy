var api = require("wmsy/examples/bugzilla-api");
var bzm = require("wmsy/examples/bugzilla-model");

var ui = require("wmsy/examples/bugzilla-ui");
var app = require("wmsy/examples/bugzilla-app");
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

  var emitter = wy.wrapElement(document.getElementById("content"));

  for (var i = 0; i < bugs.length; i++) {
    var bug = bugs[i];
    emitter.emit({type: "bug", obj: bug});
  }
};

exports.showBugDetail = function main_showBugDetail(aRawBugs) {
  app.loadState();
  var bugs = bzm.chewBugs(aRawBugs);

  var emitter = wy.wrapElement(document.getElementById("content"));

  emitter.emit({type: "bug-detail", obj: bugs[0]});
};

exports.main = function bugzilla_main() {
  getFakeData(exports.showBugList);
};

if (require.main == module) {
  // defer to avoid errors being reported during the initial eval pass
  setTimeout(function () {
    exports.main();
  }, 10);
}
