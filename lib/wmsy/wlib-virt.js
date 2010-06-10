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
  },

  events: {
    root: {
      mousewheel: function (aBinding, aEvent) {
        this.domNode.scrollTop -= aEvent.wheelDelta;
      }
    }
  }
});
