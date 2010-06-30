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

/**
 * Takes a position definition for how to position one rectangle relative to
 *  another rectangle and returns a function capable of performing the
 *  calculation.
 */
exports.chewRelPositionDef = function chewPositionDef(aPositioning) {
    var relElemAttrName;
    if (posnode == "root")
      relElemAttrName = "domNode";
    else
      relElemAttrName = posnode + "_element";

  var posnode = "root";
  var posx = 0, posy = -1, pospad = 5;
  for (var poskey in aPositioning) {
    switch (poskey) {
      // - positioning direction directives
      // The -ish variants are intended to mean to failover to the opposite
      //  direction when things don't fit.  Not implemented. XXX.
    case "abovish":
    case "above":
      posx = 0;
      posy = -1;
      posnode = aPositioning[poskey];
      break;
    case "belowish":
    case "below":
      posx = 0;
      posy = 1;
      posnode = aPositioning[poskey];
      break;
    case "rightof":
      posx = 1;
      posy = 0;
      posnode = aPositioning[poskey];
      break;
    case "leftof":
      posx = -1;
      posy = 0;
      posnode = aPositioning[poskey];
      break;
      // - how much padding / spacing between the relnode and the popup
    case "pad":
      pospad = aPositioning[poskey];
      break;
    }
  }

  return function _position_calc(aNewBinding, aBasisBinding) {
    // try and figure out its size and what not...
    var width = domNode.clientWidth, height = domNode.clientHeight;
    // ?? is getBoundingClientRect more appropriate? (happier on spans?)

    var relBounds = aRelNode.getBoundingClientRect();

    var tLeft, tTop;
    if (aPosY < 0)
      tTop = relBounds.top - height + aPosY;
    else if (aPosY > 0)
      tTop = relBounds.bottom + aPosY;
    else
      tTop = relBounds.top + (relBounds.bottom - relBounds.top) / 2 -
               height / 2;
    if (aPosX < 0)
      tLeft = relBounds.left - width + aPosX;
    else if (aPosX > 0)
      tLeft = relBounds.right + aPosX;
    else
      tLeft = relBounds.left + (relBounds.right - relBounds.left) / 2 -
                width / 2;

    var docWin = aRelNode.ownerDocument.defaultView;
    tLeft += docWin.scrollX;
    tTop += docWin.scrollY;

    return {
      left: tLeft,
      top: tTop
    };
  };
};
