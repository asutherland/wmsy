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
   *  paramterized.
   */
  protoConstructor: function (aConstraint) {
    this.widgetPartial = aConstraint.domain.dtree.partialEvaluate(
                           aConstraint.constraint);
    this.constraintBasis = aConstraint.constraint;
  },

  impl: {
    update: function() {
      this._update();
      // XXX incremental development hack: build all the widgets in the list!
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
     */
    bindAtLeast: function() {

    },

    /**
     * Nuke bound widgets that are beyond our retention limit.
     */
    trimFat: function() {
      var domNode = this.domNode;
      // before...
      if (domNode.scrollHeight - domNode.scrollTop > this.RETENTION_LIMIT) {
        // walk from the front queueing things for removal until we find
        //  something whose top is inside the retention range...
      }
      // after...
      if (domNode.scrollHeight - domNode.scrollBottom > this.RETENTION_LIMIT) {
        // walk from the back queueing things for removal until we find
        //  something whose bottom is inside the retention range
      }
    },
  },

  events: {
    root: {
      mousewheel: function (aBinding, aEvent) {
        this.domNode.scrollTop -= aEvent.wheelDelta;

        // do we need to bind more things into existence?

        // should we nuke some stuff out of existence?

        // tell the listener that what is visible has changed...
        //this.emit_visibleBindings(bindings);
      }
    }
  },

  handle: {
    /**
     * We are told to seek focusing on a specific item index, a point along its
     *  bound shape, and the relative position that point should have on the
     *  page.
     */
    seek: function(aOrigin, aIndex, aFraction, aRelPos) {
      // We want to try and leave existing bindings intact until we are sure we
      //  don't need them, so figure out our insertion point relative to
      //  existing bindings.  We do want to keep a reference so that we can
      //  excise discontinuous segments.  (Reuse will clear this reference
      //  so then it purely becomes an issue of trimming fat.)

      // make sure we've got the requested index reflected in already...

      // figure out required padding magic...

      // ensure minimum widget padding around it...


    }
  }
});
