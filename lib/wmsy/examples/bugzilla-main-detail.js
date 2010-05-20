var main = require("wmsy/examples/bugzilla-main");

exports.main = function bugzilla_main() {
  main.getFakeData(main.showBugDetail);
};

if (require.main == module) {
  // defer to avoid errors being reported during the initial eval pass
  setTimeout(function () {
    exports.main();
  }, 10);
}
