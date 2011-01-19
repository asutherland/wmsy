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
    "exports"
  ],
  function(
    $wmsy,
    $domGeom,
    $platfo,
    exports
  ) {

var wy = new $wmsy.WmsyDomain({id: "fancy-focus", domain: "wlib"});

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
      this._targetAbsNode = null;
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
      console.log("WANT TO FOCUS", binding);
      var targetNode = binding.domNode;
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
      if (containingNode !== this.domNode.parentNode) {
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

      var domNode = this.domNode;
      // hide if they don't want the focus ring, but keep our position
      //  up-to-date so we can fly to the next target if it wants us.
      domNode.style.display = binding.__focusRing ? "block" : "none";
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


    _reparentingMove: function(newParent) {
      console.log("REPARENTING to", newParent);
      var domNode = this.domNode, scrollState, relBounds;
      var bounds = domNode.getBoundingClientRect();
      if (newParent === this._rootContainerNode) {
        var win = domNode.ownerDocument.defaultView;
        scrollState = {x: win.scrollX, y: win.scrollY};
        relBounds = {x: 0, y: 0};
      }
      else {
        scrollState = {x: newParent.scrollLeft,
                       y: newParent.scrollTop};
        relBounds = newParent.getBoundingClientRect();
      }

      domNode.style.setProperty($platfo.transitionPropAttr, "none", null);

      domNode.style.top = (bounds.top - relBounds.top + scrollState.y) + "px";
      domNode.style.left = (bounds.left - relBounds.left + scrollState.x) + "px";

      newParent.appendChild(domNode);

      domNode.style.removeProperty($platfo.transitionPropAttr);
      // force a re-flow so we animate from this new (equivalent) state...
      domNode.clientLeft;
    },

    /**
     * Once we are done flying to where we are going, we potentially need to
     *  re-parent ourselves.
     */
    _transitionEnd: function() {
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
        this._rootContainerNode.appendChild(this.domNode);
    }
  },
  style: {
    root: [
      // this causes us to not eat clicks! vitally important!
      "pointer-events: none;",
      "box-shadow: 0 0 6px 3px orange;",
      "position: absolute;",
      "z-index: 1000;",
      "transition-property: left, top, width, height;",
      "transition-duration: 0.2s;",
      "left: -10px; top: -10px; height: 5px; width; 5px;",
    ],
  },
});

}); // end define
