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
* The Original Code is Wmsy widget manifesting system.
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

define("wmsy/decision-space",
  [
    "exports",
  ],
  function (
    exports
  ) {

function Partial(aSpace, aBranch, aObjWillHave, aObjWillNeverHave) {
  this._space = aSpace;
  this._branch = aBranch;
  this._objWillHave = aObjWillHave;
  this._objWillNeverHave = aObjWillNeverHave;
}
Partial.prototype = {
  evaluate: function Partial_evaluate(aObj) {
    var rval = this._space.evaluate(aObj, this._branch);
    //dump("evaluated: " + JSON.stringify(aObj, null, 2) + "\n");
    //dump("  " + uneval(rval) + "\n");
    return rval;
  }
};
exports.Partial = Partial;

var print;

/**
 * Enables you to take an object/context and find the most appropriate
 *  possibility previously registered (given per-possibility constraints.)
 *  We attempt to do this efficiently.
 *
 * Currently, constraints provide for:
 * - Checking that an attribute is not present.
 * - Checking that an attribute has a specific value.
 * - Checking that an attribute has a value and there is no specific value case
 *   covering it.
 *
 * Attributes may be nested arbitrarily deep inside objects.
 *
 * Our implementation is a decision-tree with support for partial evaluation
 *  of paths along the decision tree.
 *
 * In order to allow for predictable behaviour, each decision space is able to
 *  define an explicit ordering of attributes for consideration.  This makes
 *  our behaviour roughly analogous to multi-method dispatch where arguments
 *  are considered in a specific positional ordering (left-to-right, usually).
 * When an explicit prioritization is not in play, an arbitrary heuristic is
 *  used to decide the next attribute to consider which provides no guarantee of
 *  stability.  This is currently the count of the number of references to
 *  attributes by possibilities but could change in the future to favor
 *  attribute counts per partial evaluations, a weighted heuristic, or anything.
 *  The heuristic does know to defer attributes associated with WILD values to
 *  the end of the line because of the assumption it is used for
 *  parameterization.
 *
 *
 * We do not do the following, but could.  Note that in general, you can work
 *  around these limitations through the introduction of helper getters whose
 *  use replaces all references to the raw value.  The reason we do not do these
 *  things is that the limitation ensures that at any decision point a
 *  constraint will only continue to live-on in exactly one of the
 *  sub-decisions.
 * - Check that an attribute is present (and has any value).
 * - Check that an attribute does not have a specific value.
 * - Check that an attribute is LT/LTE/GT/GTE a value.
 * - Check that an attribute matches some regex.
 *
 *
 *
 * Our implementation assumes that there will be a reasonable amount of
 *  similarity between the constraints provided and that the pathological
 *  case of non-overlapping constraints will not occur.  If we thought
 *  non-overlapping cases were sufficiently probable we could require
 *  consistent ordering of constraint attributes (and evaluation sets) and/or
 *  use iteration over the evaluation set to avoid checking a lof of empty
 *  properties.
 *
 * Note: As implemented, the decision process is arbitrary and therefore
 *  theoretically unsound.  This will likely be resolved at some point by
 *  having domains define a strict ordering of attribute importance.  This
 *  effectively turns us into multi-method dispatch
 */
function DecisionSpace(aAttrPriorities) {
  this._possibilities = [];
  this._partials = [];
  this._dirty = false;

  this._attrPriorityMap = {};
  if (aAttrPriorities) {
    for (var iAttr = 0; iAttr < aAttrPriorities.length; iAttr++) {
      var attrName = aAttrPriorities[iAttr];
      this._attrPriorityMap[attrName] = iAttr;
    }
  }

  //if (!print) {
  //  this._weakify = Components.utils.getWeakReference;
  //}
  // XXX forget weak reference support for now
  this._weakify = null;
}
DecisionSpace.prototype = {
  /**
   * Sentinel value that indicates that any value is acceptable.  Other
   *  possibilities may specify explicit values for the attribute.  If those
   *  overrides match on their (explicit) value, they will match.
   */
  WILD: {},
  /**
   * The same as WILD from our purposes but allows for callers to create
   *  semantic differences from WILD.
   */
  WILD2: {},

  _default_priority: 128,
  _wild_priority: 255,
  _lowest_priority: 256,

  /**
   * A list of tuples of [constraint, the possibility value].
   */
  _possibilities: null,
  /**
   * List of Partial instances that belong to this decision space.  In cases
   * where weak references are supported (aka we've got XPConnect) these are
   * actually weak references to Partial instances.
   */
  _partials: null,
  /**
   * Has a new possibility been added since the last build()?
   */
  _dirty: null,

  /**
   * The decision tree is a self-similar structure where every decision node is
   *  a list whose first value is one of the kDecision constants and the rest
   *  of the arguments in the list are defined by the type of branch.
   */
  _tree: null,

  /**
   * This is a branch node.  The second item in the list is the attribute list
   *  to test.  The third item in the list is the 'missing' decision tree case,
   *  the fourth item is the present object case whose keys are (strinigified)
   *  attribute values and whose values are decision trees.  The fifth item is
   *  the wild branch.
   */
  kDecisionBranch: 0,
  /**
   * This is a node where there is only one possible constraint/thing that
   *  matches, but we need to check a few more attributes before we declare
   *  it a match.  If any fail to match, we will return null.
   * The second item is the (transformed) list of constraints that have to be
   *  checked and the third item is the result 'thing' if a match occurs.
   */
  kDecisionCheckList: 1,
  /**
   * Nothing left to check, this is just a result!  Second item is the thing.
   */
  kDecisionResult: 2,

  _weakify: null,

  addPossibility: function DS_addPossibility(aConstraint, aThing) {
    this._possibilities.push([aConstraint, aThing]);
    this._dirty = true;
  },

  removePossibility: function DS_removePossibility(aThing) {
    var possibilities = this._possibilities;
    for (var i = 0; i < possibilities.length; i++) {
      var constraintThing = possibilities[i][1];
      if (constraintThing == aThing) {
        possibilities.splice(i, 1);
        return;
      }
    }
  },

  /**
   * Populate aOutList with tuples of the form: [flattened string,
   *  [list of attributes to traverse], value it should have]
   *
   * @args[
   *   @param[aOutList]{
   *     The list to mutate with tuples per above.
   *   }
   *   @param[aObj]{
   *     The object to traverse and flatten.
   *   }
   *   @param[aWildAttrs]{
   *     An object to mutate whose keys are the flattened names of attributes
   *     whose values ever were |WILD|.  The value is always true and does not
   *     actually matter.
   *   }
   *   @param[aParentPath #:optional]{
   *     The current attribute path, used for recursive traversal.
   *   }
   * ]
   */
  _flattenAndNormalize: function DS__flattenAndNormalize(
    aOutList, aObj, aWildAttrs, aParentPath
  ) {
    for (var key in aObj) {
      var value = aObj[key];
      var curPath;
      if (aParentPath) {
        curPath = aParentPath.concat();
        curPath.push(key);
      }
      else {
        curPath = [key];
      }

      // terminal node if null or not an object
      if ((value == null) || (typeof(value) != "object")) {
        var flatAttr = curPath.join("\0");
        aOutList.push([flatAttr, curPath, value]);
        if (value === this.WILD || value === this.WILD2)
          aWildAttrs[flatAttr] = true;
        continue;
      }
      // (sub-object!)
      this._flattenAndNormalize(aOutList, value, aWildAttrs, curPath);
    }
  },

  /**
   * Build a decision tree for all of our existing constraints.
   *
   * In a simple world, we would only support constraints where the value is
   *  a primitive value (and not a sub-object).  In this simple world, we can
   *  build a decision tree by doing the following at each state:
   *
   * - Counting the number of times each attribute key is seen across the
   *    possible constraints at this part of the decision tree.
   * - Creating a new decision point that examines that key.  We partition the
   *    possible constraints at this part of the tree based on the key.  The
   *    possible resulting sets are constraints that didn't mention the key
   *    at all and a set for each specific value.  If there is only one
   *    constraint in the set, then it is an answer node and we can leave it
   *    like that.  Otherwise, we recursively apply our algorithm to each set.
   *
   * The complication is that we want to be able to express constraints on
   *  sub-objects as well.  The good news is that we can reduce the complex
   *  world to the simple world by flattening all nested objects into a series
   *  of independent sequential object traversals which we treat the same as
   *  straightforward primitives.  So the constraint "{a: {b: {c: 1}}}"
   *  effectively becomes "a.b.c" just like "{a: 1}" would be keyed using "a".
   * The potential inefficiency of this approach is that we perform redundant
   *  traversals.  For example, the constraint "{a: {b: {c: 1, d: 2}}}" would
   *  result in the flattened "a.b.c" and "a.b.d" where "a.b" is common.
   *  Without additional logic, we are likely to redundantly perform the
   *  traversal.  There are a number of ways to address this, but we are
   *  declaring this a non-problem.
   *
   *
   * Assuming 'n' is the number of constraints, 'k' is the maximum number of
   *  attribute parts per constraint and 't' is the total number of distinct
   *  attributes referenced: we expect to produce O(n) decision nodes with
   *  O(n log(n) k) annoying attribute traversals dominating.
   */
  build: function DS_build() {
    if (!this._dirty)
      return;

    // -- Flatten each possibility's constraints
    var allConstraintsWithValues = [];
    var attrsMarkedWild = {};
    var possibilities = this._possibilities;
    for (var iPoss = 0; iPoss < possibilities.length; iPoss++) {
      // (I miss Iterator and destructuring assignment...)
      var constraintThingTupe = possibilities[iPoss];
      var constraint = constraintThingTupe[0];
      var thing = constraintThingTupe[1];

      var transformedConstraints = [];
      this._flattenAndNormalize(transformedConstraints, constraint,
                                attrsMarkedWild, null);
      allConstraintsWithValues.push([transformedConstraints, thing]);
    }

    this._tree = [];
    // ---- Iterative processing loop.
    var procQueue = [[this._tree, allConstraintsWithValues]];
    // For each tree node we have a list of all of the valid possibility values
    //  at this point in the tree plus the associated constraints that have not
    //  yet been enforced at a higher level of the tree.
    // We decide what kind of tree node is appropriate given how many
    //  possibilities there are for the tree node.
    // If there is more than one possibility (kDecisionBranch case) then we also
    //  need to decide which constraint we are going to use as a decision basis
    //  at this point.
    while (procQueue.length) {
      // unshift would get us FIFO, but order doesn't matter to us.
      var treeNodeAndConstraintsWithValues = procQueue.pop();
      var treeNode = treeNodeAndConstraintsWithValues[0];
      var constraintsWithValues = treeNodeAndConstraintsWithValues[1];

      // --- kDecisionCheckList/kDecisionResult case
      if (constraintsWithValues.length == 1) {
        var transformedConstraints = constraintsWithValues[0][0];
        var thing = constraintsWithValues[0][1];

        // kDecisionResult if no remaining constraints
        if (!transformedConstraints.length) {
          treeNode.push(this.kDecisionResult, thing);
          continue;
        }
        // (must be kDecisionCheckList)

        treeNode.push(this.kDecisionCheckList,
                      transformedConstraints,
                      thing);
        continue;
      }

      // --- kDecisionBranch case
      // -- Choose in order of priority, then count
      var counts = {};
      var highCount = 0;
      var highPrio = this._lowest_priority;
      var highFlatAttr = null;
      var highAttrList = null;
      var iCon, itCon, tConstraints, flatAttr, attrList;
      for (iCon = 0; iCon < constraintsWithValues.length; iCon++) {
        tConstraints = constraintsWithValues[iCon][0]; // ignore [1] thing
        for (itCon = 0; itCon < tConstraints.length; itCon++) {
          flatAttr = tConstraints[itCon][0];
          attrList = tConstraints[itCon][1]; // ignore [2] value

          // always maintain count, regardles of priority
          var count;
          if (flatAttr in counts)
            count = ++counts[flatAttr];
          else
            count = counts[flatAttr] = 1;
          // figure out the priority for the attribute
          var prio;
          if (flatAttr in this._attrPriorityMap)
            prio = this._attrPriorityMap[flatAttr];
          else if (flatAttr in attrsMarkedWild)
            prio = this._wild_priority;
          else
            prio = this._default_priority;

          // choose the best (lowest) priority with the highest count
          if ((prio < highPrio) ||
              (prio == highPrio && count > highCount)) {
            highPrio = prio;
            highCount = count;
            highFlatAttr = flatAttr;
            highAttrList = attrList;
          }
        }
      }

      // Detect illegal input making us go craaaaaaazy.
      if (highFlatAttr === null) {
        console.error("You have multiple identical constraints, this breaks us.");
        for (iCon = 0; iCon < constraintsWithValues.length; iCon++) {
          console.error("duplicate thing: ", constraintsWithValues[iCon][1]);
        }
        throw new Error("per logged errors, you have illegally provided " +
                        "multiple identical constraints.");
      }

      // -- Partition the constraints by value for the key...
      // - The missing set covers the 'undefined' case.
      var missingSet = null;
      var missingBranch = null;
      // - The wild set covers the WILD case.
      var wildSet = null;
      var wildBranch = null;
      // - The value set covers all other values.
      // value to list of constraint pairs that had that value.
      var valueSet = null;
      // value to decision node for that value
      var valueMap = null;

      // Go through each constraint/possibility and look for the attribute we
      //  are branching on.  If we find it then we know to put it either in the
      //  value set or wild set.  If we don't find it then we know to put it in
      //  the missing set.
      for (iCon = 0; iCon < constraintsWithValues.length; iCon++) {
        var constraintsWithValue = constraintsWithValues[iCon];
        var containedAttr = false;
        var iterThing = constraintsWithValue[0];
        for (itCon = 0; itCon < iterThing.length; itCon++) {
          var tConTupe = iterThing[itCon];
          // tConTupe: [flat attr, attr-as-list, value]
          if (tConTupe[0] == highFlatAttr) {
            containedAttr = true;
            // Since it has the attribute, splice it out of tConstraints so that
            //  subsequent passes know the check has been taken care of.
            constraintsWithValue[0].splice(itCon, 1);
            // Put it in the value set, adding to the procQueue for new values.
            if (!valueSet) {
              valueSet = {};
              valueMap = {};
            }
            var value = tConTupe[2];
            if (value === this.WILD || value === this.WILD2) {
              if (wildSet) {
                wildSet.push(constraintsWithValue);
              }
              else {
                wildBranch = [];
                wildSet = [constraintsWithValue];
                procQueue.push([wildBranch, wildSet]);
              }
            }
            // already an entry for this in valueSet?
            else if (value in valueSet) {
              valueSet[value].push(constraintsWithValue);
            }
            // need to create the entry in valueSet and note the new branch
            else {
              var branch = valueMap[value] = [];
              var cpairs = valueSet[value] = [constraintsWithValue];
              procQueue.push([branch, cpairs]);
            }
            break;
          }
        }
        // since it was not contained, put it in the missing set
        if (!containedAttr) {
          if (missingSet) {
            missingSet.push(constraintsWithValue);
          }
          else {
            missingBranch = [];
            missingSet = [constraintsWithValue];
            procQueue.push([missingBranch, missingSet]);
          }
        }
      }

      // --- Build our tree node.
      treeNode.push(this.kDecisionBranch, highAttrList, missingBranch,
                    valueMap, wildBranch);
    }

//dump(JSON.stringify(this._tree, null, 2));

    this._updatePartials();
  },

  _attrLookup: function DS__attrLookup(aObj, aAttrList) {
    if (aAttrList.length == 1)
      return (aAttrList[0] in aObj) ? aObj[aAttrList[0]] : undefined;

    for (var i = 0; i < aAttrList.length; i++) {
      var attr = aAttrList[i];
      if (typeof(aObj) != "object" || aObj == null || !(attr in aObj))
        return undefined;
      aObj = aObj[attr];
    }
    return aObj;
  },

  /**
   * Evalute the object (in the context of a branch).
   */
  evaluate: function DS_evaluate(aObj, aBranch) {
    if (!aBranch)
      aBranch = this._tree;
    while (true) {
      if (aBranch[0] == this.kDecisionResult)
        return aBranch[1];

      if (aBranch[0] == this.kDecisionCheckList) {
        var attrChecks = aBranch[1];
        for (var i = 0; i < attrChecks.length; i++) {
          // attrChecks[i][0] is flatAttr
          var attrList = attrChecks[i][1];
          var value = attrChecks[i][2];
          if ((value !== this.WILD) && (value !== this.WILD2) &&
              (value !== this._attrLookup(aObj, attrList)))
            return null;
        }
        return aBranch[2];
      }

      // - kDecisionBranch case
      var val = this._attrLookup(aObj, aBranch[1]);
      // Missing branch?
      if (val === undefined) {
        // no missing branch exists! asplode!
        if (!aBranch[2])
          return null;
        // loop with the missing branch
        aBranch = aBranch[2];
        continue;
      }

      // A value covered by the value map
      if (val in aBranch[3]) {
        aBranch = aBranch[3][val];
        continue;
      }

      // the value is not in the map, try the WILD branch
      if (!aBranch[4]) {
        // no WILD branch?  failover to missing.
        if (aBranch[2])
          aBranch = aBranch[2];
        else
          return null;
      }
      else
        aBranch = aBranch[4];
      continue;
    }
  },

  /**
   * Partial evaluation helper.  Returns the best result branch we could find or
   *  null if there is currently no potentially valid result.  (This may change
   *  with rebuilds.)
   *
   * One quirk of our behavior is that even if the partial would fully match a
   *  kDecisionCheckList, we return the kDecisionCheckList anyways.  The claim
   *  is that this won't have a meaningful performance impact.
   */
  _internalPartial: function DS__internalPartial(aObj, aObjWillNeverHave) {
    // Build up the 'will never have' list...
    var neverHaveConstraints = [];
    var neverHaveMap = {};
    if (aObjWillNeverHave) {
      this._flattenAndNormalize(neverHaveConstraints, aObjWillNeverHave);
      for (var i = 0; i < neverHaveConstraints.length; i++) {
        var flatAttr = neverHaveConstraints[i][0];
        neverHaveMap[flatAttr] = true;
      }
    }
//debugger;
    var aBranch = this._tree;
    while (true) {
//dump("internal partial: " + JSON.stringify(aBranch, null, 2) + "\n");
      if (aBranch[0] == this.kDecisionResult)
        return aBranch;
      // As noted above, we return checklists without checking them out.
      if (aBranch[0] == this.kDecisionCheckList)
        return aBranch;

      // - kDecisionBranch case
      // If the attr is in the never have map, just take the missing branch.
      // An additional special case here is that if we are looking for
      //  {a: {a: blah}} and we have "a" in the never have map, obviously the
      //  nested case is impossible.  We also want to cover intermediary cases,
      //  so use some slicing magic to get all variations.
      var attrPath = aBranch[1];
      var bail = false;
      for (var iPLen = 1; iPLen <= attrPath.length; iPLen++) {
        if (attrPath.slice(0, iPLen).join("\0") in neverHaveMap) {
          bail = true;
          break;
        }
      }
      if (bail) {
        aBranch = aBranch[2];
        continue;
      }

      // okay, see if the dude has the attribute.
      var val = this._attrLookup(aObj, attrPath);
      // It does NOT have the attribute, we have to stop with this branch
      //  since it is not ruled out by neverHaveMap so we can't know what
      //  to do here.
      if (val === undefined)
        return aBranch;

      // A value covered by the value map
      if (val in aBranch[3]) {
        aBranch = aBranch[3][val];
        continue;
      }

      // the value is not in the map, try the WILD branch
      if (!aBranch[4]) {
        // no WILD branch?  failover to missing.
        if (aBranch[2])
          aBranch = aBranch[2];
        else
          return null;
      }
      else
        aBranch = aBranch[4];
      continue;
    }
  },

  /**
   * Perform a partial traversal, returning an object whose 'evaluate' method
   *  will perform a (potentially) optimized decision tree traversal later
   *  on.
   *
   * @args[
   *   @param[aObjWillHave]{
   *     Specific values you guarantee the object passed to evaluate will have.
   *     Every key/value pair in aObjWillHave must also exist in whatever you
   *     pass to evaluate.  Failure to do this results in aggressive byzantine
   *     failure.
   *   }
   *   @param[aObjWillNeverHave]{
   *     Specific attributes that will the object passed to evaluate will never
   *     possess.  This information allows us to optimize cases we could not
   *     otherwise optimize because the absence of a property from aObjWillHave
   *     does not allow us to infer anything.
   *   }
   * ]
   */
  partialEvaluate: function DS_partialEvaluate(aObjWillHave,
                                               aObjWillNeverHave) {
    var branch = this._tree ?
                   this._internalPartial(aObjWillHave, aObjWillNeverHave) :
                   null;
    var partial = new Partial(this, branch, aObjWillHave, aObjWillNeverHave);
    if (this._weakify)
      this._partials.push(this._weakify(partial));
    else
      this._partials.push(partial);
    return partial;
  },

  /**
   * Update all of our still-live Partial instances to be correct for the new
   *  tree.
   */
  _updatePartials: function DS__updatePartials() {
    var weakify = this._weakify;
    var oldPartials = this._partials;
    var partials = [];
    for (var i = 0; i < oldPartials.length; i++) {
      var weakPartial = oldPartials[i];
      var partial = weakify ? weakPartial.get() : weakPartial;
      if (partial) {
        partials.push(weakPartial);
        partial._branch = this._internalPartial(partial._objWillHave,
                                                partial._objWillNeverHave);
      }
    }
    this._partials = partials;
  }
};
exports.DecisionSpace = DecisionSpace;

}); // end define
