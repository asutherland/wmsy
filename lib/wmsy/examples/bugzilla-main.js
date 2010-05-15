var bugzilla = require("wmsy/examples/bugzilla-api").Bugzilla;
var storage = require("wmsy/examples/bugzilla-storage");
var bzm = require("wmsy/examples/bugzilla-model");

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

exports.main = function bugzilla_main() {
};

if (require.main == module) {

}
