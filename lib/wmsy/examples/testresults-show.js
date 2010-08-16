// the engine knows what our arguments were
var engine = require("teleport/engine");

exports.resultsFetch = function resultsFetch(aPath, aCallback) {
  var xhr = new XMLHttpRequest();
  xhr.open("GET", "../../../" + aPath);
  xhr.addEventListener("load", function() {
      aCallback(JSON.parse(xhr.responseText));
    }, false);
  xhr.send(null);
};


exports.main = function show_teleport_main() {
  if (!("package" in engine.env) || !("rev" in engine.env)) {
    var body = document.getElementsByTagName("body")[0];
    body.innerHTML = "No package argument, no rev argument, no service.";
    return;
  }
  var packageName = engine.env["package"];
  var rev = engine.env.rev;
  var path = packageName + "/test-runs/" + rev + ".json";
  // xhr up our doc.
  exports.resultsFetch(path, exports.showResults);
};

exports.showResults = function(aResults) {
  var wy = require("./testresults-ui").wy;
  var body = document.getElementsByTagName("body")[0];
  var binder = wy.wrapElement(body);
  binder.bind({type: "test-run-batch", obj: aResults});
};

if (require.main == module) {
  // defer to avoid errors being reported during the initial eval pass
  setTimeout(function() {
    exports.main();
  }, 10);
}
