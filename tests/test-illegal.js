/**
 * Test that we handle illegal things / extremely bad ideas.  These are usually
 *  bad things I have caused that would never be intentional and could save
 *  everyone a lot of trouble if we tell them about it rather than have them
 *  have to debug it.
 */

var Pages = require("page-worker");

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

  var page = Pages.add(Pages.Page({
    onReady: check,
    content: "<div id='root'></div>",
  }));

  function check() {
    var emitter = wy.wrapElement(page.document.getElementById("root"));

    test.assertRaises(function asplode() {
      var binding = emitter.emit({type: "self-recursive", obj: {}});
    }, "self-recursive binding detected: i-recursive-recursive-recursed-sub");

    test.done();
  }
};
