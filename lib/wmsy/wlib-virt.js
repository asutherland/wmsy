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

define("wmsy/wlib-virt",
  [
    "exports",
    "wmsy/wmsy-core",
  ],
  function(
    exports,
    wmsy
  ) {

var wy = new wmsy.WmsyDomain({id: "wlib-virt", domain: "wlib"});

/**
 * The virtualized widget container:
 * - Responds directly to scrollwheel control, requesting additional items to
 *    bind widgets to as needed, and destroying bindings that are no longer in
 *    focus.
 * - Makes scrolling be animated.
 * - (Eventually, respond to touch scrolls like scrollwheel if that's not free.)
 * - Tells the scroll provider about the currently visible bindings.
 * - Services seek requests
 *
 * The widget relies on a ViewSlice data-source that is presumed to have some
 *  subset of the entire data set in memory at any given time.  The ViewSlice
 *  is presumed to be able to produce additional data only asynchronously and
 *  with a latency that could potentially be user visible.
 *
 *
 * Animation DOM complexity:
 *
 * Animated scrolling precludes using scrollLeft/scrollTop on an overflow:hidden
 *  div like we used to do; they aren't surfaced in a way that CSS transitions
 *  or transforms can get at things.  That technique was nice because we did not
 *  need to create a DOM node just for clipping.  But in order to animate
 *  scrolling we need to create an outer DOM node that is the viewport (with
 *  overflow:hidden) and an inner DOM node that is the actual container.  We
 *  will make sure wmsy-focus's "listy" handling logic is able to pierce this
 *  additional DOM node.
 *
 *
 * Animation and seeking:
 *
 * When a seek is requested, either the requested position is continuous with
 *  what we are already showing (local), or not (a jump).  In the local case
 *  we just scroll to the new point.  In the jump case we put the target bunch
 *  in a separate DOM node and then can either do a hyperspace scroll where
 *  we scroll but put some kind of marker node in between that makes it clear
 *  we are jumping a long ways.  (A starfield being a potentially amusing way
 *  to do it.)  The other way, which seems less silly, would be to do a
 *  sideways/minor-axis slide/scroll transition.
 *
 *
 * Placeholders: Asynchronous data retrieval versus user scrolling
 *
 * It is obviously possible for the user to scroll around faster than we can
 *  get new data to bind into reality.  We can either let the scrolling hitch
 *  waiting for the data or inject placeholders that we swap out when we get
 *  the data.  We favor placeholders.  This means creating an artificial DOM
 *  node for the purposes of accumulating "pixel debt" that we need to fill
 *  in when the data arrives.
 *
 * Given that there is no way for us to translate the "relative" traversal of
 *  scrolling directly into absolute seek terms, this leaves the potential for
 *  pathological situations where the user continues to scroll faster than we
 *  can fetch more data.  This is of questionable benefit to the user and
 *  the software, and could result in worst-case application behavior if the
 *  scrolling gets buggy.  This suggests there does come a time when we
 *  "run out of road" and refuse to do anything until we manage to fill in
 *  the current pixel debt.  Given that we request enough data to more than
 *  fill a page and we are not assuming (or allowing, for now) a guaranteed
 *  ability to cancel data, we therefore decree it reasonable to provide at
 *  most one "page" worth of pixel debt and wait for our outstanding data
 *  request to fill in before provide any additional pixel debt.
 *
 *
 * Layout managers:
 *
 * The simplest kind of virtual container is one with blocks that take up
 *  the entire minor axis width and are laid out linearly along the major axis.
 *  We can leave all the layout and animation to standard HTML mechanisms;
 *  animation addition and removal is trivial because we just animate expansion
 *  or collapse and everything will adjust correctly (although we may need to
 *  also plan a simultaneous scrolling animation.)
 *
 * A more complex situation is one where multiple item bindings pack along the
 *  minor axis.  Although HTML layout should work fine (with some caveats),
 *  animation can be a problem because HTML layout of the animation when widgets
 *  wrap from one row to another will not work right.  Specifically, a widget
 *  will instantaneously transition from one row to the next/previous as space
 *  becomes available/disappears.  We would prefer if the block either magically
 *  flew to the next row or clipped off one side while a clone of it clipped
 *  onto the other side of the other row.
 *
 * A more extreme and more hypothetical example is approximating the SIMILE
 *  timeline behavior.  Specifically, assume we have widgets bound to timeline
 *  events and that we need to displace them vertically to avoid overlap with
 *  other timeline events.  This would require absolute positioning at all
 *  times and non-trivial layout logic.  A less extreme variation would be
 *  a two-column view of personal and work e-mails (which one might also
 *  accomplish by linking two traditional virtual list views.)
 *
 * In any event, we decree these things not totally insane and worth thinking
 *  about and so introduce the concept of a layout manager responsible for
 *  positioning and able to influence the queries issued to the view slice
 *  for data.  The latter is because the layout manager is best able to guess
 *  how much data is required in order to fill a given pixel area given the
 *  active layout algorithm.  For now, for simplicity, I'm just prefixing the
 *  name of any layout functions with layout and assuming the implementation
 *  will just use mix-ins with the parameterized protoConstructor magic.
 *
 *
 *
 */
wy.defineWidget({
  name: "wlib-virt-container",
  doc: "Virtualized widget container for massive scale.",

  constraint: {
    type: "virt-list",
    constraint: wy.PARAM,
    domain: wy.PARAM,
    id: wy.PARAM,
  },

  // the root serves as the viewport
  structure: {
    // the actual container node (which holds the children), we position it
    //  using the CSS 'left'/'top' attribute, although the transform mechanism
    //  with translate is another possibility.
    container: {},
  },
  _structureMapExtra: {
    root: {
      listy: true,
      listVertical: true, // XXX should be parameterized
      prevFocusable: null,
      nextFocusable: null,
      firstFocusable: wy.SELF,
      lastFocusable: wy.SELF,
    }
  },

  focus: wy.focus.container.vertical("root"),

  style: {
    root: [
      "overflow: hidden;",
    ],
  },

  impl: {
    ////////////////////////////////////////////////////////////////////////////
    // Life Cycle

    preInit: function wlib_virt_preInit() {

      // the index of the first instantiated child binding
      this.firstIndex = null;
      // the index of the last instantiated child binding
      this.lastIndex = null;

      /*
       * Track the previously instantiated run of widgets when a seek happens.
       *
       * Set by @lxref{seek} and used by @lxref{bindAtLeast}.  Because seek
       *  knows which 'side' of the existing run the seek is on, it only needs
       *  the single existingBindingNode value (which it sets to be the node
       *  'closest' to the seek range).
       */
      this.existingFirstIndex = null;
      this.existingLastIndex = null;
      this.existingBindingNode = null;

      /*
       * Populated/maintained by @lxref{reportVisibleBindings}, these track the
       *  first and last (partially) visible bindings.
       */
      this.firstVisibleNode = null;
      this.lastVisibleNode = null;

      this.BUFFER_PIX = Math.max(120,
                                 this.domNode[this.majorContainerLengthAttr]);
      this.RETENTION_LIMIT = this.BUFFER_PIX * 2;
    },

    update: function wlib_virt_update() {
      this.__update();
    },

    postInit: function wlib_virt_postInit() {
      // XXX initiate a seek to the top of the list
      this.__receive_seek(0, 0, "top", 0);
    },

    destroy: function wlib_virt_destroy(keepDom, forbidKeepDom) {
      this.__destroy();

      //this.splice(0, undefined, undefined,

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

    root_iterWalk: function wlib_virt_iterWalk(aStart, aDir, aCallback) {
      var linkAttr = (aDir < 0) ? "previousSibling" : "nextSibling";
      var domNode;
      if (aStart == null) {
        if (aDir > 0)
          domNode = this.firstVisibleNode;
        else
          domNode = this.lastVisibleNode;
      }
      else {
        domNode = aStart.domNode[linkAttr];
      }

      while (domNode) {
        var rval = aCallback(domNode.binding);
        if (rval) {

          return rval;
        }
        domNode = domNode[linkAttr];
      }
      return false;
    },

    /**
     * Focus changes like this are always going to be on bindings that are
     *  either partially visible or just outside the visible range.  We
     *  can convert this to a scroll of just enough to get things visible.
     *
     * XXX The implementation is highly derived from the widgetList
     *  implementation right now.  Should consider code reuse; perhaps common
     *  geometry logic?
     */
    root_ensureVisible: function wlib_virt_ensureVisible(
        aBinding, aOriginBinding) {
      var isVertical = true;
      var clientLenAttr = isVertical ? "clientHeight" : "clientWidth";
      var scrollOffAttr = isVertical ? "scrollTop" : "scrollLeft";
      var offsetOffAttr = isVertical ? "offsetTop" : "offsetLeft";

      var containerNode = this.domNode;
      var containerLen = containerNode[clientLenAttr];
      var containerOff = containerNode[offsetOffAttr];
      var containerScroll = containerNode[scrollOffAttr];

      var originNode = aOriginBinding.domNode;

      // see if the origin binding is currently fully visible.  if it is, we have
      //  nothing to do.
      var originOff = originNode[offsetOffAttr];
      var originLen = originNode[clientLenAttr];
      if ((originOff >= containerOff + containerScroll) &&
          (originOff + originLen <=
             containerOff + containerScroll + containerLen))
        return;

      // (it's not fully visible)
      // Figure out how to perturb our child's position so that the origin
      //  binding can fit in our viewport area in its entirety.  If the origin
      //  binding is simply too big, then fit as much of it as possible as
      //  scrolling would expose if the user was doing it.

      var lefty = ((originLen > containerLen) ||
                   (originOff < containerOff + containerScroll));

      var scrollTarg;
      // which side of the origin binding do we try and make visible?
      if (lefty) {
        // try and put the top/left at top/left of the container
        scrollTarg = originOff - containerOff;
      }
      else {
        // try and put the bottom/right at the bottom/right of the container
        var originRight = originOff + originLen;
        scrollTarg = originRight - containerOff - containerLen;
      }
      this._scroll(scrollTarg - containerScroll);
    },

    ////////////////////////////////////////////////////////////////////////////
    // View Slice Protocol

    /**
     * Splicing is reasonably straightforward.  If the changes are happening
     *  outside the viewport but in our buffered range, we want to do what we
     *  need to do to keep the viewport stable.  If the changes overlap with the
     *  viewport, we want to keep the first visible widget's position stable.
     *  If the changes happen outside our buffered range, we ignore them apart
     *  from updating our numbering offsets.
     *
     * Sufficient deletion can result in us needing to request new data in both
     *  directions.
     *
     *
     * All arguments are fully qualified and absolute; the magic stuff only
     *  can happen on user-code facing view slices.
     */
    splice: function(aIndex, aHowMany, aItems, aSlice) {
      var domNode = this.domNode;

      // -- deletion
      if (aHowMany) {
        var firstDel = aIndex, lastDel = aIndex + aHowMany;
        // - before us; nothing to do but update our numbers.
        if (lastDel < this.firstIndex) {
          this.firstIndex -= aHowMany;
          this.lastIndex -= aHowMany;
        }
        // - after us; absolutely nothing to do; numbers are not changed
        else if (firstDel > this.lastIndex) {
          // (nop)
        }
        // - overlaps us, stuff to kill; may or may not be visible...
        else {
          var curBinding;
          // Clamp deletion range to instantiated nodes and update the
          //  instance variables.
          if (firstDel < this.firstIndex) {
            firstDel = this.firstIndex;
            curBinding = domNode.children[0];
            this.firstIndex -= aHowMany;
            this.lastIndex -= aHowMany;
          }
          else { // (we overlap, so lastIndex must need an update)
            curBinding = domNode.children[firstDel - this.firstIndex];
            this.lastIndex -= aHowMany;
          }
          if (lastDel > this.lastIndex)
            lastDel = this.lastIndex;

          // accumulate the nodes to kill, kill them
          var killList = [];
          while (firstDel++ <= lastDel) {
            killList.push(curBinding);
            curBinding = curBinding.nextSibling;
          }
          this._killNodes(killList);

          // XXXTODO! bind new widgets into existence as required.
        }
      }

      // -- addition
      if (!aItems)
        return;

    },

    /**
     * Notification of a seek completion that we triggered.
     */
    didSeek: function(aBaseIndex, aItems, aSlice) {
    },

    _commonSeek: function() {
      var prePix, postPix, domNode = this.domNode;
      var keyPosition = bindingNode.clientHeight * aFraction;

      // Figure out the amount of extra widget pixels required before and after.
      // (Tiling compensation is handled by layoutBindAround; we don't need to think
      //  about that; where that = a 2d rather than 1d layout...)
      switch (aRelPos) {
        case "top":
          prePix = this.BUFFER_PIX;
          // Only the portion of the binding's height after the keyPosition will
          //  will be visible, so only subtract that off as covering the port.
          postPix = Math.max(0, domNode.clientHeight -
                                  (bindingNode.clientHeight - keyPosition));
          postPix += this.BUFFER_PIX;
          break;
        case "middle":
          prePix = Math.max(0, domNode.clientHeight / 2 - keyPosition) +
            this.BUFFER_PIX;
          postPix = Math.max(0, domNode.clientHeight / 2 -
                                  (bindingNode.clientHeight - keyPosition));
          break;
        case "bottom":
          prePix = Math.max(0, domNode.clientHeight - keyPosition) +
            this.BUFFER_PIX;
          postPix = this.BUFFER_PIX;
          break;
      }

console.log("prePix demands", prePix, "have", haveAbove);
      if (prePix > haveAbove)
        this.layoutBindAround(haveAbove ? domNode.firstChild : bindingNode,
                          this.firstIndex, -1, prePix - haveAbove);
console.log("postPix demands", postPix, "have", haveBelow);
      if (postPix > haveBelow)
        this.layoutBindAround(haveBelow ? domNode.lastChild : bindingNode,
                          this.lastIndex,  1, postPix - haveBelow);

      // slice the pre-existing bindings if they're (still) around
      if (this.existingBindingNode) {
        var sibling = this.existingBindingNode;
        var killNodes = [sibling];
        if (insertBeforeNode) { // kill preceding
          while((sibling = sibling.nextSibling)) {
            killNodes.push(sibling);
          }
        }
        else { // kill following
          while ((sibling = sibling.previousSibling)) {
            killNodes.push(sibling);
          }
        }
        this._killNodes(killNodes);
        this.existingBindingNode = null;
      }

      // - scroll things...
      var keyRelPos = bindingNode.offsetTop - domNode.offsetTop + keyPosition;
      switch (aRelPos) {
        case "top":
          domNode.scrollTop = keyRelPos - aPadPix;
          break;
        case "middle":
          domNode.scrollTop = keyRelPos - domNode.clientHeight / 2;
          break;
        case "bottom":
          domNode.scrollTop = keyRelPos - domNode.clientHeight - aPadPix;
          break;
      }

      this._trimFat();

      // if this resulted in the death of the previously focused dude,
      //  try and focus into the seeked dude.
      if (focusedBinding && !focusDomain.focusedBinding) {
        focusManager.ensureDomainFocused(focusDomain, binding);
      }

      this.reportVisibleBindings();
    },

    ////////////////////////////////////////////////////////////////////////////
    // Internal Logic

    /**
     * Scroll up (negative pix) / down (positive pix) by the given amount.  The
     *  assumption is that aPixAdjust is less than the amount we have buffered
     *  up.
     */
    _scroll: function wlib_virt__scroll(aPixAdjust) {
console.log("SCROLL", aPixAdjust);
      var domNode = this.domNode;
      // adjust scrollTop, bailing if there is nothing to do...
      var oldTop = domNode.scrollTop;
      domNode.scrollTop += aPixAdjust;
      if (domNode.scrollTop == oldTop)
        return;

      // do we need to bind more things into existence?
      if (aPixAdjust < 0) { // going up?
        console.log("scroll up spare", domNode.scrollTop);
        if (domNode.scrollTop < this.BUFFER_PIX)
          this.layoutBindAround(domNode.firstChild, this.firstIndex,
                            -1, this.BUFFER_PIX - domNode.scrollTop);
      }
      else { // going down...
        var spare =
          domNode.lastChild.offsetTop + domNode.lastChild.clientHeight -
          (domNode.offsetTop + domNode.scrollTop + domNode.clientHeight);
        console.log("scroll down spare", spare, "last child ends at",
                    domNode.lastChild.offsetTop + domNode.lastChild.clientHeight,
                    "end of visible area ends at",
                    domNode.offsetTop + domNode.scrollTop + domNode.clientHeight);
        if (spare < this.BUFFER_PIX)
          this.layoutBindAround(domNode.lastChild, this.lastIndex,
                            1, this.BUFFER_PIX - spare);
      }

      // should we nuke some stuff out of existence?
      this._trimFat();

      // tell the listener that what is visible has changed...
      this.reportVisibleBindings();
    },

    /**
     * Bind some minimum number of pixels worth of widgets into existence.
     *  Our algorithm is to bind an item, then see how much extra space it takes
     *  (the widget and its padding relative to our previous widget) and
     *  subtract that off of our goal.  We keep going until we run out of
     *  widgets or our goal is satisfied.  Because of seeking, it is possible
     *  for bound widgets to already exist that we can reuse.  In such a case
     *  we just count the widget like we brought it into existence.
     *
     * XXX We are going to try and handle the tiling case where not every
     *  binding actually makes headway along our dominant axis, but have no
     *  tests/examples for this yet.  For example, a contacts interface where
     *  people are little address book cards and it takes more than 1 to fill
     *  up a 'row'.
     *
     * We do not perform any cleanup; trimFat does that.
     *
     * @args[
     *   @param[aBaseNode DOMNode]{
     *     The node which we should bind before/after.
     *   }
     *   @param[aBaseIndex]{
     *
     *   }
     *   @param[aIndexDir]
     *   @param[aPixToFill]
     * ]
     * @return[Boolean]{
     *   true if we managed to fill our pixel quota, false if we did not.
     * }
     */
    layoutBindAround: function wlib_virt_layoutBindAround(
                             aBaseNode, aBaseIndex, aIndexDir, aPixToFill) {
      var index = aBaseIndex + aIndexDir;
      var items = this.obj, domNode = this.domNode;
      var allFilled = false;

      var partial = this.widgetPartial;
      var constraintBasis = this.constraintBasis, fab, newBinding;
      var insertBefore = (aIndexDir < 0) ? aBaseNode : aBaseNode.nextSibling;

      var curHeight = domNode.scrollHeight;
      // it may be a lie if the scroll height is the same as the client height
      if (curHeight == domNode.clientHeight) {
        curHeight = domNode.lastChild.offsetTop +
                      domNode.lastChild.clientHeight - domNode.offsetTop;
      }
      var sizeTarget = curHeight + aPixToFill;
      while ((aIndexDir < 0) ? (index >= 0) : (index < items.length)) {
        if (domNode.scrollHeight >= sizeTarget) {
          allFilled = true;
          break;
        }

        // check the existing disjoint set case...
        if (this.existingBindingNode) {
          var existingNode = this.existingBindingNode;
          // (after)
          if (this.existingFirstIndex == index) {
            index = this.existingLastIndex + aIndexDir;
            // subtract off everything from the top of the existing node to the
            //  bottom of the scroll area.
            sizeTarget -= domNode.scrollHeight - existingNode.offsetTop +
                            domNode.offsetTop;
            this.existingBindingNode = this.existingFirstIndex =
              this.existingLastIndex = null;
            continue;
          }
          // (before)
          else if (this.existingLastIndex == index) {
            index = this.existingFirstIndex + aIndexDir;
            // subtract off everything above the most recently inserted node
            //  (so as to include padding between the existing node and the
            //   inserted node)
            sizeTarget -= insertBefore.offsetTop - domNode.offsetTop;
            this.existingBindingNode = this.existingFirstIndex =
              this.existingLastIndex = null;
            continue;
          }
        }

        var item = items[index];
        constraintBasis.obj = item;

        fab = partial.evaluate(constraintBasis);
        newBinding = fab.insertBefore(constraintBasis, insertBefore, domNode);
        if (insertBefore)
          insertBefore = newBinding.domNode;

        index += aIndexDir;
      }

      if (aIndexDir < 0)
        domNode.scrollTop += domNode.scrollHeight - curHeight;

      index -= aIndexDir;
      if (index < this.firstIndex) {
        this.firstIndex = index;

      }
      if (index > this.lastIndex)
        this.lastIndex = index;
      return allFilled;
    },

    _killNodes: function wlib_virt__killNodes(killList) {
      var domNode = this.domNode;

      for (var i = 0; i < killList.length; i++) {
        var killNode = killList[i];
        var binding = killNode.binding;
        var item = binding.obj;
        binding.destroy();
        domNode.removeChild(killNode);
      }
    },

    /**
     * Nuke bound widgets that are beyond our retention limit.
     *
     * We inclusively keep things whose official bottoms are on the boundary
     *  because they may have some padding associated with them and we don't
     *  want to lose that padding.
     */
    _trimFat: function wlib_virt__trimFat() {
      var domNode = this.domNode, killList, curNode, targOff;
console.log("PRE FAT", domNode.scrollTop);
      // before...
      if (domNode.scrollTop > this.RETENTION_LIMIT) {
        var oldScrollHeight = domNode.scrollHeight;
        killList = [];
        // walk from the front queueing things for removal until we find
        //  something whose bottom is inside the retention range...
        targOff = domNode.offsetTop + domNode.scrollTop - this.RETENTION_LIMIT;
        for (curNode = domNode.firstChild;
               curNode.offsetTop + curNode.clientHeight < targOff;
               curNode = curNode.nextSibling) {
          killList.push(curNode);
        }
        this.firstIndex += killList.length;
        this._killNodes(killList);

        domNode.scrollTop -= oldScrollHeight - domNode.scrollHeight;
      }
console.log("POST FAT", domNode.scrollHeight - (domNode.scrollTop + domNode.clientHeight), "cur height", domNode.scrollHeight, "cur scroll offset", domNode.scrollTop);
      // after...
      if (domNode.scrollHeight -
            (domNode.scrollTop + domNode.clientHeight) > this.RETENTION_LIMIT) {
        killList = [];
        // walk from the back queueing things for removal until we find
        //  something whose top is inside the retention range
        targOff = domNode.offsetTop + domNode.scrollTop + domNode.clientHeight +
                    this.RETENTION_LIMIT;

        for (curNode = domNode.lastChild; curNode.offsetTop > targOff;
               curNode = curNode.previousSibling) {
          killList.push(curNode);
        }

        this.lastIndex -= killList.length;
        this._killNodes(killList);
      }
    },

    /**
     * Emit the list of visual bindings while also updating our
     *  firstVisibleNode/lastVisibleNode properties and potentially adjusting
     *  focus if something that was previously focused and visible is no longer
     *  visible at all.  (We allow things to be partially visible for the time
     *  being to avoid ridiculously annoying behaviour, especially because of
     *  edge cases involving bindings that are larger than the scroll area.)
     */
    reportVisibleBindings: function wlib_virt_reportBindings() {
      var visibleBindings = [], domNode = this.domNode;
      var focusManager = domNode.ownerDocument.wmsyFocusManager;
      // Find the focus domain we are contained within, if we are.  If there is
      //  no such focus domain (which includes the case where the only focus
      //  domains are embedded inside us), then we will do nothing in terms of
      //  updating the focus.
      var focusDomain = focusManager.findFocusDomainForBinding(this);
      var focusedBinding, focusedChild, focusedChildNode;
      var needToAdjustFocus = false;
      if (focusDomain) {
        // The thing that is focused may not actually be our immediate child
        //  (or our child at all) so walk up to find its parent that is our
        //  child (or find a total lack of ancestry).
        for (focusedChild = focusDomain.focusedBinding;
             focusedChild && focusedChild.domNode.parentNode != domNode;
             focusedChild = focusedChild.__parentBinding) {
          // (nothing to do in the loop)
        }
        if (focusedChild) {
          focusedBinding = focusDomain.focusedBinding;
          focusedChildNode = focusedChild.domNode;
        }
      }
      // (focusedChild is now either ~null or a child binding of ours and
      //  focusedBinding is either null or a focused descendant)

      var curNode = domNode.firstChild;
      // walk until we find our first (partially) visible node
      var visStart = domNode.offsetTop + domNode.scrollTop;
      while (curNode &&
             (curNode.offsetTop + curNode.clientHeight) <= visStart) {
        // there is no way the focused descendant is visible; plan to re-focus
        if (curNode === focusedChildNode)
          needToAdjustFocus = 1; // (enter from the left/top)
        curNode = curNode.nextSibling;
      }
      this.firstVisibleNode = curNode;

      // focus: our child might be only partially visible, which means the
      //  descendant might be entirely not visible.  check and handle.
      if (curNode && (curNode === focusedChildNode) &&
          (focusedBinding.domNode.offsetTop +
             focusedBinding.domNode.clientHeight <=
            visStart))
        needToAdjustFocus = 1; // (enter from the left/top)

      // walk until we run out of (visible) nodes
      var visEnd = domNode.offsetTop + domNode.scrollTop + domNode.clientHeight;
      while (curNode && (curNode.offsetTop < visEnd)) {
        visibleBindings.push(curNode.binding);
        curNode = curNode.nextSibling;
      }
      // (if we ran out of nodes, then the last child is the last visible child)
      this.lastVisibleNode = curNode ? curNode.previousSibling
                               : domNode.lastChild;
      // focus: our last visible node might only be partially visible, check
      //  the descendant for partial visibility (get upset if non-visible)
      if (this.lastVisibleNode && (this.lastVisibleNode === focusedChildNode) &&
          (focusedBinding.domNode.offsetTop >= visEnd))
        needToAdjustFocus = -1;

      while (curNode) {
        // there is no way the focused descendant is visible; plan to re-focus
        if (curNode === focusedChildNode)
          needToAdjustFocus = -1; // (enter from the right/bottom)
        curNode = curNode.nextSibling;
      }

      if (needToAdjustFocus) {
        if (needToAdjustFocus == 1) {
          function focusFilter(aBinding) {
            var predNode = aBinding.domNode;
            // only allow us to focus or consider focusing into bindings that
            //  are at least partially visible.
            return (predNode.offsetTop + predNode.clientHeight > visStart);
          }
        }
        else {
          function focusFilter(aBinding) {
            var predNode = aBinding.domNode;
            // only allow us to focus or consider focusing into bindings that
            //  are at least partially visible.
            return (predNode.offsetTop < visEnd);
          }
        }
        focusManager.navigate(true, needToAdjustFocus, focusFilter);
      }

      // report!
      this.emit_visibleBindings(visibleBindings);
    }
    ////////////////////////////////////////////////////////////////////////////
  },

  events: {
    root: {
      mousewheel: function (aBinding, aEvent) {
console.log("GOT SCROLL EVENT", aEvent.wheelDelta);
        this._scroll(-aEvent.wheelDelta);
      }
    }
  },

  emit: ["visibleBindings"],
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
      if (aPadPix == null)
        aPadPix = 0;

      var viewSlice = this.obj;
      var domNode = this.domNode;
      var focusManager = domNode.ownerDocument.wmsyFocusManager;
      // Find the focus domain we are contained within, if we are.  If there is
      //  no such focus domain (which includes the case where the only focus
      //  domains are embedded inside us), then we will do nothing in terms of
      //  updating the focus.
      var focusDomain = focusManager.findFocusDomainForBinding(this);
      // latch the focused binding (if there is one) so we can notice if it goes
      //  away entirely; in that case, try and focus into the thing that we were
      //  seeking to.
      var focusedBinding;
      if (focusDomain)
        focusedBinding = focusDomain.focusedBinding;

      var firstKidIndex = this.firstIndex, lastKidIndex = this.lastIndex;
      var item;
console.log("SEEK", aOrderingKey, aFraction, "cur range:", firstKidIndex, lastKidIndex);
      var binding, haveAbove, haveBelow, bindingNode;

      // If the seek location is in what we already have, then no need to bind
      //  the target index or track the potentially discontinuous range
      // (We don't treat it being adjacent to the range as sufficient since
      //  we still need to bind the index into existence and |layoutBindAround| is
      //  clever enough to reuse things.)
      // - In what we have!
      if (firstKidIndex != null &&
          aOrderingKey >= viewSlice.translateIndex(firstKidIndex) &&
          aOrderingKey <= viewSlice.translateIndex(lastKidIndex)) {
        // perform a linear scan of the things we already know about to find
        //  which binding
        bindingNode =
          this.domNode.children[viewSlice.searchKnown(aOrderingKey) -
                                this.firstIndex];
        binding = bindingNode.binding;

        haveAbove = bindingNode.offsetTop - domNode.offsetTop;
        haveBelow = domNode.scrollHeight -
          (bindingNode.offsetTop - domNode.offsetTop + bindingNode.clientHeight);
console.log("reusing", binding, "have above", haveAbove, "below", haveBelow);
      }
      // - Not in what we have!
      // We want to try and leave existing bindings intact until we are sure we
      //  don't need them, so figure out our insertion point relative to
      //  existing bindings.  We do want to keep a reference so that we can
      //  excise discontinuous segments.  (Reuse will clear this reference
      //  so then it purely becomes an issue of trimming fat.)
      else {
        var insertBeforeNode;
        if (firstKidIndex != null) {
          this.existingFirstIndex = firstKidIndex;
          this.existingLastIndex = lastKidIndex;
        }
        if (firstKidIndex == null ||
            aOrderingKey < viewSlice.translateIndex(firstKidIndex)) {
          this.existingBindingNode = insertBeforeNode = domNode.firstChild;
        }
        else { // aOrderingKey > viewSlice.translateIndex(lastKidIndex)
          this.existingBindingNode = domNode.lastChild;
          insertBeforeNode = null;
        }
console.log(" seek firstIndex clobbering from", this.firstIndex, "to", aIndex);
        this.firstIndex = this.lastIndex = aIndex;

        // bind/insert our new node
        var constraintBasis = this.constraintBasis;
        constraintBasis.obj = item = this.obj[aIndex];
        var fab = this.widgetPartial.evaluate(constraintBasis);
        binding = fab.insertBefore(constraintBasis, insertBeforeNode,
                                   domNode);

        // figure out positioning in terms of our bound widget...
        bindingNode = binding.domNode;
        haveAbove = haveBelow = 0;
      }
    },
  }
});

}); // end define
