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

define("wmsy/wlib/virt-list",
  [
    "wmsy/wmsy-core",
    "wmsy/wmsy-syntax",
    "wmsy/wmsy-domain",
    "wmsy/platfo",
    "wmsy/exploders",
    "wmsy/wlib/virt-layout",
    "wmsy/viewslice-array",
    "exports",
  ],
  function(
    $wmsy,
    $syn,
    $domain,
    $platfo,
    $exploders,
    $layout,
    $vs_array,
    exports
  ) {

var EVN_transitionEnd = $platfo.transitionEnd;
var WmsyStructMarker = $syn.WmsyStructMarker;

var wy = new $wmsy.WmsyDomain({id: "virt-list", domain: "wlib"});

/**
 * We are not waiting for a seek.  Scrolling is fine.
 */
var SEEK_NOPE = 0;
/**
 * We are waiting for a seek to complete and have not yet seen the didSeek.
 *  Scrolling is inhibited while waiting for a seek.
 */
var SEEK_WAITING_FOR_DIDSEEK = 1;
/**
 * We are waiting for a seek to complete and have seen the didSeek but
 *  aMoreExpected was true and so we are waiting for a didSplice where
 *  aRequested is true and aMoreExpected is false.  Scrolling is still
 *  inhibited while waiting for the seek.
 */
var SEEK_WAITING_FOR_LAST_DIDSPLICE = 2;

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
   * The root serves as the viewport which provides us with clipping.  It holds
   *  the "scrollNode" which is the thing we move around to effect scrolling.
   *  It in turn holds the "containerNode" which should be the only child when
   *  we are at rest, but may have a sibling containing the old set of nodes
   *  during seeks, as well as a jump widget to help convey the change.  We
   *  position the "scrollNode" using the CSS 'left'/'top' attribute, although
   *  the transform mechanism with translate is another possibility.  (But
   *  currently we are using transform to allow for instantaneous translation
   *  to compensate for insertions/deletions while animated transitions on
   *  left/top are happening.)
   *
   * We don't use the wmsy DOM creation magic and related accessor fabrication
   *  because we the temporary siblings of "containerNode" would throw off the
   *  built-in cleverness.
   */
  structure: {scroll: {container: {}}},
  _structureMapExtra: {
    root: {
    },

    container: {
      listy: true,
      listVertical: null, // tells it to check binding.__listVertical
      navVertical: null,
      subElementCssClass: "wlib--virt-list--wlib-virt-container--container-item",
    },
  },

  focus: wy.focus.container.parameterized("container"),

  emit: ["visibleBindings"],

  style: {
    root: [
      "overflow: hidden;",
      "position: relative;",
    ],

    scroll: [
      "position: absolute;",
      "transition-property: left, top;",
      "transition-duration: 0.15s;",
      "transition-timing-function: ease-out;",
    ],
  },

  /**
   * The prototype constructor is invoke the first time this widget type is
   *  parameterized.
   */
  protoConstructor: function (aConstraint, aGenesisDomNode) {
    var itemClassName = this.__structMap.container.subElementCssClass;


    // -- constraints / partials
    // - decoration hook
    var subConstraintBasis = aConstraint.constraint, widgetPartial;
    // yes, decorated
    if (subConstraintBasis instanceof WmsyStructMarker) {
      var decorMarker = this.decorMarker = subConstraintBasis.args;
      decorMarker.constructor =
        $domain.resolveViewSliceDecorator(decorMarker.kind);
      var synthConstraint = decorMarker.synthConstraint;
      var synthPartial =
        aConstraint.domain.dtree.partialEvaluate(synthConstraint);
      subConstraintBasis = decorMarker.normalConstraint;
      widgetPartial =
        aConstraint.domain.dtree.partialEvaluate(subConstraintBasis);
      this._fabBefore = function(aItem, aBeforeNode, aParentNode) {
        var widgetFab, basis, usePartial;
        // synthetic case
        if (typeof(aItem) === "object" &&
            ("_synthetic" in aItem) &&
            aItem._synthetic === WmsyStructMarker) {
          basis = synthConstraint;
          // unbox the item
          aItem = aItem.obj;
          usePartial = synthPartial;
        }
        // non-synthetic case
        else {
          basis = subConstraintBasis;
          usePartial = widgetPartial;
        }
        basis.obj = aItem;
        widgetFab = usePartial.evaluate(basis);
        if (!widgetFab) {
          throw $exploders.failedWidgetResolution(aParentNode, basis);
        }
        return widgetFab.insertBefore(basis, aBeforeNode, aParentNode,
                                      null, itemClassName);
      };
    }
    else {
      this.decorMarker = null;
      widgetPartial =
        aConstraint.domain.dtree.partialEvaluate(subConstraintBasis);
      this._fabBefore = function(aItem, aBeforeNode, aParentNode) {
        subConstraintBasis.obj = aItem;
        var widgetFab = widgetPartial.evaluate(subConstraintBasis);
        if (!widgetFab) {
          throw $exploders.failedWidgetResolution(aParentNode,
                                                  subConstraintBasis);
        }
        return widgetFab.insertBefore(subConstraintBasis, aBeforeNode,
                                      aParentNode, null, itemClassName);
      };
    }

    // build our partial for jump transitions
    this.jumpPartial = aConstraint.domain.dtree.partialEvaluate(
                         aConstraint.jumpConstraint);
    this.jumpBasis = aConstraint.jumpConstraint;

    // -- orientation parameterization
    var vert = this.__listVertical = aConstraint.vertical;

    this.majorClientLengthAttr = vert ? "clientHeight" : "clientWidth";
    this.minorClientLengthAttr = vert ? "clientWidth" : "clientHeight";

    this.majorOffsetLengthAttr = vert ? "offsetHeight" : "offsetWidth";
    this.minorOffsetLengthAttr = vert ? "offsetWidth" : "offsetHeight";

    this.scrollOffsetAttr = vert ? "top" : "left";

    this.startAttr = vert ? "top" : "left";
    this.endAttr = vert ? "bottom" : "right";
    this.dimAttr = vert ? "height" : "width";

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

    this.layoutProtoSetup(aConstraint);
  },

  events: {
    root: {
      mousewheel: function(aBinding, aEvent) {
        this._scroll(aEvent.wheelDelta);
      },
    },
  },

  receive: {
    virtScroll: function(aPixDelta) {
      this._scroll(aPixDelta);
    },

    /**
     * We are told to seek focusing on a specific ordering key value, a point
     *  along its bound shape, and the relative position that point should have
     *  on the page.
     */
    seek: function(aOrderingKey, aFraction, aRelPos, aPadPix) {
      this._updateBufferNeeds();

      this._seekFraction = aFraction;
      this._seekRelPos = aRelPos;
      this._seekPad = aPadPix;

      // Have the initial population try and cover the page and add a little
      //  lip on either side, but defer the full buffer until after the initial
      //  seek completes to minimize latency.
      var prePix = this._visibleAreaPix * aRelPos +
                   this._bufferPix * 0.2;
      var postPix = this._visibleAreaPix * (1.0 - aRelPos) +
                    this._bufferPix * 0.2;
      this.slice.seek(aOrderingKey,
                      this.layoutSuggestRequestSize(prePix),
                      this.layoutSuggestRequestSize(postPix));
    },
  },

  impl: {
    ////////////////////////////////////////////////////////////////////////////
    // Life Cycle

    postInit: function() {
      // -- Ensure view slice
      var slice;
      // Coerce our bound object to a view slice if it is not already.
      // (unlike a WidgetList, we do not surface the coerced slice)
      if (Array.isArray(this.obj)) {
        slice = new $vs_array.ArrayViewSlice(this.obj, this);
      }
      else {
        slice = this.obj;
        slice._listener = this;
      }

      if (this.decorMarker)
        slice = this.decorMarker.constructor(slice, this.decorMarker.sliceDef);

      this.slice = slice;

      // -- DOM setup
      var domNode = this.domNode;

      // - kill the pre-fabbed children
      while (domNode.lastChild)
        domNode.removeChild(domNode.lastChild);

      // - create scrollNode (the bit that flies around, scrolling us)
      var scrollNode = this.scrollNode =
        domNode.ownerDocument.createElement("div");
      scrollNode.setAttribute("class", this.__structMap.scroll.cssClassName);
      // for transitions to work we need to prime this
      scrollNode.setAttribute("style", this.scrollOffsetAttr + ": 0px;");
      domNode.appendChild(scrollNode);

      // - create containerNode (the bit that holds the live children)
      var containerNode = this.containerNode =
        scrollNode.ownerDocument.createElement("div");
      containerNode.setAttribute("class",
                                 this.__structMap.container.cssClassName);
      scrollNode.appendChild(containerNode);

      // - null out limboNode
      // (the bit that holds children in limbo for jump seek)
      this.limboNode = null;

      // - null out jumpDisplayNode
      // (the thing we display as a transition graphic for the jump seek)
      this.jumpDisplayNode = null;

      this._updateBufferNeeds();

      // -- children
      /**
       * Our list of bound children.  We could just as well not keep this
       *  but then we'd need to iterate over the DOM nodes for `didSplice`
       *  and I could see how that could pathological.
       */
      this.bindings = [];

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

      this.relativeContainerTarget = 0;

      /**
       * If we have an outstanding grow request, this characterizes it.  This
       *  cannot characterize seeks with this variable because we can issue a
       *  seek when a grow request is outstanding so they need to be tracked
       *  separately.
       *
       * @oneof[
       *   @case[null]{
       *     No outstanding data request.
       *   }
       *   @case[-1]{
       *     Data for 'before' for scrolling.
       *   }
       *   @case[1]{
       *     Data for 'after' for scrolling.
       *   }
       * ]
       */
      this.pendingGrowRequestDirection = null;

      /**
       * Track the current state of things, seek-wise.
       *
       * @oneof[
       *   @case[null]{
       *     There is no pending seek.
       *   }
       *   @case[-1]{
       *     We are seeking to "before" (smaller ordering key) the current
       *     block.
       *   }
       *   @case[0]{
       *     We have actually never seeked anywhere.  The next seek will be
       *     our maiden seek!
       *   }
       *   @case[1]{
       *     We are seeking to "after" (larger ordering key) the current block.
       *   }
       * ]
       */
      this.pendingSeekRelDirection = 0;

      /**
       * Are we waiting on a seek?
       * @oneof[
       *   SEEK_NOPE
       *   SEEK_WAITING_FOR_DIDSEEK
       *   SEEK_WAITING_FOR_LAST_DIDSPLICE
       * ]
       */
      this.seekWait = SEEK_NOPE;

      /**
       * The index of the view slice's liveList that is considered the focus
       *  of the seek.  We need to persist and update this in the case the seek
       *  says aMoreExpected.
       */
      this.seekFocusIndex = null;

      // -- layout init
      this.layoutInit();

      // -- focus support
      this.container_lastFocused = null;

      // -- fin
    },

    destroy: function wlib_virt_destroy(keepDom, forbidKeepDom) {
      // unregister us from the view slice
      this.slice.unlink(this);

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

    container_iterWalk: function wlib_virt_iterWalk(aStart, aDir, aCallback) {
      return this.layoutIterWalk(aStart, aDir, aCallback);
    },

    container_ensureVisible: function wlib_virt_ensureVisible(
        aBinding, aOriginBinding) {
      this.layoutMaybeScrollToEnsureVisible(aBinding, aOriginBinding);
    },

    ////////////////////////////////////////////////////////////////////////////
    // View Slice Protocol

    /**
     * A seek is either the initial seek or a jump seek that needs
     *  transitioning.  We only want to do the jump seek once we have all the
     *  data we requested for the seek, which means if `aMoreExpected` that
     *  we need to wait until we get the remaining didSplice notifications.
     */
    didSeek: function(aItems, aMoreExpected, aSlice, aSeekFocusIndex) {
      this.seekFocusIndex = aSeekFocusIndex;
      if (aMoreExpected)
        this.seekWait = SEEK_WAITING_FOR_LAST_DIDSPLICE;
      else
        this._finishSeek();
    },

    /**
     *
     */
    didSplice: function vs_interpose_didSplice(aIndex, aHowMany, aItems,
                                               aRequested, aMoreExpected,
                                               aSlice) {
      // If we are waiting for a seek splice, do nothing until we get the
      //  final one.
      if (this.seekWait == SEEK_WAITING_FOR_LAST_DIDSPLICE) {
        // we need to keep seekFocusIndex updated
        if (aIndex <= this.seekFocusIndex)
          this.seekFocusIndex += aItems.length - aHowMany;

        if (aRequested && !aMoreExpected)
          this._finishSeek();
        return;
      }
      // (There is no harm in processing splice notifications from before
      //  our seek request (hit the authority).  OTOH, the only real
      //  benefit is if it helps us fill out our jump transition.)

      // -- deletion!
      if (aHowMany) {
        this.layoutSpliceRemove(aIndex, aHowMany);
      }

      // -- addition!
      if (aItems && aItems.length) {

      }

    },

    ////////////////////////////////////////////////////////////////////////////
    // Internal Logic

    /**
     * Figure out how many pixels are required to cover the visible area and
     *  the buffer area.
     */
    _updateBufferNeeds: function() {
      var domNode = this.domNode;
      this._visibleAreaPix = domNode[this.majorClientLengthAttr];
      this._bufferPix = this._visibleAreaPix;
      this._maxRetentionPix = this._bufferPix * 2;
    },

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
      // If we are waiting for a seek to complete, do not scroll.
      // (Once we issue a seek, we must not/cannot issue any additional
      if (this.seekWait)
        return;

      // Bail, but remember change, if we are currently scrolling.
      // (SMIL animations will eventually allow us to figure the current
      //  state using animVal, but it is not an option at this time.)
      if (this.relativeContainerOffset != this.lastContainerOffset) {
        this.relativeContainerTarget += aPixAdjust;
        return;
      }

      this.relativeContainerOffset += aPixAdjust;
      this.relativeContainerTarget = this.relativeContainerOffset;

      var self = this;
      function scrollCompleted() {
        self.scrollNode.removeEventListener(EVN_transitionEnd,
                                            scrollCompleted, false);

        // update that we reached our target
        self.lastContainerOffset = self.relativeContainerOffset;

        // check if we need to initiate a new scroll
        if (self.relativeContainerTarget != self.relativeContainerOffset) {
          self._scroll(self.relativeContainerTarget -
                       self.relativeContainerOffset);
        }
        // If no additional scroll, keep our buffers up and cull that which is
        //  dead.
        else {
          self.layoutDiscardExcess();
          self._bufferUp();
        }

        self.FOCUS.updateFocusRing();
      }
      this.scrollNode.addEventListener(EVN_transitionEnd,
                                       scrollCompleted, false);

      // reflow!
      this.domNode.clientHeight;
      this.layoutVisibilityCheck(-aPixAdjust);

      this.scrollNode.style[this.scrollOffsetAttr] =
        this.relativeContainerOffset + "px";
      // reflow!
      this.domNode.clientHeight;
    },

    _bufferUp: function() {
    },

    /**
     * Remember the current apparent scroll position by keying off the first
     *  (partially) visible binding.  _maintainPosition will apply an
     *  instantaneous transform to affect the instantaneous position.
     */
    _rememberPosition: function() {

    },

    /**
     * Instantaneously adjust the scrollNode's effective position to compensate
     *  for the address space displacement of the currently visible contents of
     *  the viewport due to injection/removal of stuff 'before' us in the
     *  scrollNode container.  You should have called `_rememberPosition` prior
     *  to changing stuff if you want this to work.
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
     * We now have all the data we requested for our seek so repurpose the
     *  existing containerNode to be the limboNode, create a new containerNode,
     *  fill it with all our data, and contrive the jump.  If there was no
     *  previous content (first seek ever), then skip the jump transition.
     */
    _finishSeek: function() {
      this.seekWait = SEEK_NOPE;

      // -- prep for jump seek if appropriate
      if (this.pendingSeekRelDirection) {

        // - displace containerNode into limboNode, new containter
        this.limboNode = this.containerNode;
        var beforeNode = (this.pendingSeekRelDirection == -1) ?
                           this.limboNode : null;
        this.containerNode = this.domNode.ownerDocument.createElement("div");
        this.scrollNode.insertBefore(this.containerNode, beforeNode);

        // - destroy the bindings in the limbo node, leaving the DOM intact
        this.layoutLimboize();

        // - create the jump widget
        beforeNode = (this.pendingSeekRelDirection == -1) ?
                       this.limboNode : this.containerNode;
        var jumpFab = this.jumpPartial.evaluate(this.jumpBasis);
        if (jumpFab === null)
          throw $exploders.failedWidgetResolution(this.domNode,
                                                  this.jumpPartial);
        this.jumpDisplayNode = jumpFab.insertBefore(this.jumpPartial,
                                                    beforeNode,
                                                    this.scrollNode);

      }

      // -- fill up containerNode with stuff!
      this.layoutSpliceAdd(0, this.slice.liveList);

      // -- scroll/position

      // - figure positioning around the focal point
      var viewportLength = this.domNode.clientHeight;
      var focusedBinding = this.bindings[this.seekFocusIndex];
      var bindingLength = focusedBinding.domNode[this.majorOffsetLengthAttr];

      // Figure the point along the binding which is our focal point.
      var bindingFocalOffset = this._seekFraction * bindingLength;
      // Figure the point in the viewport where the focal point should be
      //  positioned.  Padding is applied after the fact; the assumption is that
      //  padding will only be used for 0.0/1.0 relposes so it won't matter.
      var viewportFocalOffset = this._seekRelPos * viewportLength +
                                ((this._seekRelPos < 0.5) ?
                                 this._seekPad : -this._seekPad);
      var bindingRelOffset



      // - jump seek if appropriate
      if (this.pendingSeekRelDirection) {

      }
      // - otherwise instantaneously position us.
      else {

      }

      // ensure focus after a seek...
      var focusManager = this.domNode.ownerDocument.wmsyFocusManager;
      focusManager.ensureDomainFocused(
        focusManager.findFocusDomainForBinding(this));

      this.layoutVisibilityCheck(0);
    },

    /**
     * Perform a jump transition between the old realized range and the new
     *  realized range.  For now we are just doing on-axis hyperspace
     *  scrolls, not sideways scrolls.  This is accomplished by having the
     *  limboNode, a jump display node, and the containerNode all living
     *  in the scrollNode and then doing an animated transition.  We require
     *  that all three bindings already exist.
     */
    _jumpTransition: function() {

    },

    ////////////////////////////////////////////////////////////////////////////
  },
});


}); // end define
