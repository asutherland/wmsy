/**
 * Test widget list functionality not covered elsewhere.
 **/

var Pages = require("page-worker");
var wmsy = require("wmsy/wmsy");

/**
 * Make sure ensureVisible with a straightforward list is able to scroll
 *  horizontally/vertically.
 */
function baseEnsureVisibleSimple(test, aVertical) {
  var vertString = aVertical ? "vertical" : "horizontal";

  var wy = new wmsy.WmsyDomain({id: "wl-ensurevisible-" + vertString,
                                domain: "wl-ensurevisible-" + vertString});

};

exports.testEnsureVisibleSimple = function testEnsureVisibleSimple(test) {

};

/**
 * Make sure ensureVisible handles
 */
exports.testEnsureVisibleComplex = function testEnsureVisibleComplex(test) {

};
