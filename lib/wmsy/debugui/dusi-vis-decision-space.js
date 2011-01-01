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
 * The Original Code is Mozilla Messaging Code.
 *
 * The Initial Developer of the Original Code is
 *   The Mozilla Foundation
 * Portions created by the Initial Developer are Copyright (C) 2010
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
 * Visualizations of the decision space.
 **/

define("wmsy/debugui/dusi-vis-decision-space",
  [
    "wmsy/wmsy",
    "wmsy/decision-space",
    "wmsy/opc/protovis",
    "exports",
  ],
  function(
    $wmsy,
    $dspace,
    pv,
    exports
  ) {

var wy = exports.wy = new $wmsy.WmsyDomain({id: "vis-decision-space",
                                            domain: "wmsy-debug",
                                            clickToFocus: true});

var kDecisionBranch = $dspace.DecisionSpace.prototype.kDecisionBranch,
    kDecisionCheckList = $dspace.DecisionSpace.prototype.kDecisionCheckList,
    kDecisionResult = $dspace.DecisionSpace.prototype.kDecisionResult;

/**
 * Consume the decision tree of a decision space and its list of partials in
 *  order to produce a human readable hierarchical object representation.
 *  The partials are used to annotate nodes which have a partial pointed
 *  at them.
 *
 * The mechanism by which we associate partials with their branch nodes is to
 *  maintain a list of partials which have not yet been associated with a branch
 *  and check it against every branch as we process it.  This is O(nm) which
 *  is obviously not great but hopefully not murderous.  Another alternative
 *  would be to set expandos on the branches to name them and then just use
 *  a map.  We could also change the decision space partial evaluation logic to
 *  keep track of its path traversal and just re-compute the partials.
 */
function convertSpaceToNestedRep(dspace, extract) {
  var partials = dspace._partials.concat(), partialBranches = [], i;
  for (i = 0; i < partials.length; i++) {
    partialBranches.push(partials[i]._branch);
  }

  function traverse(branch) {
    var o = {partials: 0};
    if (branch[0] == kDecisionBranch) {
      o.kind = "branch";
      o.name = "?" + branch[1].join("."); // the attribute to check
      o.kids = {};
      if (branch[2]) {
        if (branch[4])
          o.kids["(missing)"] = traverse(branch[2]);
        else
          o.kids["(wildish)"] = traverse(branch[2]);
      }
      else {
        if (branch[4])
          o.kids.WILD = traverse(branch[4]);
      }
      if (branch[3]) {
        var map = branch[3];
        for (var key in map) {
          o.kids[key] = traverse(map[key]);
        }
      }
    }
    else if (branch[0] == kDecisionCheckList) {
      o.kind = "check";
      var constraintValuePairs = branch[1];
      var textifiedPairs = [];
      for (var iPair = 0; iPair < constraintValuePairs.length; iPair++) {
        var attrPath = constraintValuePairs[iPair][1];
        var attrVal = constraintValuePairs[iPair][2];
        textifiedPairs.push(attrPath.join(".") + "=" + attrVal);
      }
      o.name = textifiedPairs.join(",");
      o.result = extract(branch[2]);
    }
    else {
      o.kind = "result";
      o.name = extract(branch[1]);
    }

    // match up partials
    var partialIndex;
    while ((partialIndex = partialBranches.indexOf(branch)) != -1) {
      o.partials++;
      partialBranches.splice(partialIndex, 1);
    }

    return o;
  }

  var root = traverse(dspace._tree);
  return root;
}

/**
 * Transform the output of convertSpaceToNestedRep into a protovis nodes() ready
 *  form using pv.dom.
 *
 * The major transformation we perform is to transform the 'edges' of the kids
 *  map into nodes so that they are visible.  Also, checks get synthetic
 *  nodes to list what they are checking and have that be distinct from the
 *  result.
 */
function convertNestedRepToProtoVisRep(root) {
  // count the number of leaves so that we can size the duder
  var leafCount = 0;

  // Because of normalization, this is only invoked on kDecisionBranch
  //  produced nodes.  we internally handle the other types which can only
  //  occur as children of branches.
  function traverseBranch(inode, pvparent) {
    for (var kidName in inode.kids) {
      var pvedge = new pv.Dom.Node({name: kidName, kind: "case", partials: 0});
      pvparent.appendChild(pvedge);

      var kid = inode.kids[kidName];
      var pvkid = new pv.Dom.Node(kid);
      pvedge.appendChild(pvkid);

      if (kid.kind == "branch") {
        traverseBranch(kid, pvkid);
      }
      else if (kid.kind == "check") {
        // leave the kid transformed, but create a new synthetic result node
        var synthResult = {name: kid.result, kind: "result", partials: 0};
        var pvsynth = new pv.Dom.Node(synthResult);
        pvkid.appendChild(pvsynth);
        leafCount++;
      }
      else { // "result"
        // nothing to do, actually
        leafCount++;
      }
    }
  }

  var pvRoot = new pv.Dom.Node(root);
  traverseBranch(root, pvRoot);

  return {
    nodes: pvRoot.nodes(), //[pvRoot].concat(pvRoot.nodes()),
    leafCount: leafCount,
  };
}

wy.defineWidget({
  name: "vis-decision-tree",
  constraint: {
    type: "tool",
    obj: {id: "vis-decision-tree"},
  },
  structure: {
    kanvaz: {},
  },
  style: {
    root: [
      "background-color: white;",
      "border: 1px solid black;",
    ],
  },
  impl: {
    postInit: function() {
      var dspace = this.obj.domain.dtree;
      // get the rep
      function extractName(widgetFactory) {
        return widgetFactory.proto.__cssClassBaseName.slice(0, -1);
      }
      var nestedRep = convertSpaceToNestedRep(dspace, extractName);
      var pvRep = convertNestedRepToProtoVisRep(nestedRep);

      // required height is a function of the number of leaves
      var HEIGHT = pvRep.leafCount * 14;
      var LEFT_LABEL_SPACE = 60;
      var RIGHT_LABEL_SPACE = 200;
      // XXX perhaps we should just size to the window?
      var WIDTH = 1000 - LEFT_LABEL_SPACE - RIGHT_LABEL_SPACE;

      var vis = this.vis = new pv.Panel()
        .width(WIDTH)
        .height(HEIGHT)
        .canvas(this.kanvaz_element)
        .margin(8)
        .left(LEFT_LABEL_SPACE)
        .right(RIGHT_LABEL_SPACE)
        .fillStyle("white");

      var layout = vis.add(pv.Layout.Partition)
        .nodes(pvRep.nodes)
        .orient("left");

      // crib the style of the dendrogram example.
      layout.link.add(pv.Line)
        .strokeStyle("#cccccc")
        .lineWidth(1)
        .antialias(false);

      var colorMap = pv.Scale.ordinal("branch", "check", "result")
        .range("grey", "yellow", "green")
        .by(function(d) { return d.nodeValue.kind; });

      var colorNoPartials = pv.color("gray");
      var colorPartials = pv.color("purple");

      layout.node.add(pv.Dot)
        .fillStyle(colorMap)
        .strokeStyle(function(d) {
                       if (d.nodeValue.partials)
                         return colorPartials;
                       else
                         return colorNoPartials;
                     })
        .lineWidth(function(d) {
                     return d.nodeValue.partials + 1;
                   });

      layout.label.add(pv.Label)
        .text(function(d) { return d.nodeValue.name; })
        .antialias(false);

      vis.render();
    },
  },
});

}); // end define
