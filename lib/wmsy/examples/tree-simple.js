/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at:
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is Wmsy widget library code.
 *
 * The Initial Developer of the Original Code is
 *   The Mozilla Foundation
 * Portions created by the Initial Developer are Copyright (C) 2011
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Andrew Sutherland <asutherland@asutherland.org>
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

/**
 * Dumb tree hierarchy thing; this would better exist as a wmsy jstut example.
 **/

define(
  [
    'wmsy/wmsy',
    'wmsy/wlib/hier',
    'text!./tree-simple.css',
    'exports'
  ],
  function(
    $wmsy,
    $_wlib_hier, // unused, just a dependency
    $_css,
    exports
  ) {

var wy = new $wmsy.WmsyDomain({id: "tree-simple",
                              domain: "tree-simple",
                              css: $_css});

function a(name, kids) {
  return {name: name, type: "a", kids: kids || []};
}
function b(name, kids) {
  return {name: name, type: "b", kids: kids || []};
}
function c(name, kids) {
  return {name: name, type: "c", kids: kids || []};
}

var treeRoot = a("Root", [
  a("Apple"),
  b("Baboon"),
  c("Car"),
  a("Atom", [
    b("Bunny", [
      c("Computer")
      ]),
    c("Crayon")
    ]),
  c("Casement", [
    a("Apricot")
    ])
  ]);

// Yes, we could accomplish the same net result by having a single widget type
//  that exposed its type via a DOM attribute for the CSS to vary over.  We
//  are doing this to demonstrate that we can indeed use different widgets
//  based on the constraints.
wy.defineWidget({
  name: "ti-a",
  constraint: {
    type: "tree-item",
    obj: {type: "a"},
  },
  focus: wy.focus.item,
  structure: wy.bind("name"),
});
wy.defineWidget({
  name: "ti-b",
  constraint: {
    type: "tree-item",
    obj: {type: "b"},
  },
  focus: wy.focus.item,
  structure: wy.bind("name"),
});
wy.defineWidget({
  name: "ti-c",
  constraint: {
    type: "tree-item",
    obj: {type: "c"},
  },
  focus: wy.focus.item,
  structure: wy.bind("name"),
});


wy.defineWidget({
  name: "ai",
  constraint: {
    type: "alt-tree-item",
  },
  focus: wy.focus.item,
  structure: wy.bind("name"),
});

wy.defineWidget({
  name: "root",
  constraint: {
    type: "root",
  },
  focus: wy.focus.domain.horizontal("tree", "altTree"),
  structure: {
    tree: wy.libWidget({
              type: "hier",
              constraint: {type: "tree-item"},
              kidsAttr: "kids",
            }, "rootNode"),
    altTree: wy.libWidget({
              type: "hier",
              constraint: {type: "alt-tree-item"},
              kidsAttr: "kids",
            }, "rootNode"),
  },
});

exports.main = function main(baseRelPath, doc) {
  // this would matter if we had images referenced by css.
  wy.setPackageBaseRelPath(baseRelPath);

  console.log("starting to show stuff");
  var emitter = wy.wrapElement(doc.getElementById("content"));

  var rootObj = {
    rootNode: treeRoot,
  };

  emitter.emit({type: "root", obj: rootObj});
};


}); // end define
