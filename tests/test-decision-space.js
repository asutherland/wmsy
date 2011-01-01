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
* Portions created by the Initial Developer are Copyright (C) 2009 the Initial
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

define("wmsy-tests/test-decision-space",
            ["wmsy/decision-space", "exports"],
            function($dspace, exports) {

var DecisionSpace = $dspace.DecisionSpace;

exports.testMain = function DecisionSpace_test(test) {
  function teq(a, b) {
    test.assertEqual(a, b);
  }

  var ds, p;
  function dumpSpace() {
    //print("---");
    //print(JSON.stringify(ds._tree, null, 2));
  }

  ds = new DecisionSpace();
  // -- Simple flat cases.
  ds.addPossibility({a: 1}, "a");

  // the first dude should be a check list at this point...
  ds.build();
  dumpSpace();
  teq(ds._tree[0], ds.kDecisionCheckList);

  ds.addPossibility({b: 1}, "b");
  ds.addPossibility({a: 1, b: 1}, "ab");

  ds.build();
  dumpSpace();

  teq(ds.evaluate({a: 1}), "a");
  teq(ds.evaluate({a: 1, z: 2}), "a");
  teq(ds.evaluate({b: 1}), "b");
  teq(ds.evaluate({a: 1, b: 1}), "ab");
  teq(ds.evaluate({a: 2, b: 1}), "b");
  teq(ds.evaluate({a: 2, b: 2}), null);

  // -- Let's get nested.
  ds.addPossibility({a: {a: 1}}, "aa");
  ds.addPossibility({b: {b: {b: 1}}}, "bbb");
  ds.addPossibility({a: {a: 1},
                     b: {b: {b: 1}}}, "aabbb");

  ds.build();
  dumpSpace();

  teq(ds.evaluate({a: {a: 1}}), "aa");
  teq(ds.evaluate({a: {a: 1}, z: 1}), "aa");
  teq(ds.evaluate({a: {a: 1, z: 1}}), "aa");
  teq(ds.evaluate({a: {a: {a: 1}}}), null);

  teq(ds.evaluate({b: {b: 1}}), null);
  teq(ds.evaluate({b: {b: {b: 1}}}), "bbb");

  teq(ds.evaluate({a: {a: 1},
                   b: {b: {b: 1}}}), "aabbb");
  teq(ds.evaluate({a: {a: 1, z: 1},
                   b: {b: {b: 1, z: 1}, z: 1},
                   z: 1}), "aabbb");

  // -- Make nested a the top-level case.  re-check aboves.
  ds.addPossibility({a: {a: 1}, q: 1}, "aaq");

  ds.build();
  dumpSpace();

  teq(ds.evaluate({a: 1}), "a");
  teq(ds.evaluate({a: {a: 1}}), "aa");


  // -- Partial
  // (This part is brittle and assumes the layout of the above code will not
  //   change.)
  // 1-step successful partial evaluation.
  teq(ds._tree[1].toString(), "a,a");
  p = ds.partialEvaluate({a: {a: 1}});
  teq(p._branch[1].toString(), "b,b,b");
  teq(p.evaluate({b: {b: {b: 1}}}), "aabbb");
  // 2-step successful partial evaluation
  p = ds.partialEvaluate({a: {a: 1},
                          b: {b: {b: 1}}});
  teq(p._branch[1], "aabbb");
  // 1-step would-be 3-step but ambiguous missing so stuck at b,b,b
  p = ds.partialEvaluate({a: {a: 1}, q: 1});
  teq(p._branch[1].toString(), "b,b,b");
  // 3-step via guaranteed not present
  p = ds.partialEvaluate({a: {a: 1}, q: 1}, {b: {b: {b: true}}});
  teq(p._branch[1], "aaq");
  // 3-step via guaranteed not present special nesting case.
  p = ds.partialEvaluate({a: {a: 1}, q: 1}, {b: true});
  teq(p._branch[1], "aaq");

  // -- Attribute prioritization
  // - "a" is the greatest!
  ds = new DecisionSpace(["a", "b"]);
  ds.addPossibility({a: 1}, "a");
  ds.addPossibility({b: 1}, "b");
  ds.build();
  dumpSpace();

  teq(ds._tree[1].toString(), "a");
  teq(ds.evaluate({a: 1, b: 1}), "a");

  // - "b" is the greatest!
  ds = new DecisionSpace(["b", "a"]);
  ds.addPossibility({a: 1}, "a");
  ds.addPossibility({b: 1}, "b");
  ds.build();
  dumpSpace();
  teq(ds._tree[1].toString(), "b");
  teq(ds.evaluate({a: 1, b: 1}), "b");


  // -- Wild support
  ds = new DecisionSpace();

  // - wild base case
  ds.addPossibility({a: ds.WILD}, "wild");
  ds.build();
  dumpSpace();

  teq(ds.evaluate({a: 1}), "wild");

  // - wild with a value
  ds.addPossibility({a: 1}, "one");
  ds.build();
  dumpSpace();

  teq(ds.evaluate({a: 1}), "one");
  teq(ds.evaluate({a: 2}), "wild");

  // - wild and missing together
  ds.addPossibility({b: 1}, "b");
  ds.build();
  dumpSpace();

  teq(ds.evaluate({a: 2}), "wild");
  teq(ds.evaluate({b: 1}), "b");
};

function print(x) {
  console.log(x);
}

}); // end define
