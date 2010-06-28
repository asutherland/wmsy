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
      var WIDTH = domNode.clientWidth - MARGIN - STROKE_GLITCH,
          HEIGHT = domNode.clientHeight - MARGIN * 2 - STROKE_GLITCH;
      console.log("WIDTH", WIDTH, "HEIGHT", HEIGHT);

      // - root setup
      var scale = this.scale =
        pv.Scale.linear(
          this.obj.creationDate.valueOf(),
          events[events.length-1].date.valueOf())
        .range(0, HEIGHT);
      var vis = this.vis = new pv.Panel()
        .width(WIDTH)
        .height(HEIGHT)
        .top(MARGIN).bottom(MARGIN).right(MARGIN)
        .canvas(this.domNode);

      // - scroll thumb
      var scrollThumbPanel = this.scrollThumbPanel = vis.add(pv.Panel)
        .data([]);
      var scrollThumbColor = pv.color("orange");
      scrollThumbColor.opacity = 0.2;
      scrollThumbPanel.add(pv.Bar)
        .strokeStyle(scrollThumbColor)
        .fillStyle(scrollThumbColor)
        .right(5)
        .width(10)
        .top(function(d) { return scale(d[0]) - 5; })
        .height(function(d) { return scale(d[2]) - scale(d[0]) + 10; });
      scrollThumbPanel.add(pv.Dot)
        .shape("circle")
        .strokeStyle(scrollThumbColor)
        .fillStyle(scrollThumbColor)
        .top(function(d) { return scale(d[1]); })
        .right(10);

      // - event markers
      var eventColor = pv.rgb(128, 128, 128, 0.5);
      vis.add(pv.Rule)
        .right(10);
      vis.add(pv.Bar)
        .data(events)
        .strokeStyle(null)
        .fillStyle(eventColor)
        .right(5)
        .width(10)
        .top(function(d) { return scale(d.date.valueOf()); })
        .height(1);

      // - visible marking
      var domLinesPanel = this.domLinesPanel = vis.add(pv.Panel)
        .data([]);
      var evenColor = pv.color("#eeeeee");
      var oddColor = pv.color("#dddddd");
      //evenColor.opacity = oddColor.opacity = 0.5;
      domLinesPanel.add(pv.Area)
        .strokeStyle(null)
        .lineWidth(0)
        .fillStyle(function (d) {
                       if (d[3])
                         return oddColor;
                       return evenColor;
                     })
        .data(function (de) { return [de, de]; })
        .left(function (d) {
                switch (this.index) {
                  case 0:
                    return 0;
                  case 1:
                  default:
                    return WIDTH - 15;
                }
              })
        .top(function (d) {
               switch (this.index) {
                 case 0:
                   return d[0];
                 case 1:
                 default:
                   return scale(d[2]) - 1;
               }
             })
        .height(function(d) {
                  switch (this.index) {
                    case 0:
                      return d[1];
                    case 1:
                    default:
                      return 2;
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
      // subtract off the margin and weird stroke width padding
      clickY -= this.CLICK_COMPENSATE;
      var timeStamp = this.scale.invert(clickY);
      console.log("clicked at", clickY, "inverted to...", timeStamp);
      // find the closest event... XXX should binary search
      var events = this.obj.events;
      for (var i = 0; i < events.length; i++) {
        var event = events[i];
        if (event.date > timeStamp) {
          if (i) {
            var lev = events[i-1];
            var proportion = (timeStamp - lev.date.valueOf()) /
                               (event.date.valueOf() - lev.date.valueOf() + 1);
            this.emit_seek(lev.run.num,
                           (lev.run.events.indexOf(lev) /
                              lev.run.events.length) +
                             proportion / lev.run.events.length,
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
      mousedown: function(binding, event) {
        this.mouseIsDown = true;
        this.pixelSeek(event.offsetY);
        event.preventDefault();
      },
      mousemove: function(binding, event) {
        if (this.mouseIsDown) {
          this.pixelSeek(event.offsetY);
          event.preventDefault();
        }
      },
      mouseup: function(binding, event) {
        this.mouseIsDown = false;
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
          var domHeight = eventBinding.domNode.clientHeight;
          if (domOffset < halfHeight) {
            var nextEvent;
            if (iEvent + 1 < run.events.length)
              nextEvent = run.events[iEvent + 1];
            else if (run.num + 1 < this.obj.runs.length)
              nextEvent = this.obj.runs[run.num + 1].events[0];
            else
              nextEvent = event;
            var proportion = (halfHeight - domOffset) /
                               eventBinding.domNode.clientHeight;
            thumbSpan[1] = event.date.valueOf() +
              proportion * (nextEvent.date.valueOf() - event.date.valueOf());
          }

          domOffsetsToTime.push([domOffset, domHeight, event.date.valueOf(),
                                 event.id % 2]);
        }
      }

      this.domLinesPanel.data(domOffsetsToTime);
      this.domLinesPanel.render();
      this.scrollThumbPanel.render();
    }
  }
});

