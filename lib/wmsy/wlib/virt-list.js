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
 * Virtual list widget and helpers.  This is a refactoring/reimplementation of
 *  wlib-virt's bitrotted non-viewslice aware virtual list widget into one that
 *  is viewslice aware and otherwise up-to-date.
 *
 **/

require.def("wmsy/wlib/virt-list",
  [
    "wmsy/wmsy-core",
    "wmsy/platfo",
    "wmsy/exploders",
    "wmsy/wlib/virt-layout",
    "exports",
  ],
  function(
    $wmsy,
    $platfo,
    $exploders,
    $layout,
    exports
  ) {

var EVN_transitionEnd = $platfo.transitionEnd;

var wy = new $wmsy.WmsyDomain({id: "virt-list", domain: "wlib"});

/**
 * Moving parts and responsibilities:
 * @itemize[
 *   @item{
 *     Layout Manager: responsible for figuring out how much data to request,
 *     binding the widgets for the requested data into reality, and discarding
 *     no-longer needed laid out/bound widgets.
 *   }
 *   @item{
 *     Virtual list widget proper: Handles scrolling (including animation),
 *     visibility assurance, and (usually, can be farmed out) focus duties.
 *   }
 *   @item{
 *     Animation scroll buddy.  We try and allow for all animation to be done
 *     using the built-in animation mechanisms (CSS transitions, SVG SMIL
 *     animations) rather than driving things ourselves.  It is likely to be
 *     more efficient and feel smoother this way.  This demands that we must
 *     keep any contextualizing visualization in-the-loop in terms of our
 *     triggering of these animation mechanisms.
 *   }
 * ]
 */
wy.defineWidget({
  name: "wlib-virt-container",
  doc: "Virtualized widget container for massive scale.",

  constraint: {
    type: "virt-list",
    constraint: wy.PARAM,
    jumpConstraint: wy.PARAM,
    vertical: wy.PARAM,
    // layout mixin to use
    layout: wy.PARAM,
    // automatically filled in by libWidget...
    domain: wy.PARAM,
  },

  /**
   * The root serves as the viewport, we also (in non-transient states) have a
   *  single container node child.  We make the container accessible as
   *  "containerNode" and positionit using the CSS 'left'/'top' attribute,
   *  although the transform mechanism with translate is another possibility.
   *
   * We don't use the wmsy DOM creation magic and related accessor fabrication
   *  because we can temporarily introduce a sibling of the container which
   *  would throw off the built-in cleverness.
   */
  structure: {},

  focus: wy.focus.container.vertical("root"),

  style: {
    root: [
      "overflow: hidden;",
    ],
  },

  /**
   * The prototype constructor is invoke the first time this widget type is
   *  parameterized.
   */
  protoConstructor: function (aConstraint, aGenesisDomNode) {
    // -- constraints / partials
    // build our partial for sub-widgets
    this.widgetPartial = aConstraint.domain.dtree.partialEvaluate(
                           aConstraint.constraint);
    this.widgetBasis = aConstraint.constraint;

    // build our partial for jump transitions
    this.jumpPartial = aConstraint.domain.dtree.partialEvaluate(
                         aConstraint.jumpConstraint);
    this.jumpBasis = aConstraint.jumpConstraint;

    // -- orientation parameterization
    var vert = aConstraint.vertical;

    this.majorContainerLengthAttr = vert ? "offsetHeight" : "offsetWidth";
    this.minorContainerLengthAttr = vert ? "offsetWidth" : "offsetHeight";

    this.scrollOffsetAttr = vert ? "top" : "left";

    // -- layout mixin mixing
    if (!(aConstraint.layout in $layout.LAYOUT_MIXINS)) {
      throw $exploders.badWidgetParameterValue({
        name: "layout", value: aConstraint.layout,
        legalValuesInKeys: $layout.LAYOUT_MIXINS,
        domNode: aGenesisDomNode});
    }
    var layoutMixIn = $layout.LAYOUT_MIXINS[aConstraint.layout];
    for (var key in layoutMixIn) {
      this[key] = layoutMixIn[key];
    }
  },

  impl: {
    ////////////////////////////////////////////////////////////////////////////
    // Life Cycle

    postInit: function() {
      // -- DOM setup
      var domNode = this.domNode;

      // - create scrollNode (the bit that flies around, scrolling us)
      var scrollNode = this.scrollNode =
        domNode.ownerDocument.createElement("div");
      domNode.appendChild(scrollNode);

      // - create containerNode (the bit that holds the live children)
      var containerNode = this.containerNode =
        scrollNode.ownerDocument.createElement("div");
      scrollNode.appendChild(containerNode);

      // - null out limboNode
      // (the bit that holds children in limbo for jump seek)
      this.limboNode = null;

      // -- Initialize state variables
      /**
       * Equivalent to scrollTop/scrollLeft for our purposes.  The current
       *  offset target that we are at or animating to.
       */
      this.relativeContainerOffset = 0;
      /**
       * The offset that we are animating from; equal to
       *  `relativeContainerOffset` when there is no animation in progress.
       */
      this.lastContainerOffset = 0;

      /**
       * If we have an outstanding data request, this characterizes it.
       *
       * @oneof[
       *   @case[null]{
       *     No outstanding data request.
       *   }
       *   @case[-1]{
       *     Data for 'before' for scrolling.
       *   }
       *   @case[0]{
       *     Data for a freshly seeked block; all new.
       *   }
       *   @case[1]{
       *     Data for 'after' for scrolling.
       *   }
       * ]
       */
      this.pendingRequestDirection = null;

      // -- layout init
      this.layoutInit();

      // -- fin
      // we do not perform an initial seek!  it is up to our owner to seek us.
    },

    destroy: function wlib_virt_destroy(keepDom, forbidKeepDom) {
      this.__destroy();

      // we need to kill the kids...
      var container = this.container_element;
      var kidNode = container.firstChild;
      while (kidNode) {
        var localKeepDom = keepDom;
        if (("binding" in kidNode) && kidNode.binding) {
          localKeepDom = nextKidNode.binding.destroy(keepDom,
                                                     forbidKeepDom) ||
                           keepDom;
        }

        var nextKidNode = kidNode.nextSibling;
        if (localKeepDom)
          kidNode.setAttribute("wmsy-antic", "true");
        else
          container.removeChild(kidNode);
        kidNode = nextKidNode;
      }
    },

    ////////////////////////////////////////////////////////////////////////////
    // Container Widget UI Protocol

    ////////////////////////////////////////////////////////////////////////////
    // View Slice Protocol

    /**
     * Notification of a seek completion that we triggered.
     */
    didSeek: function(aBaseIndex, aItems, aSlice) {
    },

    ////////////////////////////////////////////////////////////////////////////
    // Internal Logic

    /**
     * Perform an animated scroll.  We want to maximize responsiveness and
     *  smoothness of the scrolling.  Currently that means that we will not
     *  perform any widget binding until after the scroll completes, but will
     *  bind a placeholder up to our placeholding limit.  I do not expect to
     *  get this right on the first try; we may change to kicking off async fill
     *  queries, performing time-bounded bindings, and/or heuristically
     *  determine when to do any of those things.
     *
     * @args[
     *   @param[aPixAdjust]{
     *     Scroll up (negative pix) or down (positive pix).
     *   }
     * ]
     */
    _scroll: function(aPixAdjust) {
      this.relativeContainerOffset += aPixAdjust;

      var self = this, latchedTarget = this.relativeContainerOffset;
      function scrollCompleted() {
        self.containerNode.removeEventListener(EVN_transitionEnd,
                                               scrollCompleted, true);
        // only generate the scroll complete notification if we are not
        //  somehow obsoleted
        if (self.relativeContainerOffset == latchedTarget) {
        }
      }
      this.containerNode.addEventListener(EVN_transitionEnd,
                                          scrollCompleted, true);

      this.containerNode.style[this.scrollOffsetAttr] =
        this.relativeContainerOffset + "px";
    },

    /**
     * Instantaneously adjust the scrollNode's effective position to compensate
     *  for the address space displacement of the current viewport due to
     *  injection/removal of stuff 'before' us in the scrollNode container.
     *
     * We want to avoid interfering with in-progress animations, so we are
     *  accomplishing this for now by using a translate transform.  Ideally
     *  once the scrolling animation completes we would turn off the left/top
     *  transition support and instantaneously fix things up.  For now we're
     *  punting on that since that is an extra moving part that is unlikely
     *  to bite us until our offsets go floating point, as it were.
     */
    _maintainPosition: function() {
    },

    /**
     * Perform a jump transition between the old realized range and the new
     *  realized range.  For now we are just doing on-axis hyperspace
     *  scrolls, not sideways scrolls.  This is accomplished by having the
     *  limboNode, a hyperspace widget node, and the containerNode all living
     *  in the scrollNode and then doing
     */
    _jumpTransition: function() {

    },

    ////////////////////////////////////////////////////////////////////////////
  },
});


}); // end require.def
