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
      var domNode = this.domNode;
      console.log("height", domNode.clientHeight, domNode.scrollHeight);
      var WIDTH = domNode.clientWidth - MARGIN * 2 - STROKE_GLITCH,
          HEIGHT = domNode.clientHeight - MARGIN * 2 - STROKE_GLITCH;
      console.log("HEIGHT", HEIGHT);
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

    pixelSeek: function() {

    }
  }
});

