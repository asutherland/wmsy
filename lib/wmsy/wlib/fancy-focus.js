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
 * Implements a fancy focus ring
 **/

define("wmsy/wlib/fancy-focus",
  [
    "wmsy/wmsy-core",
    "wmsy/dom-geom",
    "wmsy/platfo",
    "text!./fancy-focus.css",
    "exports"
  ],
  function(
    $wmsy,
    $domGeom,
    $platfo,
    $_css,
    exports
  ) {

var wy = new $wmsy.WmsyDomain({id: "fancy-focus", domain: "wlib",
                               css: $_css});

/**
 * A widget that provides an animated focus ring, and is kept up-to-date by the
 *  `FocusManager`.
 *
 * The major complexities it has to deal with are:
 * @itemize[
 *   @item{
 *     Scrolling regions.  If we are absolutely positioned outside of/on top of
 *     the scroll region, we are going to look stupid when the focused thing
 *     scrolls right out from under us.
 *
 *     This is dealt with by walking up the chain of bindings containing this
 *     binding and looking for one that claims to have a __scrollingDomNode.
 *     If it has one, then we know that we need to transplant our DOM node into
 *     that scrolling DOM node once we are done animating.
 *   }
 * ]
 */
wy.defineWidget({
  name: "fancy-focus",
  doc: "animated focus ring",
  constraint: {
    type: "focus-ring",
  },
  structure: {
  },
  impl: {
    postInit: function() {
      // Mark us as belonging to the antics subsystem to avoid being perceived
      //  as actual content.
      this.domNode.setAttribute("wmsy-antics", "true");
      this._rootContainerNode = this.domNode.parentNode;
      /**
       * The container to reparent ourselves into when the transition completes.
       */
      this._targetContainerNode = null;
      /**
       * The viewport bounds of the last thing we were trying to animate to
       *  focus on.
       */
      this._targetBounds = null;
      /**
       * The viewport bounds of the last thing we fully animated to focus on.
       *
       * The relation to _targetBounds is that in the event of multiple focus
       *  transitions during a short period of time (ex: popup destruction), we
       *  may target ourselves at various things but never actually animate to
       *  any of them.  In that case we want to try and maintain our animation
       *  position as best we can, and that is represented by where we last
       *  animated to.
       * (We cannot use our own bounds in the event that our containing
       *  node was removed from the tree.  We should consider detecting that
       *  case and only using this variable in that situation.  We could
       *  potentially have the popup tell us when it is going away as one
       *  option that also provides us with a chance to update our viewport
       *  coords in case they have become stale.)
       */
      this._activeBounds = null;
      this.domNode.addEventListener($platfo.transitionEnd,
                                    this._transitionEnd.bind(this), true);
    },
    /**
     * @args[
     *   @param[binding]{
     *     The binding to focus on.
     *   }
     * ]
     */
    focusOnBinding: function(binding) {
      var targetNode = binding.domNode, domNode = this.domNode;
      var bounds = targetNode.getBoundingClientRect();
      var win = targetNode.ownerDocument.defaultView;

      // -- walk upwards to find any containing __scrollingDomNode
      var checkBinding;
      for (checkBinding = binding.__parentBinding;
           checkBinding;
           checkBinding = checkBinding.__parentBinding) {
        if (("__scrollingDomNode" in checkBinding) &&
            checkBinding.__scrollingDomNode)
          break;
      }
      var containingNode, scrollState, relBounds;
      // __scrollingDomNode?
      if (checkBinding) {
        containingNode = checkBinding[checkBinding.__scrollingDomNode];
        relBounds = containingNode.getBoundingClientRect();
        scrollState = {x: containingNode.scrollLeft,
                       y: containingNode.scrollTop};
      }
      else {
        containingNode = this._rootContainerNode;
        scrollState = {x: win.scrollX, y: win.scrollY};
        relBounds = {top: 0, left: 0};
      }
      // If we're not staying within the same containingNode, then we either
      //  are transitioning between two scrolly regions and need to fly via the
      //  root, or we are just headed for the root.
      if (containingNode !== domNode.parentNode) {
        // fixup coordinates to be root-relative.
        relBounds = {top: 0, left: 0};
        scrollState = {x: win.scrollX, y: win.scrollY};

        // If we're already in the midst of trying to fly for this configuration,
        //  no reparenting is required
        if (this._targetContainerNode === containingNode) {
        }
        else  {
          // we are headed rootward no matter what
          this._reparentingMove(this._rootContainerNode);
          // but is it our final destination?
          if (containingNode !== this._rootContainerNode)
            this._targetContainerNode = containingNode;
        }
      }

      this._targetBounds = bounds;

      // hide if they don't want the focus ring, but keep our position
      //  up-to-date so we can fly to the next target if it wants us.
      var desiredDisplay = binding.__focusRing ? "block" : "none";
      if (desiredDisplay != domNode.style.display) {
        domNode.style.display = desiredDisplay;
        // we need to force a re-layout so animation actually happens.
        domNode.clientLeft;
      }
      domNode.style.top = (bounds.top - relBounds.top + scrollState.y) + "px";
      domNode.style.left = (bounds.left - relBounds.left + scrollState.x) + "px";
      domNode.style.height = (bounds.height) + "px";
      domNode.style.width = (bounds.width) + "px";

      // Set our border-radius based on the effective border radius of the
      //  binding.
      // XXX we are assuming symmetric borders.
      var cstyle = win.getComputedStyle(targetNode);
      var radius = cstyle.getPropertyValue("border-top-left-radius");
      domNode.style.setProperty($platfo.borderRadius, radius, null);
    },


    /**
     * Instantaneously (without animation) reparent this binding into the
     *  provided newParent.  The net result should be that we maintain the same
     *  viewport-relative position after the transition.
     *
     * One potential glitch is that our parent may have been removed from the
     *  document's DOM tree before we got told about our new target.  For this
     *  reason we always maintain our last _targetBounds.
     */
    _reparentingMove: function(newParent) {
      var domNode = this.domNode, scrollState, relBounds;
      var bounds = this._activeBounds || domNode.getBoundingClientRect();
      if (newParent === this._rootContainerNode) {
        var win = domNode.ownerDocument.defaultView;
        scrollState = {x: win.scrollX, y: win.scrollY};
        relBounds = {top: 0, left: 0};
      }
      else {
        scrollState = {x: newParent.scrollLeft,
                       y: newParent.scrollTop};
        relBounds = newParent.getBoundingClientRect();
      }

      domNode.style.setProperty($platfo.transitionPropAttr, "none", null);
      // try and get layout reflow to realize that our next twiddling should
      //  not be subject to transition, but should be the basis of a start of
      //  a new transition.
      domNode.clientTop;

      domNode.style.top = (bounds.top - relBounds.top + scrollState.y) + "px";
      domNode.style.left = (bounds.left - relBounds.left + scrollState.x) + "px";

      // append the child now that our coordinate-space is fine again.
      newParent.appendChild(domNode);
      // force the positioning inside the new parent.
//      domNode.clientTop;

      domNode.style.removeProperty($platfo.transitionPropAttr);
      // force a re-flow so we animate from this new (equivalent) state...
      domNode.clientLeft;
    },

    /**
     * Once we are done flying to where we are going, we potentially need to
     *  re-parent ourselves.
     */
    _transitionEnd: function() {
      this._activeBounds = this._targetBounds;
      if (this._targetContainerNode) {
        this._reparentingMove(this._targetContainerNode);
        this._targetContainerNode = null;
      }
    },

    /**
     * Invoked when the `FocusManager` has nothing focused.
     */
    focusLost: function() {
      this.domNode.style.display = "none";

      // transplant us back to the root container if we are not there now.
      if (this.domNode.parentNode !== this._rootContainerNode)
        this._reparentingMove(this._rootContainerNode);
    }
  },
});

}); // end define
