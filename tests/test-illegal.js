/**
 * Test that we handle illegal things / extremely bad ideas.  These are usually
 *  bad things I have caused that would never be intentional and could save
 *  everyone a lot of trouble if we tell them about it rather than have them
 *  have to debug it.
 */

var pth = require("wmsy/page-test-helper");
var wmsy = require("wmsy/wmsy");

/**
 * Avoid a widget trying to instantiate itself as a (sub)widget.
 */
exports.testSelfRecursive = function testSelfRecursive(test) {
  var wy = new wmsy.WmsyDomain({id: "recursive", domain: "i-recursive"});

  wy.defineWidget({
    name: "recursed",
    constraint: {
      type: "self-recursive",
    },
    structure: {
      sub: wy.subWidget({}),
    },
  });

  test.waitUntilDone();
  pth.makeTestPage(test, gotPage);
  function gotPage(doc, win) {
    var emitter = wy.wrapElement(doc.getElementById("root"));

    test.assertRaises(function asplode() {
      var binding = emitter.emit({type: "self-recursive", obj: {}});
    }, "self-recursive binding detected: i-recursive-recursive-recursed-sub");

    test.done();
  }
};
