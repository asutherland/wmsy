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
    type: "bug",
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
      var WIDTH = 200, HEIGHT = 600;
      var scale = this.scale =
        pv.Scale.linear(
          this.obj.creationDate.valueOf(),
          events[events.length-1].date.valueOf())
        .range(HEIGHT);
      var vis = this.vis = new pv.Panel()
        .width(WIDTH)
        .height(HEIGHT)
        .canvas(this.domNode);
      vis.add(pv.Rule)
        .left(10);
      vis.add(pv.Dot)
        .top(function(d) { return scale(d.date.valueOf()); })
        .shape("cross");
      vis.render();
    },

    pixelSeek: function() {

    }
  }
});

