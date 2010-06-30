
var WmsyDomain = require("wmsy/wmsy-domain").RawWmsyDomain;

/**
 * Test CSS generation by transforming objects.  XXX legacy test, needs fancy.
 */
exports.testCssBasics = function testCssBasics(test) {
  var cssMapifications = [
    [{root: "a: b;"}, ".z-root {a: b;}"],
    [{foo: "a: b;"}, ".z-foo {a: b;}"],
    [{root: {":hover": {foo: "a: b;"}}}, ".z-root:hover .z-foo {a: b;}"],
    [{foo: {":hover": "a: b;"}}, ".z-foo:hover {a: b;}"],
  ];
  const cssPrefix = "z-";

  var domain = new WmsyDomain("test");

  for (var i = 0; i < cssMapifications.length; i++) {
    var testObj = cssMapifications[i][0];
    var expected = cssMapifications[i][1];

    var blobs = domain._styleChew(testObj, cssPrefix);
    test.assertEqual(blobs.length, 1);
    var blob = blobs[0].replace("\n", "", "g")
                       .replace(/ +/g, " ")
                       .replace("{ ", "{", "g");
    test.assertEqual(expected, blob);
  }
};
