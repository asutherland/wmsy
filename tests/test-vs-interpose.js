var vst = require("wmsy/viewslice-static");
var vsi = require("wmsy/viewslice-interpose");

function alphaClassify(s) {
  return s[0].toLocaleUpperCase();
}
function alphaGen(pre, post) {
  return post[0].toLocaleUpperCase();
}
var alphaSliceDef = {
  classifier: alphaClassify,
  maker: alphaGen,
};


exports.testInitialFullPass = function(test) {
  var list = ["Aa", "Ab", "Ba", "Ca", "Cd"];
  var expectedList = ["A", "Aa", "Ab", "B", "Ba", "C", "Ca", "Cd"];
  var listener = {
    didSeek: function(aBaseIndex, aItems) {
      test.assertEqual(aItems.toString(), expectedList.toString());
      this.heardSeek = true;
    },
    heardSeek: false,
  };

  var rawSlice = new vst.StaticViewSlice(list, null);
  var interpSlice = new vsi.DecoratingInterposingViewSlice(
                      rawSlice, listener, alphaSliceDef);
  interpSlice.seek(0);
  test.assert(listener.heardSeek);
};
