var wmsy = require("wmsy/wmsy");
var wy = exports.wy = new wmsy.WmsyDomain({id: "bugzilla-vis"});

/**
 * Vertical bug activity timeline that also serves as the scrollbar and provider
 *  of time context by connecting bug events with their location on the
 *  timeline.
 *
 * - The timeline display is currently linear.
 * - The scroll-thumb exists as a snappy focus point that tries to approximate
 *    the center point of the viewport with whiskers that express the time
 *    range covered by the viewport.
 */
wy.defineWidget({
  name: "bug-activity-vis",
  doc: "Visualizes activity on the bug.",
  constraint: {
    type: "bug-detail",
    subwidget: "bug-activity-vis",
  },
  structure: {},
  impl: {
    preInit: function bug_act_vis_preInit() {
      // Pieces of data:
      // - the events, they go on the timeline...
      // - 'exploded' event edge references that want lines connecting them to
      //    the timeline
      // - the scroll thumb
      var events = this.obj.events;
      // looks like stroke of 1.5 adds 1.5 * 2 to our size...
      var MARGIN = 10, STROKE_GLITCH = 3;
      this.CLICK_COMPENSATE = 11.5;
      var domNode = this.domNode;
      console.log("height", domNode.clientHeight, domNode.scrollHeight);
      var WIDTH = domNode.clientWidth - MARGIN * 2 - STROKE_GLITCH,
          HEIGHT = domNode.clientHeight - MARGIN * 2 - STROKE_GLITCH;
      console.log("HEIGHT", HEIGHT);

      // - event markers
      var scale = this.scale =
        pv.Scale.linear(
          this.obj.creationDate.valueOf(),
          events[events.length-1].date.valueOf())
        .range(0, HEIGHT);
      var vis = this.vis = new pv.Panel()
        .width(WIDTH)
        .height(HEIGHT)
        .margin(MARGIN)
        .canvas(this.domNode);
      vis.add(pv.Rule)
        .left(10);
      vis.add(pv.Dot)
        .data(events)
        .left(10)
        .top(function(d) { return scale(d.date.valueOf()); })
        .shape("cross");

      // - visible marking
      var domLinesPanel = this.domLinesPanel = vis.add(pv.Panel)
        .data([]);
      domLinesPanel.add(pv.Line)
        .strokeStyle(pv.color("#eeeeee"))
        .data(function (d) { return [d, d, d]; })
        .left(function (d) {
                switch (this.index) {
                  case 0:
                    return 10;
                  case 1:
                    return WIDTH - 10;
                  case 2:
                  default:
                    return WIDTH;
                }
              })
        .top(function (d) {
               switch (this.index) {
                 case 0:
                   return scale(d[1]);
                 case 1:
                 case 2:
                 default:
                   return d[0];
               }
             });

      vis.render();
      // protovis seems to be clobbering us to be an inline-block?
      this.domNode.setAttribute("style", "");
      //this.domNode.children[0].setAttribute("style",
      //  "-moz-box-flex: 1; -webkit-box-flex: 1; box-flex: 1; display: block;");
    },

    resize: function(width, height) {
      this.scale.range(0, height);
      this.vis.width(width).height(height).render();
    },

    /**
     * Respond to a click on the timeline attempting to approximate the click
     *  location as the center of the viewport.
     */
    pixelSeek: function(clickY) {
      var timeStamp = this.scale.invert(clickY - this.CLICK_COMPENSATE);
      // find the index of the
    }
  },
  emit: ["seek"],
  receive: {
    /**
     * In response to a change in what the virtual list is showing:
     * - Refresh the data-set for the DOM-to-timeline markers...
     * - Figure out the binding that is in the center of the viewport and use
     *   that to define the scroll-thumb center.  Then find the min/max time
     *   range covered by visible bindings and use that to bound the thumb
     *   'whiskers'.
     */
    visibleBindings: function(aBindings) {
console.log("visible bindings:", aBindings);
      var domOffsetsToTime = [], rootCompensate;
      if (aBindings.length) {
        var rootNode = aBindings[0].domNode.parentNode; // put origin arg back?
        rootCompensate = rootNode.offsetTop + rootNode.scrollTop;
      }
      for (var i = 0; i < aBindings.length; i++) {
        var runBinding = aBindings[i];
        var run = runBinding.obj;

        for (var iEvent = 0; iEvent < run.events.length; iEvent++) {
          var event = run.events[iEvent];
          var eventBinding = runBinding.events_itemMap[event.id];

          domOffsetsToTime.push([
            eventBinding.domNode.offsetTop - rootCompensate,
            event.date.valueOf()
          ]);
        }
      }
console.log("dom offsets update:", domOffsetsToTime);
      this.domLinesPanel.data(domOffsetsToTime);
      this.domLinesPanel.render();
    }
  }
});

