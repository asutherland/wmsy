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
 * All logic related to animations-related behaviors.
 *
 * Our goal with animation is to play to the strengths of the human visual
 *  system, attempting to expose causality and object relationships through
 *  animation.  For example, rather than have an object disappear from one
 *  list and appear in another, we would prefer it to transition between
 *  the two lists.  When deleting an object, we would prefer that it collapses
 *  rather than immediately disappear and have its neighbors move up.
 *
 * For our own sanity and simplicity of the rest of the system, we attempt to
 *  immediately effect the binding changes and just use a series of dumb
 *  DOM nodes and transitions to accomplish the rest.  Because binding logic
 *  in WidgetLists and the like ignores nodes without bindings, leaving DOM
 *  nodes (or clones) in places whose bindings have been destroyed is fine.
 *  (We do need to contend with widget destruction usually tearing down the
 *  DOM tree as a side-effect.)
 *
 * Non-listy widget bindings are somewhat more problematic because all of our
 *  DOM traversal logic assumes a fixed tree structure.  This is not a problem
 *  because the set of state changes possible for a non-listy widget can/should
 *  probably be constrained.
 *
 * Presumably if we have multiple flying antic operations happening at the same
 *  time we would use a timer to update the targets of all flying things so
 *  they don't end up in the wrong spot.  We are going to initially punt on
 *  that, however.
 *
 * We are able to associate the various types of transitions by relying on
 *  the already existing wmsy idspace mechanism to track the addition /
 *  removal of objects.
 *
 * The set of operations we support is as follows:
 * @itemize[
 *   @itemize{
 *     Addition.  The creation of a new instance that comes from nowhere.  The
 *     following techniques seem to cover the reasonable options for us:
 *
 *    @item[
 *     @item{
 *       Zoom/expand in using straight-up DOM transitions for everything.  The
 *       concern with this is that when text layout is involved it might
 *       actually change up the layout as it goes.  An alternate variant is
 *       the contract in from infinity while alphaing from clear to opaque.
 *     }
 *     @item{
 *       Zoom/expand in by taking a canvas shot of the widget in its realized
 *       form and having that be the thing that is scaled.  Thanks to our
 *       decision to limit the cascading bit of CSS to things inside the widget
 *       this does make it possible to snapshot it in isolation.  The only
 *       problem is when the widget is sized based on its position which
 *       might necessitate inserting it, reflowing, removing it, etc.  Another
 *       option could be to have the widget actually be resizing itself but
 *       invisible with the canvas thing just overlaid overtop.  (And since
 *       the css properties should presumably have calculated the end state,
 *       we are able to target the rigth end state.)
 *     }
 *     @item{
 *       Do a wipe/crop thing where overflow:none is used to have the node
 *       already fully sized but sort of sliding into existence fully formed.
 *       This has a similar issue to the former in that we really need to know
 *       the final size of things for this to work without relayout.
 *     }
 *     @item{
 *       Have an empty space open up and then the widget fades in quickly.  The
 *       goal is to avoid scaling the widget while also making sure the changes
 *       in its neighbors allow our visual centers to do the right thing.
 *     }
 *    ]
 *   }
 *   @item{
 *     Deletion.  The destruction of an existing instance that isn't going
 *     anywhere else.
 *
 *     All of our options are the same as in the addition case except we already
 *     know the size of the widget, which makes everything much simpler.
 *     We can directly perform a canvas snapshot in-situ, do the overflow:none,
 *     etc. tricks with no trouble whatsoever.
 *   }
 *   @item{
 *     Clones that fly from their cloning origin to their new instantiated
 *     location.
 *
 *     This is a variation on addition.  We want to create a clone of the
 *     origin node and have it fly to the new location.  We want to have the
 *     new location fully sized by the time the flying clone gets there.
 *     We want the growing location to be empty, which simplifies that.
 *
 *     So our strategy is to have two transitions.  One is the flying clone
 *     which is not a binding at all.  The other is the target node which is
 *     a real binding that is animating its sizing but whose visibility is
 *     hidden.  We register a listener on the flying dude and use that to
 *     make the target node visible.  Some fine-tuning may be in order,
 *     especially if there are cases where the conceptual object is the same
 *     but the binding or its state is not.
 *   }
 *
 *   @item{
 *     (Conceptual) object movement from one location to another; effectively
 *     cloning where the original is killed.
 *
 *     The target end is like copy cloning.  For the source end, since we want
 *     it to look like the thing is flying away, we immediately hide the
 *     (dead) source node and have it animate a collapse.  Once the collapse
 *     completes we remove the node.
 *   }
 * ]
 **/

define("wmsy/wmsy-antics",
  [
    "wmsy/platfo",
    "exports"
  ],
  function(
    $platfo,
    exports
  ) {

/**
 * A hook to tell bindings that are being destroyed that they should retain
 *  their DOM structure so we can animate its destruction.
 */
function unregisterHook(id, binding, prevVal, forbidKeepDom) {
  // pretend we don't see this happening if keeping the dom is forbidden
  if (forbidKeepDom) {
    console.log("forbidKeepDom is forcing us to forget about", id);
    this.removed[id].pop();
  }
  return !forbidKeepDom;
};

function AnticsDocDomainInstance(doc, idRegistry) {
  this.doc = doc;
  this.idRegistry = idRegistry;
}
AnticsDocDomainInstance.prototype = {
  /**
   * Tells us to start watching for idspace changes and to coerce them into
   *  excited animated transitions.  Animations don't actually start happening
   *  until 'go' is fired.
   */
  prepare: function(spaceName) {
    this.idRegistry.startWatching("antics", spaceName, null, unregisterHook);
  },

  /**
   * Tell us to stop watching for idspace changes and to animate everything
   *  that happened between the call to `prepare` and the call to us (in the
   *  given id space).
   *
   * We consume the lists of added and removed widgets and consult the set of
   *  live widgets to figure out what is a standalone addition, standalone
   *  removal, flying move, or flying clone.
   *
   * XXX XXX in the interest of baby steps we are only handling flying clones
   *  to start.
   */
  go: function(spaceName) {
    var watched = this.idRegistry.finishWatching("antics", spaceName);

    var loneAdds = [], loneRemovals = [], moves = [], clones = [], moot = [];
    var id, i, curBindings, binding, removedBindings;

    for (id in watched.added) {
      var addedBindings = watched.added[id];
      // - moot and detect moves
      if (id in watched.removed) {
        removedBindings = watched.removed[id];
        for (i = addedBindings.length - 1; i >= 0; i--) {
          // moot bindings
          if (removedBindings.indexOf(addedBindings[i]) != -1) {
            moot.push(addedBindings[i]);
            removedBindings.splice(removedBinding.indexOf(addedBindings[i]));
            addedBindings.splice(i, 1);
          }
        }
        // If we still have at least 1 removedBinding and 1 addedBinding then
        //  we are looking at a move.  The crazy case is where we have more than
        //  1 of any of those.  We just consume pairs of both to generate our
        //  moves and leave the remainder for the rest of the logic even though
        //  the results will be ridiculous.
        while (removedBindings.length && addedBindings.length) {
          moves.push([removedBindings.pop(), addedBindings.pop()]);
        }
      }

      // find the set of bindings at the current moment for that id
      curBindings = this.idRegistry.findBindingsUsingId(spaceName, id);
      // filter out the added bindings to see if there was an origin binding
      //  that is still hanging out.
      var preexisting = [];
      for (i = 0; i < curBindings.length; i++) {
        if (addedBindings.indexOf(curBindings[i]) == -1)
          preexisting.push(curBindings[i]);
      }

      // - clone
      // if there were any preexisting, then we're looking at a clone situation
      if (preexisting.length) {
        // just use the first preexisting dude.
        for (i = 0; i < addedBindings.length; i++) {
          clones.push([preexisting[0], addedBindings[i]]);
        }
      }
      // - lone add
      // otherwise they're just adds
      else {
        loneAdds = loneAdds.concat(curBindings);
      }
    }

    // - lone removals
    // All that is left is lone removals since the add case handled the
    //  mooting and move pairings.
    for (id in watched.removed) {
      removedBindings = watched.removed[id];
      if (removedBindings.length)
        loneRemovals = loneRemovals.concat(removedBindings);
    }

    console.log("added:", loneAdds.length,
                "cloned:", clones.length,
                "moved:", moves.length,
                "removed:", loneRemovals.length,
                "moot:", moot.length);

    while (clones.length)
      this._animateClone(clones.pop());
    while (loneRemovals.length)
      this._animateRemoval(loneRemovals.pop());
  },

  /**
   * Given a binding create a clone of its DOM tree that lives at the top
   *  of the DOM tree as a position:absolute.  I was thinking we might be able
   *  to do the drawWindow thing, but that's chrome-priviliged Gecko only.
   */
  _dopplegang: function(binding) {
    var domNode = binding.domNode;
    var clone = domNode.cloneNode(true);
    var bodyElem = domNode.ownerDocument.documentElement.children[1];
    var bounds = domNode.getBoundingClientRect();

    var win = domNode.ownerDocument.defaultView;
    var sx = win.pageXOffset, sy = win.pageYOffset;
    // I moved the left/top setting into here before becoming suspicious
    //  enough to force reflows... going to leave it like this for now...
    clone.setAttribute("style",
      "position: absolute;\n" +
      "opacity: 0.5;\n" +
      "left: " + (bounds.left + sx) + "px;\n" +
      "top: " + (bounds.top + sy) + "px;\n");

    clone.setAttribute("wmsy-antic", "true");
    // make sure it doesn't think it is focused.
    clone.removeAttribute("wmsy-focused");
    clone.removeAttribute("wmsy-focused-active");
    clone.removeAttribute("wmsy-focused-inactive");
    bodyElem.appendChild(clone);
    return clone;
  },

  _animateClone: function(clonePair) {
    var srcBinding = clonePair[0], targetBinding = clonePair[1];
    var src = srcBinding.domNode, target = targetBinding.domNode;

    var flyer = this._dopplegang(srcBinding);

    var win = src.ownerDocument.defaultView;
    var sx = win.pageXOffset, sy = win.pageYOffset;

    // -- target
    // - save off its position before we clobber it into an animated thing.
    var targetBounds = target.getBoundingClientRect();
    var targetComputedStyle = win.getComputedStyle(target, null);
    var targWidth = targetComputedStyle.getPropertyValue("width");
    var targHeight = targetComputedStyle.getPropertyValue("height");

    // try and figure out its CSS dimension

    // - clobber it to be itty bitty and hidden
    target.style.visibility = "hidden";
    target.style.width  = "0px";
    target.style.height = "0px";

    // - tell transitions to activate for sizing
    target.style.cssText +=
      "-moz-transition-property: width, height;" +
      "-moz-transition-duration: 0.4s;" +
      "-webkit-transition-property: width, height;" +
      "-webkit-transition-duration: 0.4s;" +
      "-o-transition-property: width, height;" +
      "-o-transition-duration: 0.4s;";

    // XXX we need to force a reflow or firefox won't animate...
    target.clientWidth;

    // let it return to its natural size
    target.style.width = targWidth; //targetBounds.width + "px";
    target.style.height = targHeight; //targetBounds.height + "px";

    // -- flyer
    // - position the flyer over the original dude
    var srcBounds = src.getBoundingClientRect();

    // - tell transitions to activate for translation
    flyer.style.cssText +=
      "-moz-transition-property: left, top, width, height;" +
      "-moz-transition-duration: 0.4s;" +
      "-webkit-transition-property: left, top, width, height;" +
      "-webkit-transition-duration: 0.4s;" +
      "-o-transition-property: left, top, width, height;" +
      "-o-transition-duration: 0.4s;";

    // - register the transition end listener before initiating
    function transitionEnd() {
      flyer.removeEventListener($platfo.transitionEnd, transitionEnd, true);
      flyer.parentNode.removeChild(flyer);
      // stop forcing crap on the target
      target.style.cssText = "";
    }
    flyer.addEventListener($platfo.transitionEnd, transitionEnd, true);

    // - set target of the final position
    flyer.style.left = (targetBounds.left + sx) + "px";
    flyer.style.top = (targetBounds.top + sy) + "px";
    // abandoning sizing forcing for the flyer right now since the widgets
    //  aren't really written to obey imposed sized constraints and the
    //  canvas option is currently no good...
    //flyer.style.width = targetBounds.width + "px";
    //flyer.style.height = targetBounds.height + "px";

  },

  _animateRemoval: function(binding) {
    var domNode = binding.domNode;
    var win = domNode.ownerDocument.defaultView;

    // figure out the bounds of our stupid
    var computedStyle = win.getComputedStyle(domNode, null);

    // Create a container to do the fancy collapse insanity
    var container = domNode.ownerDocument.createElement("div");
    container.setAttribute("wmsy-antic", "true");
    container.setAttribute("style",
      "border: 0; padding: 0; margin: 0; overflow: hidden; " +
      "line-height: 0; " +
      "width: " + computedStyle.getPropertyValue("width") + "; " +
      "height: " + computedStyle.getPropertyValue("height") + "; " +
      "display: " + computedStyle.getPropertyValue("display") + ";");
    domNode.parentNode.insertBefore(container, domNode);
    container.appendChild(domNode);

    container.style.cssText +=
      "-moz-transition-property: width, height;" +
      "-moz-transition-duration: 0.6s;" +
      "-webkit-transition-property: width, height;" +
      "-webkit-transition-duration: 0.6s;" +
      "-o-transition-property: width, height;" +
      "-o-transition-duration: 0.6s;";

    container.clientWidth;

    function transitionEnd() {
      container.removeEventListener($platfo.transitionEnd, transitionEnd, true);
      container.parentNode.removeChild(container);
    }
    container.addEventListener($platfo.transitionEnd, true);

    container.style.width = "0px";
  },
};
exports.AnticsDocDomainInstance = AnticsDocDomainInstance;

}); // end define
