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
 * Layout managers for the virtual list widget.
 **/

define("wmsy/wlib/virt-layout",
  [
    "exports"
  ],
  function(
    exports
  ) {

/**
 * Child widgets are laid out in 1-dimension with automatic packing by the HTML
 *  layout engine.
 */
var LinearContinuous_LayoutMixin = {
  layoutProtoSetup: function(aConstraint) {
    if ("pixpect" in aConstraint)
      this.layoutPixpect = aConstraint.pixpect;
    else
      this.layoutPixpect = 40;


  },

  layoutInit: function() {
    /**
     * Index of the first (partially) visible binding.
     */
    this._firstVisibleIndex = null;
    /**
     * Index of the last (partially) visible binding.
     */
    this._lastVisibleIndex = null;
  },

  /**
   * Suggest the number of items to request whose binding will produce at least
   *  `aPix` worth of display pixels.
   */
  layoutSuggestRequestSize: function(aPix) {
    return aPix / this.layoutPixpect;
  },


  /**
   * Unbind/destroy widgets beyond a given pixel boundary (that are not required
   *  by something on the active side of the boundary.)
   */
  layoutDiscardExcess: function() {
      var preSpare;
  },

  /**
   * The list will have turned containerNode into limboNode; destroy all the
   *  widgets in limboNode but leave their DOM intact.  We do this prior to
   *  binding the contents of a seek.  This simplifies things since we don't
   *  have to worry about having two different live sets of children at the same
   *  time, especially including layout changes in the limboed children.
   *
   * There is no corresponding function to clean up the limbo node.  The
   *  virtual widget just nukes it when it's done with it.
   *
   * This method is responsible for clearing the `bindings` list.
   */
  layoutLimboize: function() {
    var bindings = this.bindings;
    for (var i = 0; i < bindings.length; i++) {
      var binding = bindings[i];
      binding.destroy(/* keepDom*/ true);
      // mark the node so the event handling code knows to keep its paws off.
      binding.domNode.setAttribute("wmsy-antic", "true");
    }

    this.bindings = [];
  },

  /**
   * Report all the bindings present (/ theoretically visible) in a given pixel
   *  range.  This is used to tell context visualizations what we are showing.
   *  Specifically, it is invoked for initial presentation without animation (to
   *  cover just the visible range) and when animating (to cover everything that
   *  is currently visible and will be visible during the animation.)
   */
  layoutVisibilityCheck: function(aPixAdjust, aDoNotEmit) {
    // Get the constraints of the container node, then iterate through the
    //  bindings, getting their constraints.  Anything overlapping the
    //  container node is visible.
    var visBounds = this.domNode.getBoundingClientRect();

    var startAttr = this.startAttr, endAttr = this.endAttr;

    var effStart = (aPixAdjust > 0) ? visBounds[startAttr]
                                    : visBounds[startAttr] + aPixAdjust;
    var effEnd = (aPixAdjust > 0) ? visBounds[endAttr] + aPixAdjust
                                  : visBounds[endAttr];

    var vis = [];
    var bindings = this.bindings;
    for (var i = 0; i < bindings.length; i++) {
      var kidBounds = bindings[i].domNode.getBoundingClientRect();
      if (kidBounds[endAttr] > effStart &&
          kidBounds[startAttr] < effEnd)
        vis.push(bindings[i]);
    }

    if (!aDoNotEmit)
      this.emit_visibleBindings(vis, visBounds, aPixAdjust);

    return vis;
  },

  /**
   * Bind newly added objects from a splice into the realized range.
   *
   * This method is responsible for updating the `bindings` list.
   */
  layoutSpliceAdd: function(aIndex, aItems) {
    var parentNode = this.containerNode;
    var beforeNode;
    if (aIndex !== this.bindings.length)
      beforeNode = this.bindings[aIndex].domNode;
    else
      beforeNode = null;

    var spliceArgs = [aIndex, 0];
    for(var i = 0; i < aItems.length; i++) {
      var obj = aItems[i];
      var newBinding = this._fabBefore(obj, beforeNode, parentNode);
      spliceArgs.push(newBinding);
    }
    this.bindings.splice.apply(this.bindings, spliceArgs);
  },
  /**
   * Unbind removed objects.
   *
   * This method is responsible for updating the `bindings` list.
   */
  layoutSpliceRemove: function(aIndex, aHowMany) {
    var containerNode = this.containerNode;
    var ub = aIndex + aHowMany;
    for (var i = aIndex; i < ub; i++) {
      var binding = this.bindings[i];
      var keepDom = binding.destroy();
      if (keepDom)
        binding.domNode.setAttribute("wmsy-antic", "true");
      else
        containerNode.removeChild(binding.domNode);
    }
    this.bindings.splice(aIndex, aHowMany);
  },

  /**
   * Notification that a bound widget has potentially been resized and that
   *  layout adjustments may be required.
   */
  layoutBindingPossiblyResized: function() {
  },

  layoutIterWalk: function(aStart, aDir, aCallback) {
    var linkAttr = (aDir < 0) ? "previousSibling" : "nextSibling";
    var domNode;
    if (aStart == null) {
      var vis = this.layoutVisibilityCheck(0, true);
      if (!vis.length)
        return false;
      if (aDir > 0)
        domNode = vis[0].domNode;
      else
        domNode = vis[vis.length - 1].domNode;
    }
    else {
      domNode = aStart.domNode[linkAttr];
    }

    while (domNode) {
      // ignore destroyed things that are still being animated
      if (domNode.hasAttribute("wmsy-antic"))
        continue;

      var rval = aCallback(domNode.binding);
      if (rval)
        return rval;

      domNode = domNode[linkAttr];
    }
    return false;
  },

  layoutMaybeScrollToEnsureVisible: function(aBinding, aOriginBinding) {
    var visBounds = this.domNode.getBoundingClientRect();
    var kidBounds = aBinding.domNode.getBoundingClientRect();

    // (vertical parameterizations)
    var startAttr = this.startAttr, endAttr = this.endAttr,
        dimAttr = this.dimAttr;
    var huge = false;

    // - nothing to do if already entirely visible
    if (kidBounds[startAttr] >= visBounds[startAttr] &&
        kidBounds[endAttr] <= visBounds[endAttr])
      return;

    // - degenerate case: the kid is bigger than the viewport
    // Only scroll if the kid is not visible at all, so bail if visible.
    if (kidBounds[dimAttr] >= visBounds[dimAttr]) {
      if (kidBounds[startAttr] <= visBounds[endAttr] &&
          kidBounds[endAttr] >= visBounds[startAttr])
        return;
      huge = true;
    }

    var BUFFER = 10, delta;

    // - before/above the viewport OR huge
    // scroll the top to be BUFFER pix below the top of the viewport
    if (kidBounds[this.startAttr] < visBounds[this.startAttr]) {
      delta = visBounds[startAttr] + BUFFER - kidBounds[startAttr];
    }
    // - after/below the viewport
    // scroll the bottom to be BUFFER pix above the bottom of the viewport
    else {
      delta = visBounds[endAttr] - BUFFER - kidBounds[endAttr];
    }

    this._scroll(delta);
  },
};

/**
 * Child objects are categorized and each category laid out in 1-dimension.
 *  Placement along that axis is based on multi-segment linear interpolation.
 *  Our algorithm is to place bindings in strictly increasing ordering key value
 *  (which is the order in which the view slice gives them to us anyways).  Each
 *  object has an "effective duration" which is the lesser of the delta between
 *  it and the suceeding object's ordering key value, the actual duration value
 *  if one is provided, or the default presumed duration value.  The start and
 *  endpoints of the binding on the axis combined with the ordering key and
 *  effective duration define a linear interpolation segment.  Each new linear
 *  interpolation segment replaces any existint interpolation segment that it
 *  overlaps.
 *
 * A trivial example application of this functionality is placement of music
 *  albums on a timeline, categorized by artist.  The ordering key is the year
 *  of album release and the presumed duration value is 1 year.  This will
 *  result in albums from the same year by different artists being placed in
 *  parallel.  An album released a year after another album will always occur
 *  strictly "after" that album along the layout axis.
 *
 * A more complicated example in the same domain is to track release date down
 *  to the day of release and categorize based on whether a musical release is
 *  an album or a single.  For visual effect we might size the albums to be
 *  twice as large as the singles.  We might also set the presumed duration for
 *  albums at 1 year and singles at 1 month.  This will result in singles being
 *  visually clustered inside and around the album that spawned them while
 *  providing some relative positioning that looks cool.
 *
 * Because we want to allow for widget bindings to resize themselves in response
 *  to interactive events,
 */
var MultiTrackLinear_LayoutMixin = {
};

exports.LAYOUT_MIXINS = {
  linear: LinearContinuous_LayoutMixin,
};

}); // end define
