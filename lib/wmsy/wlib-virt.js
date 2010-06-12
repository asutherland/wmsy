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
  },

  structure: {
  },

  /**
   * The prototype constructor is invoke the first time this widget type is
   *  parameterized.
   */
  protoConstructor: function (aConstraint) {
    this.widgetPartial = aConstraint.domain.dtree.partialEvaluate(
                           aConstraint.constraint);
    this.constraintBasis = aConstraint.constraint;
  },

  impl: {
    preInit: function() {
      this.existingBindingNode = null;
      // map indices to bindings
      this.indexMap = {};
      this.BUFFER_PIX = Math.max(120, this.domNode.clientHeight / 2);
      this.RETENTION_LIMIT = this.BUFFER_PIX * 2;
    },

    update: function() {
      this._update();

      var obj = this.obj;
      var partial = this.widgetPartial;
      var constraintBasis = this.constraintBasis;
      var domNode = this.domNode;
      for (var i = 0; i < obj.length; i++) {
        constraintBasis.obj = obj[i];
        var fab = partial.evaluate(constraintBasis);
        fab.appendChild(constraintBasis, domNode);
      }
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
     * @param aBaseIndex
     * @param aIndexDir
     * @param aPixToFill
     *
     * @return true if we managed to fill our pixel quota, false if we did not.
     */
    bindAtLeast: function(aBaseNode, aBaseIndex, aIndexDir, aPixToFill) {
      var index = aBaseIndex + aIndexDir;
      var items = this.obj, domNode = this.domNode, indexMap = this.indexMap;
      var alreadyFilled;

      var partial = this.widgetPartial;
      var constraintBasis = this.constraintBasis, fab, newBinding;
      var insertBefore = (aIndexDir < 0) ? aBaseNode : aBaseNode.nextSibling;

      var sizeTarget = domNode.scrollHeight + aPixToFill;
      while ((aIndexDir < 0) ? (index >= 0) : (index < items.length)) {
        if (domNode.scrollHeight > sizeTarget)
          return true;

        constraintBasis.obj = items[index];
        fab = partial.evaluate(constraintBasis);
        newBinding = fab.insertBefore(constraintBasis, insertBefore);
        indexMap[index] = newBinding;
        newBinding.__index = index; // XXX needed?

        index += aIndexDir;
      }

      return false;
    },

    /**
     * Nuke bound widgets that are beyond our retention limit.
     */
    trimFat: function() {
      var domNode = this.domNode, killList = null, curNode, targOff;
      // before...
      if (domNode.scrollHeight - domNode.scrollTop > this.RETENTION_LIMIT) {
        killList = [];
        // walk from the front queueing things for removal until we find
        //  something whose top is inside the retention range...
        targOff = domNode.offsetTop + domNode.scrollTop - this.RETENTION_LIMIT;
        for (curNode = domNode.firstChild;
               curNode.offsetTop + curNode.clientHeight < targOff;
               curNode = curNode.nextSibling) {
          killList.push(curNode);
        }
      }
      // after...
      if (domNode.scrollHeight - domNode.scrollBottom > this.RETENTION_LIMIT) {
        if (!killList)
          killList = [];
        // walk from the back queueing things for removal until we find
        //  something whose bottom is inside the retention range
        targOff = domNode.offsetTop + domNode.scrollTop + domNode.scrollHeight +
                    this.RETENTION_LIMIT;
        for (curNode = domNode.lastChild; curNode.offsetTop > targOff;
               curNode = curNode.prevSibling) {
          killList.push(curNode);
        }
      }
      if (killList) {
        var indexMap = this.indexMap;
        for (var i = 0; i < killList.length; i++) {
          var killNode = killList[i];
          delete indexMap[killNode.binding.__index]; // could derive...
          killNode.destroy();
          domNode.removeChild(killNode);
        }
      }
    },

    reportVisibleBindings: function() {
      var visibleBindings = [], domNode = this.domNode;

      var curNode = domNode.firstChild;
      // walk until we find our first visible node
      var visStart = domNode.offsetTop + domNode.scrollTop;
      while (curNode &&
             (curNode.offsetTop + curNode.clientHeight) < visStart) {
        curNode = curNode.nextSibling;
      }

      // walk until we run out of (visible) nodes
      var visEnd = domNode.offsetTop + domNode.scrollTop + domNode.scrollHeight;
      while (curNode && (curNode.offsetTop < visEnd)) {
        visibleBindings.push(curNode.binding);
        curNode = curNode.nextSibling;
      }

      // report!
      this.emit_visibleBindings(visibleBindings);
    }
  },

  events: {
    root: {
      mousewheel: function (aBinding, aEvent) {
        var domNode = this.domNode;
        // adjust scrollTop, bailing if there is nothing to do...
        var oldTop = domNode.scrollTop;
        domNode.scrollTop -= aEvent.wheelDelta;
        if (domNode.scrollTop == oldTop)
          return;

        // do we need to bind more things into existence?

        // should we nuke some stuff out of existence?

        // tell the listener that what is visible has changed...
        //this.emit_visibleBindings(bindings);
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
      var firstKidIndex = domNode.firstElement.binding.index;
      var lastKidIndex = domNode.lastElement.binding.index;

      var binding;

      // If the seek location is in what we already have, then no need to bind
      //  the target index or track the potentially discontinuous range
      // (We don't treat aIndex being adjacent to the range as sufficient since
      //  we still need to bind the index into existence and |bindAtLeast| is
      //  clever enough to reuse things.)
      if (aIndex >= firstKidIndex && aIndex <= lastKidIndex) {
        binding = this.indexMap[aIndex];
      }
      // We want to try and leave existing bindings intact until we are sure we
      //  don't need them, so figure out our insertion point relative to
      //  existing bindings.  We do want to keep a reference so that we can
      //  excise discontinuous segments.  (Reuse will clear this reference
      //  so then it purely becomes an issue of trimming fat.)
      else {
        var insertBeforeNode;
        if (aIndex < firstKidIndex) {
          this.existingBindingNode = insertBeforeNode = domNode.firstElement;
        }
        else if (aIndex > lastKidIndex) {
          this.existingBindingNode = domNode.lastElement;
          insertBeforeNode = null;
        }

        // bind/insert our new node
        var constraintBasis = this.constraintBasis;
        constraintBasis.obj = this.obj[aIndex];
        var fab = this.widgetPartial.evaluate(constraintBasis);
        binding = fab.insertBefore(constraintBasis, insertBeforeNode);
      }

      // figure out positioning in terms of our bound widget...
      var bindingNode = binding.domNode;
      var keyPosition = bindingNode.clientHeight * aFraction;

      // Figure out the amount of extra widget pixels required before and after.
      // (Tiling compensation is handled by bindAtLeast; we don't need to think
      //  about that; where that = a 2d rather than 1d layout...)
      var prePix, postPix;
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

      this.bindAtLeast(bindingNode, aIndex, -1, prePix);
      this.bindAtLeast(bindingNode, aIndex,  1, postPix);

      // slice the pre-existing bindings if they're (still) around
      if (this.existingBindingNode) {
        var parent = this.existingBindingNode.parentNode;
        var existing = this.existingBindingNode;
        var sibBinding, sibling, indexMap = this.indexMap;
        if (insertBeforeNode) { // kill preceding
          while ((sibling = existing.previousSibling)) {
            sibBinding = sibling.binding;
            delete indexMap[sibBinding.__index];
            sibBinding.destroy();
            parent.removeChild(sibling);
          }
        }
        else { // kill following
          while((sibling = existing.nextSibling)) {
            sibBinding = sibling.binding;
            delete indexMap[sibBinding.__index];
            sibBinding.destroy();
            parent.removeChild(sibling);
          }
        }
        parent.removeChild(existing);
        this.existingBindingNode = null;
      }

      // - scroll things...
      var keyRelPos = bindNode.offsetTop - domNode.offsetTop + keyPosition;
      switch (aRelPos) {
        case "top":
          domNode.scrollTop = keyRelPos - aPadPix;
          break;
        case "middle":
          domNode.scrollTop = keyRelPos + domNode.clientHeight / 2;
          break;
        case "bottom":
          domNode.scrollTop = keyRelPos + domNode.clientHeight - 1 - aPadPix;
          break;
      }
    }
  }
});
