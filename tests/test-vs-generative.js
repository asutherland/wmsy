var vst = require("wmsy/viewslice-static");

/**
 * Test the general workyness of the generative view slice with ordered key
 *  space with simple translate and scale operation.
 */
exports.seekKeyBased = function(test) {
  function valToKey(val) {
    return (val - 10) * 2;
  }

  test.assertEqual(valToKey(0), -20);
  test.assertEqual(valToKey(1), -18);
  test.assertEqual(valToKey(10), 0);
  test.assertEqual(valToKey(20), 20);

  function keyToVal(key) {
    return Math.floor((key / 2) + 10);
  }

  test.assertEqual(keyToVal(-20), 0);
  test.assertEqual(keyToVal(-18), 1);
  test.assertEqual(keyToVal(0),  10);
  test.assertEqual(keyToVal(20), 20);

  function genFromVal(val) {
    return "#" + val;
  }

  test.assertEqual(genFromVal(0), "#0");
  test.assertEqual(genFromVal(1), "#1");
  test.assertEqual(genFromVal(2), "#2");

  var listener = {
    didSeek: function(aBaseIndex, aItems) {
      this.gotDidSeek = true;
      listener.base = aBaseIndex;
      listener.items = aItems;
    },
    gotDidSeek: false,
    reset: function() {
      this.base = this.items = this.gotDidSeek = null;
    },
  };

  var slice = new vst.GenerativeViewSlice(
    genFromVal, 0, 1000, listener, keyToVal, valToKey);

  slice.seek(valToKey(0), 1, 1);
  test.assert(listener.gotDidSeek);
  test.assertEqual(listener.base, 0, "base");
  test.assertEqual(listener.items.length, 2, "list length");
  test.assertEqual(listener.items.toString(),
                   ["#0", "#1"].toString(),
                   "list contents");
  test.assertEqual(slice.availLow, 0, "low avail");
  test.assertEqual(slice.availHigh, 998, "high avail");
  listener.reset();

  var growed = slice.requestKnown(2);
  test.assertEqual(growed.toString(),
                   ["#2", "#3"],
                   "grown contents");

  test.assertEqual(slice.translateIndex(0), valToKey(0));

  // searchKnown for known values should work...
  test.assertEqual(slice.searchKnown(valToKey(0)), 0, "searchKnown");
  test.assertEqual(slice.searchKnown(valToKey(1)), 1, "searchKnown");
  // searchKnown for values outside our known range should end up clamping to
  //  the buffered values...
  test.assertEqual(slice.searchKnown(valToKey(-10)), 0, "searchKnown");
  test.assertEqual(slice.searchKnown(valToKey(2000)), 3, "searchKnown");

  slice.seek(valToKey(999), 1, 1);
  test.assert(listener.gotDidSeek);
  test.assertEqual(listener.base, 998, "base");
  test.assertEqual(listener.items.length, 2, "list length");
  test.assertEqual(listener.items.toString(),
                   ["#998", "#999"].toString(),
                   "list contents");
  test.assertEqual(slice.availLow, 998, "low avail");
  test.assertEqual(slice.availHigh, 0, "high avail");
  listener.reset();

  slice.seek(valToKey(400), 1, 1);
  test.assert(listener.gotDidSeek);
  test.assertEqual(listener.base, 399, "base");
  test.assertEqual(listener.items.length, 3, "list length");
  test.assertEqual(listener.items.toString(),
                   ["#399", "#400", "#401"].toString(),
                   "list contents");
  test.assertEqual(slice.availLow, 399, "low avail");
  test.assertEqual(slice.availHigh, 598, "high avail");
  listener.reset();


};
