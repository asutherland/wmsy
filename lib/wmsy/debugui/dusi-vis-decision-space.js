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

require.def(
  [
    "wmsy/wmsy",
    "wmsy/decision-space",
    "exports",
  ],
  function(
    $wmsy,
    $dspace,
    exports
  ) {


var kDecisionBranch = $dpsace.DecisionSpace.prototype.kDecisionBranch,
    kDecisionCheckList = $dpsace.DecisionSpace.prototype.kDecisionCheckList,
    kDecisionResult = $dpsace.DecisionSpace.prototype.kDecisionResult;

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
    partialBranches.push(partials[i]);
  }

  function traverse(branch) {
    var o = {partials: 0};
    if (branch[0] == kDecisionBranch) {
      o.kind = "branch";
      o.name = "?" + ".".join(branch[1]); // the attribute to check
      o.kids = {};
      if (branch[2])
        o.kids["(missing)"] = traverse(branch[2]);
      if (branch[4])
        o.kids.WILD = traverse(branch[4]);
      if (branch[3]) {
        var map = branch[3];
        for (var key in map) {
          o.kids[key] = traverse(map[key]);
        }
      }
    }
    else if (branch[0] == kDecisionCheckList) {
      o.kind = "check";
      // let's do synthetic recursion over the other check dudes...
      var constraintValuePairs = branch[1];

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
  }

  var root = traverse(dspace._tree);
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
function convertSpaceToProtoVisRep(root) {
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
        // create a synthetic check node to describe the checks...
// XXXXXXXXXXXXXXXXXX pickup here.
      }
      else { // "result"
        // nothing to do, actually
      }
    }
  }

  var pvRoot = new pv.Dom.Node(root);

  return traverse(root, pvRoot);
}


}); // end require.def
