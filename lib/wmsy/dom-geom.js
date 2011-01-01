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
 * DOM Geometry abstraction.  The goal is to avoid having to test endless
 *  permutations for all of the UI functionality and instead just rely on
 *  well directly-tested logic.
 *
 * Situations:
 * - Popup:
 *   - Popup rectangle relative to some/origin widget.
 *   - Popup's focused widget relative to some origin widget.
 *   - Ensure the popup is fully on the screen by shifting it when needed.
 * - Scrolling:
 *   - Simple...
 *     - (Fits) Show widget it in its entirety by scrolling just on...
 *       - Padding?
 *     - (Does not fit), Show as much as possible where the information starts
 *        or per preference or something.
 *   - Complex, involving both a key focal widget and some containing widget or
 *      widget of interest...
 *     -
 **/

define("wmsy/dom-geom",
  [
    "exports",
  ],
  function (
    exports
  ) {

var TOP = -1;
var CENTER = 0;
var BOTTOM = 1;
var LEFT = -1;
var RIGHT = 1;

/**
 * Takes a position definition for how to position one rectangle relative to
 *  another rectangle and returns a function capable of performing the
 *  calculation.
 */
exports.chewRelPositionDef = function chewPositionDef(aPositioning,
                                                      aCenterOnFocus) {
  var posnode = "root";
  var pospad = 5;
  var widg_latch_x, pop_latch_x, widg_latch_y, pop_latch_y;
  var explicit_x = false, explicit_y = false;
  for (var poskey in aPositioning) {
    switch (poskey) {
      // - positioning direction directives
      // The -ish variants are intended to mean to failover to the opposite
      //  direction when things don't fit.  Not implemented. XXX.
    case "abovish":
    case "above":
      widg_latch_y = TOP;
      pop_latch_y = BOTTOM;
      explicit_y = true;
      if (!explicit_x)
        widg_latch_x = pop_latch_x = CENTER;
      posnode = aPositioning[poskey];
      break;
    case "topAlign":
      widg_latch_y = TOP;
      pop_latch_y = TOP;
      explicit_y = true;
      if (!explicit_x)
        widg_latch_x = pop_latch_x = CENTER;
      posnode = aPositioning[poskey];
      break;
    case "belowish":
    case "below":
      widg_latch_y = BOTTOM;
      pop_latch_y = TOP;
      explicit_y = true;
      if (!explicit_x)
        widg_latch_x = pop_latch_x = CENTER;
      posnode = aPositioning[poskey];
      break;
    case "rightof":
      widg_latch_x = RIGHT;
      pop_latch_x = LEFT;
      explicit_x = true;
      if (!explicit_y)
        widg_latch_y = pop_latch_y = CENTER;
      posnode = aPositioning[poskey];
      break;
    case "leftof":
      widg_latch_x = LEFT;
      pop_latch_x = RIGHT;
      explicit_x = true;
      if (!explicit_y)
        widg_latch_y = pop_latch_y = CENTER;
      posnode = aPositioning[poskey];
      break;
    case "leftBelow":
      widg_latch_x = LEFT;
      pop_latch_x = RIGHT;
      widg_latch_y = pop_latch_y = TOP;
      posnode = aPositioning[poskey];
      explicit_x = explicit_y = true;
      break;
    case "leftAlign":
      widg_latch_x = LEFT;
      pop_latch_x = LEFT;
      explicit_x = true;
      if (!explicit_y)
        widg_latch_y = pop_latch_y = CENTER;
      posnode = aPositioning[poskey];
      break;
    case "rightAlign":
      widg_latch_x = RIGHT;
      pop_latch_x = RIGHT;
      explicit_x = true;
      if (!explicit_y)
        widg_latch_y = pop_latch_y = CENTER;
      posnode = aPositioning[poskey];
      break;
    case "centerOn":
      widg_latch_x = pop_latch_x = CENTER;
      explicit_x = true;
      widg_latch_y = pop_latch_y = CENTER;
      explicit_y = true;
      posnode = aPositioning[poskey];
      break;

      // - how much padding / spacing between the relnode and the popup
    case "pad":
      pospad = aPositioning[poskey];
      break;
    }
  }

  var widgElemAttrName, popElemAttrName;
  if (posnode == "root")
    widgElemAttrName = "domNode";
  else
    widgElemAttrName = posnode + "_element";
  if (!aCenterOnFocus || aCenterOnFocus === true || aCenterOnFocus == "root")
    popElemAttrName = "domNode";
  else
    popElemAttrName = aCenterOnFocus + "_element";

  return function _position_calc(aPopBinding, aBasisBinding) {
    var widgNode = aBasisBinding[widgElemAttrName];

    // popup focal dom node
    // (We may want to position ourselves relative to a child of a given binding
    //  rather than the bounding box of the entire binding.)
    var popNode;
    // x displacement, y displacement
    var popDx, popDy;
    if (aCenterOnFocus) {
      var focusManager = aBasisBinding.domNode.ownerDocument.wmsyFocusManager;
      var focused = focusManager.focusedBinding;
      if (!focused)
        throw new Error("Popup logic wants a focused binding for positioning");
      popNode = focused[popElemAttrName];
      popDx = popNode.offsetLeft;
      popDy = popNode.offsetTop;
    }
    else {
      popNode = aPopBinding[popElemAttrName];
      popDx = popDy = 0; // we are already dealing with the upper-left corner
    }

    var widgBounds = widgNode.getBoundingClientRect();

    var tLeft, tTop;
    // - X
    if (widg_latch_x == LEFT)
      tLeft = widgBounds.left - pospad;
    else if (widg_latch_x == CENTER)
      tLeft = widgBounds.left + (widgBounds.right - widgBounds.left) / 2;
    else
      tLeft = widgBounds.right + pospad;

    // (no action required for LEFT)
    if (pop_latch_x == CENTER)
      tLeft -= popNode.clientWidth / 2;
    else if (pop_latch_x == RIGHT)
      tLeft -= popNode.clientWidth;

    // - Y
    if (widg_latch_y == TOP)
      tTop = widgBounds.top - pospad;
    else if (widg_latch_y == CENTER)
      tTop = widgBounds.top + (widgBounds.bottom - widgBounds.top) / 2;
    else // BOTTOM
      tTop = widgBounds.bottom + pospad;

    // (no action required for TOP)
    if (pop_latch_y == CENTER)
      tTop -= popNode.clientHeight / 2;
    else if (pop_latch_y == BOTTOM)
      tTop -= popNode.clientHeight;

    var docWin = popNode.ownerDocument.defaultView;
    tLeft += docWin.scrollX - popDx;
    tTop += docWin.scrollY - popDy;

    // - ensure entirely visible on the screen
    if (tTop < docWin.scrollY)
      tTop = docWin.scrollY;
    if (tLeft < docWin.scrollX)
      tLeft = docWin.scrollX;

    var overX = (tLeft + widgBounds.right - widgBounds.left) -
                  (docWin.scrollX + docWin.innerWidth);
    if (overX > 0)
      tLeft -= overX;
    var overY = (tTop + widgBounds.bottom - widgBounds.top) -
                  (docWin.scrollY + docWin.innerHeight);
    if (overY > 0)
      tTop -= overY;

    return {
      left: tLeft,
      top: tTop
    };
  };
};

}); // end define
