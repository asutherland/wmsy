var wmsy = require("wmsy/wmsy-core");

var wy = new wmsy.WmsyDomain({id: "wlib-virt", domain: "wlib"});

/**
 * The virtualized widget container:
 * - Responds directly to scrollwheel control, requesting additional items to
 *    bind widgets to as needed, and destroying bindings that are no longer in
 *    focus.
 * - (Eventually, respond to touch scrolls like scrollwheel if that's not free.)
 * - Annotates each binding with that conveys its absolute position in the set.
 * - Tells the scroll provider about the currently visible bindings.
 * - Services seek requests
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

  structure: {
  },

  style: {
    root: [
      "overflow: hidden;",
    ],
  },

  /**
   * The prototype constructor is invoke the first time this widget type is
   *  parameterized.
   */
  protoConstructor: function (aConstraint) {
    this.widgetPartial = aConstraint.domain.dtree.partialEvaluate(
                           aConstraint.constraint);
    this.constraintBasis = aConstraint.constraint;
    this.idAttr = ("id" in aConstraint) ? aConstraint.id : "id";
  },

  impl: {
    preInit: function wlib_virt_preInit() {
      this.existingBindingNode = null;
      this.itemMap = {};
      // the index of the first instantiated child binding
      this.firstIndex = null;
      // the index of the last instantiated child binding
      this.lastIndex = null;
      this.BUFFER_PIX = Math.max(120, this.domNode.clientHeight / 2);
      this.RETENTION_LIMIT = this.BUFFER_PIX * 2;
    },

    update: function wlib_virt_update() {
      this._update();
      this._receive_seek(0, 0, "top", 0);
    },

    destroy: function wlib_virt_destroy() {
      this._destroy();
      var itemMap = this.itemMap;
      // nuke all our currently instantiated bindings!
      for (var id in itemMap) {
        itemMap[id].destroy();
      }
      this.itemMap = null;
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
     * @param aBaseNode
     * @param aBaseIndex
     * @param aIndexDir
     * @param aPixToFill
     *
     * @return true if we managed to fill our pixel quota, false if we did not.
     */
    _bindAtLeast: function wlib_virt__bindAtLeast(
                             aBaseNode, aBaseIndex, aIndexDir, aPixToFill) {
console.log("base index", aBaseIndex, "dir", aIndexDir, "pix", aPixToFill);
      var index = aBaseIndex + aIndexDir;
      var items = this.obj, domNode = this.domNode, itemMap = this.itemMap;
      var idAttr = this.idAttr, itemId;
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

console.log("scroll height:", domNode.scrollHeight, "target", sizeTarget, "index", index, "client height:", domNode.clientHeight);

        // check the existing disjoint set case...
        if (this.existingBindingNode) {
console.log("existing check", this.existingFirstIndex, this.existingLastIndex);
          var existingNode = this.existingBindingNode;
          // (after)
          if (this.existingFirstIndex == index) {
            index = this.existingFirstIndex + aIndexDir;
            // subtract off everything from the top of the existing node to the
            //  bottom of the scroll area.
            sizeTarget -= domNode.scrollHeight - existingNode.offsetTop +
                            domNode.offsetTop;
console.log("REUSE AFTER", sizeTarget);
            this.existingBindingNode = this.existingFirstIndex =
              this.existingLastIndex = null;
            continue;
          }
          // (before)
          else if (this.existingLastIndex == index) {
            index = this.existingLastIndex + aIndexDir;
            // subtract off everything above the most recently inserted node
            //  (so as to include padding between the existing node and the
            //   inserted node)
            sizeTarget -= insertBefore.offsetTop - domNode.offsetTop;
console.log("REUSE BEFORE", sizeTarget);
            this.existingBindingNode = this.existingFirstIndex =
              this.existingLastIndex = null;
            continue;
          }
        }

        var item = items[index];
        constraintBasis.obj = item;
console.log("binding", item, "at", index);
        fab = partial.evaluate(constraintBasis);
        newBinding = fab.insertBefore(constraintBasis, insertBefore, domNode);
        if (insertBefore)
          insertBefore = newBinding.domNode;
        itemId = (idAttr == null) ? item : item[idAttr];
        itemMap[itemId] = newBinding;

        index += aIndexDir;
      }

      if (aIndexDir < 0)
        domNode.scrollTop += domNode.scrollHeight - curHeight;

      index -= aIndexDir;
      if (index < this.firstIndex)
        this.firstIndex = index;
      if (index > this.lastIndex)
        this.lastIndex = index;
      return allFilled;
    },

    _killNodes: function wlib_virt__killNodes(killList) {
      var domNode = this.domNode;
      var itemMap = this.itemMap, idAttr = this.idAttr;
      console.log("  want to kill", killList.length);
      for (var i = 0; i < killList.length; i++) {
        var killNode = killList[i];
        var binding = killNode.binding;
        var item = binding.obj;
        var itemId = (idAttr == null) ? item : item[idAttr];
        delete itemMap[itemId];
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
console.log("PRE FAT", domNode.scrollHeight - domNode.scrollTop);
      // before...
      if (domNode.scrollHeight - domNode.scrollTop > this.RETENTION_LIMIT) {
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

console.log("old scroll height", oldScrollHeight, "new", domNode.scrollHeight);
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
console.log("target offset", targOff);
        for (curNode = domNode.lastChild; curNode.offsetTop > targOff;
               curNode = curNode.previousSibling) {
console.log("considering", curNode.offsetTop);
          killList.push(curNode);
        }
console.log("gave up as of", curNode.offsetTop);
        this.lastIndex -= killList.length;
        this._killNodes(killList);
      }
    },

    reportVisibleBindings: function wlib_virt_reportBindings() {
      var visibleBindings = [], domNode = this.domNode;

      var curNode = domNode.firstChild;
      // walk until we find our first visible node
      var visStart = domNode.offsetTop + domNode.scrollTop;
console.log("REPORT walking until", visStart);
      while (curNode &&
             (curNode.offsetTop + curNode.clientHeight) <= visStart) {
console.log("  rep cur", curNode.offsetTop, curNode.clientHeight, "obj", curNode.binding.obj);
        curNode = curNode.nextSibling;
      }

console.log("  WALKED until", curNode.offsetTop, curNode.clientHeight);

      // walk until we run out of (visible) nodes
      var visEnd = domNode.offsetTop + domNode.scrollTop + domNode.clientHeight;
console.log("  GOBBLING until", visEnd);
      while (curNode && (curNode.offsetTop < visEnd)) {
        visibleBindings.push(curNode.binding);
console.log("  rep cur", curNode.offsetTop, curNode.clientHeight, "obj", curNode.binding.obj);
        curNode = curNode.nextSibling;
      }

      while (curNode) {
console.log("  not reporting", curNode.binding.obj);
        curNode = curNode.nextSibling;
      }

      // report!
      this.emit_visibleBindings(visibleBindings);
    }
  },

  events: {
    root: {
      mousewheel: function (aBinding, aEvent) {
console.log("GOT SCROLL EVENT", aEvent.wheelDelta);
        var domNode = this.domNode;
        // adjust scrollTop, bailing if there is nothing to do...
        var oldTop = domNode.scrollTop;
        domNode.scrollTop -= aEvent.wheelDelta;
console.log("NEW SCROLL TOP", domNode.scrollTop);
        if (domNode.scrollTop == oldTop)
          return;

        // do we need to bind more things into existence?
        if (aEvent.wheelDelta > 0) { // going up?
console.log("scroll up spare", domNode.scrollTop);
          if (domNode.scrollTop < this.BUFFER_PIX)
            this._bindAtLeast(domNode.firstChild, this.firstIndex,
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
            this._bindAtLeast(domNode.lastChild, this.lastIndex,
                             1, this.BUFFER_PIX - spare);
        }

        // should we nuke some stuff out of existence?
        this._trimFat();

        // tell the listener that what is visible has changed...
        this.reportVisibleBindings();
      }
    }
  },

  emit: ["visibleBindings"],
  receive: {
    /**
     * We are told to seek focusing on a specific item index, a point along its
     *  bound shape, and the relative position that point should have on the
     *  page.
     */
    seek: function(aIndex, aFraction, aRelPos, aPadPix) {
      if (aPadPix == null)
        aPadPix = 0;

      var domNode = this.domNode;
      var firstKidIndex = this.firstIndex, lastKidIndex = this.lastIndex;
      var itemMap = this.itemMap, idAttr = this.idAttr, item, itemId;
console.log("SEEK", aIndex, "cur range:", firstKidIndex, lastKidIndex);
      var binding, prePix, postPix, haveAbove, haveBelow, bindingNode;

      // If the seek location is in what we already have, then no need to bind
      //  the target index or track the potentially discontinuous range
      // (We don't treat aIndex being adjacent to the range as sufficient since
      //  we still need to bind the index into existence and |_bindAtLeast| is
      //  clever enough to reuse things.)
      if (firstKidIndex != null &&
          aIndex >= firstKidIndex && aIndex <= lastKidIndex) {
        bindingNode = this.domNode.children[aIndex - this.firstIndex];
        binding = bindingNode.binding;

        haveAbove = bindingNode.offsetTop - domNode.offsetTop;
        haveBelow = domNode.scrollHeight -
          (bindingNode.offsetTop - domNode.offsetTop + bindingNode.clientHeight);
console.log("reusing", binding, "have above", haveAbove, "below", haveBelow);
      }
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
        if (firstKidIndex == null || aIndex < firstKidIndex) {
          this.existingBindingNode = insertBeforeNode = domNode.firstChild;
        }
        else { // aIndex > lastKidIndex
          this.existingBindingNode = domNode.lastChild;
          insertBeforeNode = null;
        }
        this.firstIndex = this.lastIndex = aIndex;

        // bind/insert our new node
        var constraintBasis = this.constraintBasis;
        constraintBasis.obj = item = this.obj[aIndex];
        var fab = this.widgetPartial.evaluate(constraintBasis);
        binding = fab.insertBefore(constraintBasis, insertBeforeNode,
                                   domNode);
        itemId = (idAttr == null) ? item : item[idAttr];
        itemMap[itemId] = binding;

        // figure out positioning in terms of our bound widget...
        bindingNode = binding.domNode;
        haveAbove = haveBelow = 0;
      }
      var keyPosition = bindingNode.clientHeight * aFraction;

      // Figure out the amount of extra widget pixels required before and after.
      // (Tiling compensation is handled by _bindAtLeast; we don't need to think
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

      if (prePix > haveAbove)
        this._bindAtLeast(haveAbove ? domNode.firstChild : bindingNode,
                          this.firstIndex, -1, prePix - haveAbove);
      if (postPix > haveBelow)
        this._bindAtLeast(haveBelow ? domNode.lastChild : bindingNode,
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
          domNode.scrollTop = keyRelPos + domNode.clientHeight / 2;
          break;
        case "bottom":
          domNode.scrollTop = keyRelPos - domNode.clientHeight - aPadPix;
          break;
      }

      this._trimFat();

      this.reportVisibleBindings();
    }
  }
});