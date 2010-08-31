var vst = require("wmsy/viewslice-static");

/**
 * A static view slice on the whole thing should return the whole thing.
 */
exports.testFullSpan = function(test) {
  var list = [1, 2, 3, 4];
  var listener = {
    didSeek: function(aBaseIndex, aItems) {
      this.gotDidSeek = true;
      test.assertEqual(aBaseIndex, 0, "base should be at zero");
      test.assertEqual(aItems.length, list.length, "list lengths");
      test.assertEqual(aItems.toString(), list.toString(), "list contents");
    },
    gotDidSeek: false,
  };
  var slice = new vst.StaticViewSlice(list, listener);
  slice.seek(0);
  test.assert(listener.gotDidSeek);
};

/**
 * Partial view slice requestKnown contract.
 */
exports.testPartialSpanBasics = function(test) {
  var list = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  var listener = {
    didSeek: function(aBaseIndex, aItems) {
      this.gotDidSeek = true;
      test.assertEqual(aBaseIndex, 4, "base should be at 3");
      test.assertEqual(aItems.length, 5, "list length");
      test.assertEqual(aItems.toString(), [4, 5, 6, 7, 8].toString(),
                       "list contents");
    },
    gotDidSeek: false,
  };

  var slice = new vst.StaticViewSlice(list, listener);
  slice.seek(6, 2, 2);
  test.assert(listener.gotDidSeek);
  test.assertEqual(slice.availLow, 4, "low avail");
  test.assertEqual(slice.availHigh, 2, "high avail");

  // grow on the bottom within bounds
  var growed = slice.requestKnown(-2);
  test.assertEqual(growed.length, 2, "lowgrow size");
  test.assertEqual(growed.toString(), [2, 3].toString(), "lowgrow contents");
  test.assertEqual(slice.availLow, 2, "low avail");
  test.assertEqual(slice.availHigh, 2, "high avail");

  // grow on the top within bounds
  growed = slice.requestKnown(1);
  test.assertEqual(growed.length, 1, "higrow size");
  test.assertEqual(growed.toString(), [9].toString(), "higrow contents");
  test.assertEqual(slice.availLow, 2, "low avail");
  test.assertEqual(slice.availHigh, 1, "high avail");

  // grow on the bottom to the limit
  growed = slice.requestKnown(-2);
  test.assertEqual(growed.length, 2, "lowgrow size");
  test.assertEqual(growed.toString(), [0, 1].toString(), "lowgrow contents");
  test.assertEqual(slice.availLow, 0, "low avail");
  test.assertEqual(slice.availHigh, 1, "high avail");

  // grow on the top to the limit
  growed = slice.requestKnown(1);
  test.assertEqual(growed.length, 1, "higrow size");
  test.assertEqual(growed.toString(), [10].toString(), "higrow contents");
  test.assertEqual(slice.availLow, 0, "low avail");
  test.assertEqual(slice.availHigh, 0, "high avail");
};

/**
 *
 */
exports.seekKeyBased = function(test) {
  function nameFetcher(o) {
    return o;
  }
  function nameComparator(a, b) {
    return a.localeCompare(b);
  }
  var listener = {
    didSeek: function(aBaseIndex, aItems) {
      this.gotDidSeek = true;
      listener.base = aBaseIndex;
      listener.items = aItems;
    },
    gotDidSeek: false,
  };

  var list = ["alpha", "bobo", "omegb", "philharmonia", "zeta", "zoot"];
  var slice = new vst.StaticViewSlice(list, listener, null,
                                      nameFetcher, nameComparator);

  slice.seek("omegc", 1, 1);
  test.assert(listener.gotDidSeek);
  test.assertEqual(listener.base, 1, "base should be at 1");
  test.assertEqual(listener.items.length, 3, "list length");
  test.assertEqual(listener.items.toString(),
                   ["bobo", "omegb", "philharmonia"].toString(),
                   "list contents");
  test.assertEqual(slice.availLow, 1, "low avail");
  test.assertEqual(slice.availHigh, 2, "high avail");

  slice.seek("omegb", 1, 1);
  test.assert(listener.gotDidSeek);
  test.assertEqual(listener.base, 1, "base should be at 1");
  test.assertEqual(listener.items.length, 3, "list length");
  test.assertEqual(listener.items.toString(),
                   ["bobo", "omegb", "philharmonia"].toString(),
                   "list contents");
  test.assertEqual(slice.availLow, 1, "low avail");
  test.assertEqual(slice.availHigh, 2, "high avail");

  slice.seek("omega", 1, 1);
  test.assert(listener.gotDidSeek);
  test.assertEqual(listener.base, 0, "base should be at 0");
  test.assertEqual(listener.items.length, 3, "list length");
  test.assertEqual(listener.items.toString(),
                   ["alpha", "bobo", "omegb"].toString(),
                   "list contents");
  test.assertEqual(slice.availLow, 0, "low avail");
  test.assertEqual(slice.availHigh, 3, "high avail");

  test.assertEqual(slice.translateIndex(2), "omegb", "translate");
};
