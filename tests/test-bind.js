/*****************************BEGIN LICENSE BLOCK *****************************
* Version: MPL 1.1/GPL 2.0/LGPL 2.1
*
* The contents of this file are subject to the Mozilla Public License Version
* 1.1 (the "License"); you may not use this file except in compliance with the
* License. You may obtain a copy of the License at http://www.mozilla.org/MPL/
*
* Software distributed under the License is distributed on an "AS IS" basis,
* WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License for
* the specific language governing rights and limitations under the License.
*
* The Original Code is Thunderbird Jetpack Functionality.
*
* The Initial Developer of the Original Code is the Mozilla Foundation.
* Portions created by the Initial Developer are Copyright (C) 2010 the Initial
* Developer. All Rights Reserved.
*
* Contributor(s):
*  Andrew Sutherland <asutherland@asutherland.org> (Original Author)
*
* Alternatively, the contents of this file may be used under the terms of either
* the GNU General Public License Version 2 or later (the "GPL"), or the GNU
* Lesser General Public License Version 2.1 or later (the "LGPL"), in which case
* the provisions of the GPL or the LGPL are applicable instead of those above.
* If you wish to allow use of your version of this file only under the terms of
* either the GPL or the LGPL, and not to allow others to use your version of
* this file under the terms of the MPL, indicate your decision by deleting the
* provisions above and replace them with the notice and other provisions
* required by the GPL or the LGPL. If you do not delete the provisions above, a
* recipient may use your version of this file under the terms of any one of the
* MPL, the GPL or the LGPL.
*
****************************** END LICENSE BLOCK ******************************/

/**
 * Test wmsy binding-ish things reflect objects into the DOM the way they
 *  should.
 **/

define("wmsy-tests/test-bind",
            ["wmsy/wmsy", "wmsy-plat/page-test-helper", "exports"],
            function(wmsy, pth, exports) {

var IMAGE_DATA_URL_REDPIX = "data:image/png;base64," +
"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABAQMAAAAl21bKAAAAAXNSR0IArs4c6QAAAANQTFRF/wAA"+
"GeIJNwAAAApJREFUCNdjYAAAAAIAAeIhvDMAAAAASUVORK5CYII=";
var IMAGE_DATA_URL_BLUEPIX = "data:image/png;base64," +
"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABAQMAAAAl21bKAAAAAXNSR0IArs4c6QAAAANQTFRFAAD/"+
"injSVwAAAApJREFUCNdjYAAAAAIAAeIhvDMAAAAASUVORK5CYII=";

/**
 * Exercise the various binding methods to check that they all work as expected.
 *  We specifically want to regression check that any bindings created in a loop
 *  properly latch everything since that's easier to screw up without a 'let'.
 */
exports.testWmsyBind = function testWmsyBind(test) {
  var wy = new wmsy.WmsyDomain({id: "bind", domain: "b-bind"});

  wy.defineWidget({
    name: "bindy",
    constraint: {
      type: "bindy",
    },
    structure: {
      simpleText: wy.bind("t1"),
      simpleSingleAttr: wy.bind(wy.NONE, {attr: "a1"}),
      simpleMultiAttr: wy.bind(wy.NONE, {a: "ma1", b: "ma2"}),
      simpleCombo: wy.bind("t2", {a: "ma2", c: "ma1"}),
      complexCombo: wy.bind(["c1", "c2", "t"], {
                              x: ["c1", "a"],
                              y: ["c1", "c2", "b"],
                              z: "ma1"}),
      // For decorated flows/blocks/images we're not really concerned about
      //  attribute binding so much as whether we accidentally clobber a text
      //  binding into existence which kills their children.
      decoratedFlow: wy.flow({flowKid: {}}, {attr: "a1"}),
      decoratedBlock: wy.block({blockKid: {}}, {attr: "a1"}),
      image: wy.bindImage("img", {attr: "ma2"}),
    }
  });

  var obj1 = {
    t1: "text1",
    a1: "attr1",
    ma1: "abba1", ma2: "gabba1",
    img: IMAGE_DATA_URL_REDPIX,
    t2: "sol1",
    c1: {
      a: "foo1",
      c2: {
        b: "bar1",
        t: "bs1",
      }
    }
  };
  var obj2 = {
    t1: "text2",
    a1: "attr2",
    ma1: "abba2", ma2: "gabba2",
    img: IMAGE_DATA_URL_BLUEPIX,
    t2: "sol2",
    c1: {
      a: "foo2",
      c2: {
        b: "bar2",
        t: "bs2",
      }
    }
  };

  test.waitUntilDone();
  pth.makeTestPage(test, gotPage);
  function gotPage(doc, win) {
    var emitter = wy.wrapElement(doc.getElementById("root"));
    var bOne = emitter.emit({type: "bindy", obj: obj1});
    var bTwo = emitter.emit({type: "bindy", obj: obj2});

    test.assert(bOne, "binding one");
    test.assert(bTwo, "binding two");

    // (we duplicate the literals in case of clobbering of the underlying obj)

    // simpleText
    test.assertEqual(bOne.simpleText_element.textContent, "text1", "t1 obj1");
    test.assertEqual(bTwo.simpleText_element.textContent, "text2", "t1 obj2");

    // simpleSingleAttr
    test.assert(bOne.simpleSingleAttr_element.hasAttribute("attr"),
                "a1 obj1 present");
    test.assertEqual(bOne.simpleSingleAttr_element.getAttribute("attr"),
                     "attr1", "a1 obj1 correct");
    test.assertEqual(bOne.simpleSingleAttr_element.textContent, "",
                     "a1 obj1 text empty");
    test.assert(bTwo.simpleSingleAttr_element.hasAttribute("attr"),
                "a1 obj2 present");
    test.assertEqual(bTwo.simpleSingleAttr_element.getAttribute("attr"),
                     "attr2", "a1 obj2 correct");
    test.assertEqual(bTwo.simpleSingleAttr_element.textContent, "",
                     "a1 obj2 text empty");

    // simpleMultiAttr
    test.assertEqual(bOne.simpleMultiAttr_element.getAttribute("a"), "abba1",
                     "ma1 obj1 correct");
    test.assertEqual(bOne.simpleMultiAttr_element.getAttribute("b"), "gabba1",
                     "ma2 obj1 correct");
    test.assertEqual(bTwo.simpleMultiAttr_element.getAttribute("a"), "abba2",
                     "ma1 obj2 correct");
    test.assertEqual(bTwo.simpleMultiAttr_element.getAttribute("b"), "gabba2",
                     "ma2 obj2 correct");

    // simpleCombo
    test.assertEqual(bOne.simpleCombo_element.textContent, "sol1", "t2 obj1");
    test.assertEqual(bOne.simpleCombo_element.getAttribute("a"), "gabba1",
                     "simpleCombo a ma2 obj1");
    test.assertEqual(bOne.simpleCombo_element.getAttribute("c"), "abba1",
                     "simpleCombo c ma1 obj1");
    test.assertEqual(bTwo.simpleCombo_element.textContent, "sol2", "t2 obj2");
    test.assertEqual(bTwo.simpleCombo_element.getAttribute("a"), "gabba2",
                     "simpleCombo a ma2 obj2");
    test.assertEqual(bTwo.simpleCombo_element.getAttribute("c"), "abba2",
                     "simpleCombo c ma1 obj2");


    // complexCombo
    test.assertEqual(bOne.complexCombo_element.textContent, "bs1", "c1c2t obj1");
    test.assertEqual(bOne.complexCombo_element.getAttribute("x"), "foo1",
                     "c1a obj1 correct");
    test.assertEqual(bOne.complexCombo_element.getAttribute("y"), "bar1",
                     "c1c2d obj1 correct");
    test.assertEqual(bOne.complexCombo_element.getAttribute("z"), "abba1",
                     "complex ma1 obj1 correct");
    test.assertEqual(bTwo.complexCombo_element.textContent, "bs2", "c1c2t obj2");
    test.assertEqual(bTwo.complexCombo_element.getAttribute("x"), "foo2",
                     "c1a obj2 correct");
    test.assertEqual(bTwo.complexCombo_element.getAttribute("y"), "bar2",
                     "c1c2d obj2 correct");
    test.assertEqual(bTwo.complexCombo_element.getAttribute("z"), "abba2",
                     "complex ma1 obj2 correct");

    // decorated flow / block
    // (make sure they stayed elements and did not become text)
    test.assertEqual(bOne.decoratedFlow_element.nodeType, 1, "be elements");
    test.assertEqual(bOne.flowKid_element.nodeType, 1, "be elements");
    test.assertEqual(bOne.decoratedBlock_element.nodeType, 1, "be elements");
    test.assertEqual(bOne.blockKid_element.nodeType, 1, "be elements");
    // eh, check the attributes too
    test.assertEqual(bOne.decoratedFlow_element.getAttribute("attr"), "attr1",
                     "decorated flow attribute");
    test.assertEqual(bOne.decoratedBlock_element.getAttribute("attr"), "attr1",
                     "decorated block attribute");

    // image
    test.assertEqual(bOne.image_element.nodeType, 1, "be an element");
    test.assertEqual(bOne.image_element.tagName, "IMG", "be an img element");
    test.assertEqual(bOne.image_element.getAttribute("src"),
                     IMAGE_DATA_URL_REDPIX,
                     "have the right src attribute value");
    test.assertEqual(bOne.image_element.getAttribute("attr"), "gabba1",
                     "have the right extra attribute value");

    test.done();
  }
};

/**
 * Check fromConstraint's parameter-grabbing works with and without helper
 *  functions.
 */
exports.testFromConstraintBind = function testFromConstraintBind(test) {
  var wy = new wmsy.WmsyDomain({id: "constraint", domain: "b-constraint"});

  var mappy = {
    "foo": 1,
    "bar": 2,
    "fi": 10,
    "fum": 20,
    "goo": 30,
    "baz": 40,
  };

  wy.defineWidget({
    name: "prized",
    constraint: {
      type: "prized",
      argus: wy.WILD,
    },
    structure: {
      objText: wy.bind(wy.fromConstraint("argus")),
      objAttr: wy.bind(wy.NONE, {a: wy.fromConstraint("argus")}),
      mapText: wy.bind(wy.fromConstraint("argus", function (argus, obj) {
                         return mappy[argus] + mappy[obj[argus]];
                       })),
      mapAttr: wy.bind(wy.NONE, {
                         b: wy.fromConstraint("argus", function(argus, obj) {
                                                return mappy[obj[argus]] -
                                                         mappy[argus];
                                              })}),
    }
  });

  var obj1 = {
    "foo": "fi",
    "bar": "fum",
  };
  var obj2 = {
    "foo": "goo",
    "bar": "baz",
  };

  test.waitUntilDone();
  pth.makeTestPage(test, gotPage);
  function gotPage(doc, win) {
    var emitter = wy.wrapElement(doc.getElementById("root"));
    var b1Foo = emitter.emit({type: "prized", argus: "foo", obj: obj1});
    var b1Bar = emitter.emit({type: "prized", argus: "bar", obj: obj1});
    var b2Foo = emitter.emit({type: "prized", argus: "foo", obj: obj2});
    var b2Bar = emitter.emit({type: "prized", argus: "bar", obj: obj2});

    test.assert(b1Foo, "b1Foo");
    test.assert(b1Bar, "b1Bar");
    test.assert(b2Foo, "b2Foo");
    test.assert(b2Bar, "b2Bar");

    test.assertEqual(b1Foo.objText_element.textContent, "fi", "ot 1f");
    test.assertEqual(b1Bar.objText_element.textContent, "fum", "ot 1b");
    test.assertEqual(b2Foo.objText_element.textContent, "goo", "ot 2f");
    test.assertEqual(b2Bar.objText_element.textContent, "baz", "ot 2b");

    test.assertEqual(b1Foo.objAttr_element.getAttribute("a"), "fi", "oa 1f");
    test.assertEqual(b1Bar.objAttr_element.getAttribute("a"), "fum", "oa 1b");
    test.assertEqual(b2Foo.objAttr_element.getAttribute("a"), "goo", "oa 2f");
    test.assertEqual(b2Bar.objAttr_element.getAttribute("a"), "baz", "oa 2b");

    test.assertEqual(b1Foo.mapText_element.textContent, "11", "mt 1f");
    test.assertEqual(b1Bar.mapText_element.textContent, "22", "mt 1b");
    test.assertEqual(b2Foo.mapText_element.textContent, "31", "mt 2f");
    test.assertEqual(b2Bar.mapText_element.textContent, "42", "mt 2b");

    test.assertEqual(b1Foo.mapAttr_element.getAttribute("b"), "9", "ma 1f");
    test.assertEqual(b1Bar.mapAttr_element.getAttribute("b"), "18", "ma 1b");
    test.assertEqual(b2Foo.mapAttr_element.getAttribute("b"), "29", "ma 2f");
    test.assertEqual(b2Bar.mapAttr_element.getAttribute("b"), "38", "ma 2b");

    test.done();
  }
};

}); //end define
