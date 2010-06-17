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

      // - scroll thumb
      var scrollThumbPanel = this.scrollThumbPanel = vis.add(pv.Panel)
        .data([]);
      var scrollThumbColor = pv.color("orange");
      scrollThumbPanel.add(pv.Bar)
        .strokeStyle(scrollThumbColor)
        .fillStyle(null)
        .left(5)
        .width(10)
        .top(function(d) { return scale(d[0]) - 5; })
        .height(function(d) { return scale(d[2]) - scale(d[0]) + 10; });
      scrollThumbPanel.add(pv.Dot)
        .shape("circle")
        .strokeStyle(scrollThumbColor)
        .fillStyle(scrollThumbColor)
        .top(function(d) { return scale(d[1]); })
        .left(10);

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
      var timeStamp = this.scale.invert(clickY);
      console.log("inverted to...", timeStamp);
      // find the closest event... XXX should binary search
      var events = this.obj.events;
      for (var i = 0; i < events.length; i++) {
        var event = events[i];
        if (event.date > timeStamp) {
          if (i) {
            var lev = events[i-1];
            this.emit_seek(lev.run.num,
                           (lev.run.events.indexOf(lev) + 1) /
                             (2 * lev.run.events.length),
                           "middle", 0);
          }
          else {
            this.emit_seek(0, 0, "middle", 0);
          }
          return;
        }
      }
    }
  },
  events: {
    root: {
      click: function(binding, event) {
        console.log("CLICK!", event);
        this.pixelSeek(event.offsetY);
      }
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
      var domOffsetsToTime = [], rootCompensate, thumbSpan, halfHeight;
      if (aBindings.length) {
        var rootNode = aBindings[0].domNode.parentNode; // put origin arg back?
        var MARGIN = 10;
        rootCompensate = rootNode.offsetTop + rootNode.scrollTop + MARGIN;
        halfHeight = rootNode.clientHeight / 2;

        var lastEvents = aBindings[aBindings.length - 1].obj.events;
        thumbSpan = [
          aBindings[0].obj.events[0].date.valueOf(),
          0,
          lastEvents[lastEvents.length - 1].date.valueOf(),
        ];
        this.scrollThumbPanel.data([thumbSpan]);
      }
      for (var i = 0; i < aBindings.length; i++) {
        var runBinding = aBindings[i];
        var run = runBinding.obj;

        for (var iEvent = 0; iEvent < run.events.length; iEvent++) {
          var event = run.events[iEvent];
          var eventBinding = runBinding.events_itemMap[event.id];

          var domOffset = eventBinding.domNode.offsetTop - rootCompensate;
          if (domOffset < halfHeight)
            thumbSpan[1] = event.date.valueOf();

          domOffsetsToTime.push([domOffset, event.date.valueOf()]);
        }
      }
console.log("dom offsets update:", domOffsetsToTime);
      this.domLinesPanel.data(domOffsetsToTime);
      this.domLinesPanel.render();
      this.scrollThumbPanel.render();
    }
  }
});

