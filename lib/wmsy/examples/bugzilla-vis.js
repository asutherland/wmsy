/*****************************BEGIN LICENSE BLOCK *****************************
* Version: MPL 1.1/GPL 2.0/LGPL 2.1
*
* The contents of this file are subject to the Mozilla Public License Version
* 1.1 (the "License"); you may not use this file except in compliance with the
* License. You may obtain a copy of the License at http://www.mozilla.org/MPL/
*
* Software distributed under the License is distributed on an "AS IS" basis,
* WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License for
* the specific language governing rights and limitations under the License.
*
* The Original Code is Thunderbird Jetpack Functionality.
*
* The Initial Developer of the Original Code is the Mozilla Foundation.
* Portions created by the Initial Developer are Copyright (C) 2010 the Initial
* Developer. All Rights Reserved.
*
* Contributor(s):
*  Andrew Sutherland <asutherland@asutherland.org> (Original Author)
*
* Alternatively, the contents of this file may be used under the terms of either
* the GNU General Public License Version 2 or later (the "GPL"), or the GNU
* Lesser General Public License Version 2.1 or later (the "LGPL"), in which case
* the provisions of the GPL or the LGPL are applicable instead of those above.
* If you wish to allow use of your version of this file only under the terms of
* either the GPL or the LGPL, and not to allow others to use your version of
* this file under the terms of the MPL, indicate your decision by deleting the
* provisions above and replace them with the notice and other provisions
* required by the GPL or the LGPL. If you do not delete the provisions above, a
* recipient may use your version of this file under the terms of any one of the
* MPL, the GPL or the LGPL.
*
****************************** END LICENSE BLOCK ******************************/

require.def(
  [
    "wmsy/wmsy",
    "wmsy/opc/protovis",
    "exports",
  ],
  function(
    wmsy,
    pv,
    exports
  ) {

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
 *
 * Important sizing note!  The bounding box wants to make us larger than we want
 *  to be by a factor of 2 * stroke-width.  This is currently dealt with by
 *  styling our root node with "overflow: hidden" but other options might
 *  include clobbering stroke-width off of the svg node (although I think the
 *  spec suggests that bounding box calculation is more thorough than that) or
 *  explicitly setting preserveAspectRatio="xMinYMin" and possible viewBox.
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
    postInit: function bug_act_vis_postInit() {
      // Pieces of data:
      // - the events, they go on the timeline...
      // - 'exploded' event edge references that want lines connecting them to
      //    the timeline
      // - the scroll thumb
      var events = this.obj.events;
      var MARGIN = 10;
      this.CLICK_COMPENSATE = 10;
      var domNode = this.domNode;
      console.log("height", domNode.clientHeight, domNode.scrollHeight);
      var WIDTH = domNode.clientWidth - MARGIN,// - STROKE_GLITCH,
          HEIGHT = domNode.clientHeight - MARGIN * 2;// - STROKE_GLITCH;
      var USER_EVENT_WIDTH = 5;
      var USER_EVENT_TYPES = 4;
      var TIMELINE_WIDTH = USER_EVENT_WIDTH * USER_EVENT_TYPES;
      var TIMELINE_GUTTER_WIDTH = 20;
      var SELECTED_EXTRA_WIDTH = 10;
      var CONNECTOR_WIDTH = WIDTH - TIMELINE_WIDTH - SELECTED_EXTRA_WIDTH
                              - TIMELINE_GUTTER_WIDTH;
      console.log("WIDTH", WIDTH, "HEIGHT", HEIGHT);

      // - root setup
      var scale = this.scale =
        pv.Scale.linear(
          this.obj.creationDate,
          events[events.length-1].date)
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
      scrollThumbColor.opacity = 0.1;
      scrollThumbPanel.add(pv.Bar)
        .strokeStyle(scrollThumbColor)
        .fillStyle(scrollThumbColor)
        .left(CONNECTOR_WIDTH)
        .width(TIMELINE_WIDTH)
        .top(function(d) { return scale(d[0]) - 5; })
        .height(function(d) { return scale(d[2]) - scale(d[0]) + 10; });
      scrollThumbPanel.add(pv.Dot)
        .shape("circle")
        .visible(false) // XXX TURN OFF WHILE IT'S STILL CRAZY
        .strokeStyle(scrollThumbColor)
        .fillStyle(scrollThumbColor)
        .top(function(d) { return scale(d[1]); })
        .left(CONNECTOR_WIDTH + 5);

      // - vertical bar
      //vis.add(pv.Rule)
      //  .right(10);

      // - timeline axis labels
      vis.add(pv.Rule)
        .data(function() {
          var domain = scale.domain();
          var ticks = scale.ticks();
          // add a starting tick if there is at least 16 pixels before the
          //  first suggested tick
          if (scale(ticks[0]) - scale(domain[0]) > 16)
            ticks.unshift(domain[0]);
          // add an ending tick if there is at least 16 pixels after the
          //  last suggested tick.
          if (scale(domain[1]) - scale(ticks[ticks.length-1]) > 16)
            ticks.push(domain[1]);
          return ticks;
         })
        .top(scale)
        .left(CONNECTOR_WIDTH)
        .width(TIMELINE_WIDTH)
        .strokeStyle(pv.color("#cccccc"))
        .anchor("right").add(pv.Label)
          //.textAlign("left")
          .textStyle(pv.color("#888888"))
          .text(scale.tickFormat);

      // - focused event axis label
      var focusedColor = pv.color("#ffd280");
      this.focusedRulePanel = vis.add(pv.Panel)
        .data([]);
      this.focusedRule = this.focusedRulePanel.add(pv.Rule)
        .top(scale)
        .left(CONNECTOR_WIDTH)
        .width(TIMELINE_WIDTH + SELECTED_EXTRA_WIDTH)
        .lineWidth(2)
        .strokeStyle(focusedColor)
        .anchor("right").add(pv.Label)
          /* XXX try out some displacement logic to avoid overlap...
          .textMargin(function(d) {
                        var oury = scale(d);

                      })
           */
          //.textAlign("left")
          .text(scale.tickFormat);

      // - event markers
      var userColor = pv.rgb(128, 128, 128, 0.5);
      var qaColor = pv.rgb(128, 0, 0, 0.5);
      var driverColor = pv.rgb(0, 128, 0, 0.5);
      var devColor = pv.rgb(0, 0, 128, 0.5);
      this.visEvents = vis.add(pv.Bar)
        .data(events)
        .strokeStyle(null)
        .fillStyle(function(d) {
                     switch (d.author.tags.role) {
                     default:
                       return userColor;
                     case "qa":
                       return qaColor;
                     case "driver":
                       return driverColor;
                     case "dev":
                       return devColor;
                     }
                   })
        .left(function(d) {
                switch (d.author.tags.role) {
                  default:
                    return CONNECTOR_WIDTH;
                  case "qa":
                    return CONNECTOR_WIDTH + USER_EVENT_WIDTH;
                  case "driver":
                    return CONNECTOR_WIDTH + 2 * USER_EVENT_WIDTH;
                  case "dev":
                    return CONNECTOR_WIDTH + 3 * USER_EVENT_WIDTH;
                }
              })
        .width(USER_EVENT_WIDTH)
        .top(function(d) { return scale(d.date.valueOf()) - 1; })
        .height(1);

      // - connecty curvy zebra stripes
      var domLinesPanel = this.domLinesPanel = vis.add(pv.Panel)
        .data([]);
      var evenColor = pv.color("#eeeeee");
      var oddColor = pv.color("#dddddd");
      //evenColor.opacity = oddColor.opacity = 0.5;
      domLinesPanel.add(pv.Area)
        .interpolate("basis")
        .tension(0.9)
        .strokeStyle(null)
        .lineWidth(0)
        .fillStyle(function (d) {
                     if (d[3].focused)
                       return focusedColor;
                     if (d[2].id % 2)
                       return oddColor;
                     return evenColor;
                   })
        .data(function (de) { return [de, de, de, de]; })
        .left(function (d) {
                switch (this.index) {
                  case 0:
                    return 0;
                  case 1:
                    return 20;
                  case 2:
                    return CONNECTOR_WIDTH - 10;
                  default:
                    return CONNECTOR_WIDTH;
                }
              })
        .top(function (d) {
               switch (this.index) {
                 case 0:
                 case 1:
                   return d[0];
                 default:
                   return scale(d[2].date) - 1;
               }
             })
        .height(function(d) {
                  switch (this.index) {
                    case 0:
                    case 1:
                      return d[1];
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
            var proportion = (event.date.valueOf() == lev.date.valueOf()) ? 0
                               : (timeStamp - lev.date.valueOf()) /
                                  (event.date.valueOf() - lev.date.valueOf());
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
      },
      mousewheel: function(binding, event) {
        this.emit_virtScroll(-event.wheelDelta);
      }
    }
  },
  emit: ["seek", "virtScroll"],
  receive: {
    /**
     * In response to a change in what the virtual list is showing:
     * - Refresh the data-set for the DOM-to-timeline markers...
     * - Figure out the binding that is in the center of the viewport and use
     *   that to define the scroll-thumb center.  Then find the min/max time
     *   range covered by visible bindings and use that to bound the thumb
     *   'whiskers'.
     */
    visibleBindings: function(aBindings, containerBounds, aDelta) {
      var domOffsetsToTime = [], rootCompensate, thumbSpan, halfHeight;
      // - thumb prep
      if (aBindings.length) {
        var rootNode = aBindings[0].domNode.parentNode; // put origin arg back?
        var MARGIN = 10;
        rootCompensate = containerBounds.top + MARGIN + aDelta;
        halfHeight = rootNode.clientHeight / 2;

        var lastEvents = aBindings[aBindings.length - 1].obj.events;
        thumbSpan = [
          aBindings[0].obj.events[0].date.valueOf(),
          0,
          lastEvents[lastEvents.length - 1].date.valueOf(),
        ];
        this.scrollThumbPanel.data([thumbSpan]);
      }
      // - zebra (with thumb updates)
      for (var i = 0; i < aBindings.length; i++) {
        var runBinding = aBindings[i];
        var run = runBinding.obj;

        for (var iEvent = 0; iEvent < run.events.length; iEvent++) {
          var event = run.events[iEvent];
          var eventBinding = runBinding.events_element.children[iEvent].binding;

          var domOffset = eventBinding.domNode.getBoundingClientRect().top -
                            rootCompensate;
          var domHeight = eventBinding.domNode.offsetHeight;
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

          domOffsetsToTime.push([domOffset, domHeight, event, eventBinding]);
        }
      }

      this.domLinesPanel.data(domOffsetsToTime);
      this.domLinesPanel.render();
      this.scrollThumbPanel.render();
    },
    visNeedsUpdate: function() {
      this.visEvents.render();
    },
    focusChanged: function(aFocusedBinding, aFocusedDomain) {
      this.focusedRulePanel.data(
        (aFocusedBinding && ("date" in aFocusedBinding.obj)) ?
          [aFocusedBinding.obj.date] : []);
      this.focusedRulePanel.render();
      this.domLinesPanel.render();
    },
  },
  style: {
    root: [
      "overflow: hidden;"
    ]
  }
});

}); // end require.def
