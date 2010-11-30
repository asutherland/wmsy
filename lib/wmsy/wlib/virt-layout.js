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

require.def("wmsy/wlib/virt-layout",
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
  },

  /**
   * Suggest the number of items to request whose binding will produce at least
   *  `aPix` worth of display pixels.
   */
  layoutSuggestRequestSize: function(aPix) {
    return aPix / this.layoutPixpect;
  },


  /**
   * Bind the focal object in a seek; this is the base case on which we can
   *  use `layoutBindAround` inductively.
   */
  layoutBindNucleus: function(parentNode, obj) {
    return this._fabBefore(obj, null, parentNode);
  },
  /**
   * Bind additional objects into widgets before or after an existing binding.
   *
   * There is no reuse of bindings out of limbo.  (The precursor implementation
   *  would do this, but it lived in a much simpler world in terms of object
   *  identity.)
   */
  layoutBindAround: function(aExistingBinding, aDir, aItems,
                             aFromIndex, aToIndex) {

    var parentNode = aExistingBinding.domNode.parentNode;
    var beforeNode;
    if (aDir === -1)
      beforeNode = aExistingBinding.domNode;
    else
      beforeNode = null;

    var exclTarget = aToIndex + aDir;
    for(var i = aFromIndex; i != exclTarget; i += aDir) {
      var obj = aItems[i];
      var newBinding = this._fabBefore(obj, beforeNode, parentNode);
      if (aDir === -1)
        beforeNode = newBinding.domNode;
    }
  },
  /**
   * Unbind/destroy widgets beyond a given pixel boundary (that are not required
   *  by something on the active side of the boundary.)
   */
  layoutDiscardExcess: function() {
  },

  /**
   * Report all the bindings present (/ theoretically visible) in a given pixel
   *  range.  This is used to tell context visualizations what we are showing.
   *  Specifically, it is invoked for initial presentation without animation (to
   *  cover just the visible range) and when animating (to cover everything that
   *  is currently visible and will be visible during the animation.)
   */
  layoutVisibilityCheck: function() {
  },
  /**
   * Bind newly added objects from a splice into the realized range.
   */
  layoutSpliceAdd: function() {
  },
  /**
   * Unbind removed objects.
   */
  layoutSpliceRemove: function() {
  },
  /**
   * Notification that a bound widget has potentially been resized and that
   *  layout adjustments may be required.
   */
  layoutBindingPossiblyResized: function() {
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

}); // end require.def
