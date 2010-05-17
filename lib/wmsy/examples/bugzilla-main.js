var api = require("wmsy/examples/bugzilla-api");
var storage = require("wmsy/examples/bugzilla-storage");
var bzm = require("wmsy/examples/bugzilla-model");

var ui = require("wmsy/examples/bugzilla-ui");
var wy = ui.wy;

var CUR_REV = 0;

exports.loadState = function main_loadState() {
  var data = storage.gimmie(CUR_REV);
  if (!data)
    return;

  bzm.BugPeeps._loadFromObj(data.peeps);
};

exports.saveState = function main_saveState() {
  var data = {
    peeps: bzm.BugPeeps._persistToObj(),
  };
  storage.reverseGimmie(CUR_REV, data);
};

function getFakeData(aCallback) {
  var xhr = new XMLHttpRequest();
  xhr.open("GET", "../../../fakedata/tb31rc1blockers.json");
  xhr.addEventListener("load", function() {
      aCallback(JSON.parse(xhr.responseText).bugs);
    }, false);
  xhr.send(null);
}

exports.showBugList = function main_showBugList(aRawBugs) {
  var bugs = bzm.chewBugs(aRawBugs);

  var emitter = wy.wrapElement(document.getElementById("content"));
  /*
  for (var i = 0; i < bugs.length; i++) {
    var bug = bugs[i];
    emitter.emit({type: "bug", obj: bug});
  }
  */
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
