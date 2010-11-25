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


function setupAlphaCheck(test) {
}

/**
 * Test that a full-span seek produces correct behaviour.
 */
exports.testFullSeek = function(test) {
  var list = ["Aa", "Ab", "Ba", "Ca", "Cd"];
  var expectedList = ["A", "Aa", "Ab", "B", "Ba", "C", "Ca", "Cd"];
  var listener = {
    didSeek: function(aBaseIndex, aItems) {
      test.assertEqual(aItems.toString(), expectedList.toString());
      this.heardSeek = true;
    },
    heardSeek: false,
  };

  var rawSlice = new vst.StaticViewSlice(list, listener);
  var interpSlice = new vsi.DecoratingInterposingViewSlice(
                      rawSlice, alphaSliceDef);
  interpSlice.seek(0);
  test.assert(listener.heardSeek);
  test.assert(interpSlice.atTop);
  test.assert(interpSlice.atBottom);
};

exports.testPartialSeek = function(test) {
};

exports.testMultipleSeeks = function(test) {
};

exports.testTranslateIndex = function(test) {
};

exports.testGrow = function(test) {
};

exports.testNoteRanges = function(test) {
};

