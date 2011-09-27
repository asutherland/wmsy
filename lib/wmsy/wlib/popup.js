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
 * Provide a simple, basic popup.
 **/

define("wmsy/wlib/popup",
  [
    "wmsy/wmsy-core",
    "wmsy/dom-geom",
    "wmsy/platfo",
    "text!./popup.css",
    "exports"
  ],
  function(
    $wmsy,
    $domGeom,
    $platfo,
    $_css,
    exports
  ) {

var wy = new $wmsy.WmsyDomain({id: "popup", domain: "wlib", css: $_css});

/**
 * The popup widget is bound to an object with a resolved widget factory,
 *  the requisite constraint basis, and the object that was used to resolve to
 *  the widget factory.  This all gets passed in so we can re-set the "obj"
 *  attribute of the constraint when we perform the actual binding.  (Normally
 *  this state is maintained during the time between when the factory is
 *  resolved and the binding is instantiated, but we can't guarantee for this
 *  general situation.
 */
wy.defineWidget({
  name: "simple-popup",
  doc: "Simple popup that does not point at or reference the origin widget.",
  constraint: {
    type: "popup",
  },
  structure: {
    contents: {},
  },
  impl: {
    // tell the focus ring that contents is scrolly
    __scrollingDomNode: "contents_element",
    postInitUpdate: function() {
      this.obj.constraint.obj = this.obj.obj;
      this.payloadBinding =
        this.obj.widgetFactory.bindOnto(this.obj.constraint,
                                        this.contents_element);
    },
    /**
     * Quasi-hack to force the content part of the pop-up to size itself so it
     *  does not infringe on the border.  I tried various tricks to try and
     *  force an appropriate block so the content widget could do
     *  "height: 100%" but failed to accomplish that.  I also tried the flexible
     *  box model, but that is not a hard-bounds and if the content area
     *  grows larger than the box allocates, the contents escape.
     */
    __sized: function(aSizing) {
      var fixerNode = this.contents_element;
      var trueHeight = this.domNode.offsetHeight;
      // update sizing to tell it how tall we decided to be
      aSizing.height = trueHeight + "px";

      // - height transition off
      // (Our positioning logic is okay with this, but we don't need the
      //  extra layout cost.)
      fixerNode.style.setProperty($platfo.transitionPropAttr, "none", null);

      fixerNode.style.height = this.domNode.clientHeight + "px";
      // XXX on certain chromium versions, the animation seems to be causing
      //  a self-fulfilling scrollbar prophecy, so let's give ourselves a little
      //  extra width to allow us to escape from this.  (More explicitly:
      //  I theorize that during the animated transition we are growing a
      //  scrollbar.  Once we reach our full-size, the scroll-bar compels its
      //  continued existence, although if it were removed, things would be
      //  fine.  This appears to be borne out by reality, although now we look
      //  dumb as a result...)
      // XXX try and resolve this, or consider removing the extra padding once
      //  we reach full size.  (another option is setting overflow:none until
      //  we hit full size.)
      fixerNode.style.width = (this.domNode.clientWidth + 20) + "px";

      // - height transition back on
      fixerNode.style.removeProperty($platfo.transitionPropAttr);

      // also propagate max-height inwards, compensating for border gobbling
      //  adjustments.
      var domNode = this.domNode;
      this.totalBorder = domNode.offsetHeight - fixerNode.clientHeight;
      if (domNode.style.maxHeight)
        fixerNode.style.maxHeight =
            $domGeom.cssSub(domNode.style.maxHeight, this.totalBorder);
    },

    __positioned: function() {
      // turn on top animation again
      this.domNode.style.opacity = "0.0";
      this.domNode.clientTop;
      this.domNode.style.setProperty($platfo.transitionPropAttr,
                                     "opacity, top", null);
      this.domNode.style.opacity = "1.0";
      this.domNode.clientTop;

      this.FOCUS.updateFocusRing();
    },

    destroy: function() {
      this.payloadBinding.destroy.apply(this.payloadBinding, arguments);
      this.__destroy();
    },
    done: function() {
      this.payloadBinding.done();
    },
  },
  receive: {
    /**
     * A notification from the content in the pop-up that we should try and grow
     *  if we are able.  This may require re-positioning ourselves so that the
     *  popup is entirely within the visible area.
     */
    resizePopup: function() {
      // see if there is a need (and ability) to expand
      var cnode = this.contents_element;
      var win = cnode.ownerDocument.defaultView;
      // XXX only checking height right now...
      if (cnode.scrollHeight > cnode.clientHeight &&
          cnode.clientHeight < win.innerHeight) {

        // okay, try and bump our height, leaving the max height to layout
        var newTargHeight = Math.min(win.innerHeight, cnode.scrollHeight);
        cnode.style.height = newTargHeight + "px";
        var newTargWidth = Math.min(win.innerWidth, cnode.scrollWidth);
        cnode.style.width = newTargWidth + "px";

        // but now we need to figure out the actual effective height, so peek
        //  at max height if it's there
        var domNode = this.domNode;
        if (domNode.style.maxHeight) {
          var maxHeight = Math.min($domGeom.cssNormPx(domNode.style.maxHeight),
                                   win.innerHeight);
          if (newTargHeight > maxHeight - this.totalBorder)
            newTargHeight = maxHeight - this.totalBorder;
        }
        if (domNode.style.maxWidth) {
          var maxWidth = Math.min($domGeom.cssNormPx(domNode.style.maxWidth),
                                  win.innerWidth);
          if (newTargWidth > maxWidth - this.totalBorder)
            newTargWidth = maxWidth - this.totalBorder;
        }

        // now see if we need to re-position the pop-up...
        var bounds = domNode.getBoundingClientRect();
        // the height/bottom is being wrong in webkit right now, so we've just
        //  figured out the truth above...
        if (bounds.top + newTargHeight + this.totalBorder > win.innerHeight)
          domNode.style.top =
            (win.innerHeight - newTargHeight - this.totalBorder - 1 +
             win.scrollY) + "px";
      }
    },
  },
});

}); // end define
