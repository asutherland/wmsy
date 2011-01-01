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

define(
  [
    "wmsy/wmsy",
    "wmsy/opc/protovis",
    "wmsy/opc/d3",
    "exports",
  ],
  function(
    $wmsy,
    $pv,
    d3,
    exports
  ) {

var wy = exports.wy = new $wmsy.WmsyDomain({id: "bugzilla-vis"});

/**
 * Vertical bug activity timeline that also serves as the scrollbar and provider
 *  of time context by connecting bug events with their location on the
 *  timeline.
 *
 * - The timeline display is currently linear.
 *
 * Protovis vs d3:
 *
 * This has been converted from protovis to d3 while converting things to use
 *  SMIL animations to support simultaneous anmation with the virtual list
 *  widget's scrolling mechanism.  The rationale of framework change is
 *  because it appears protovis development has (at least temporarily) shifted
 *  to d3 and d3 is designed to better support hardware accelerated animation.
 *
 * Since neither d3 or protovis directly support hardware accelerated animation
 *  for SVG, the choice of d3 is made because it has no scene graph other than
 *  the DOM, making it much more straightforward to us to perform the necessary
 *  SVG animation node insertions/replacements.
 *
 * For now we are keeping around protovis since it has Date-aware scales while
 *  d3 does not.
 *
 *
 * Animation/updates in SVG using d3:
 *
 * The thumb slider is animated by creating/updating an "animate" child node on
 *  the thumb.  The new value always is based on the previously existing
 *  value.
 *
 * The strategy for the zebra stripe connectors is basically the same.  The
 *  main difference is that we're dealing with a set instead of a singleton
 *  so we need to be able to map consistently and add/remove as required.
 *  For now we require (and luckily it's already satisfied) that they have
 *  a unique id ("id") for us to establish the mapping.  Although it looks like
 *  we could probably use the transition mechanism to provide some timed
 *  removal for once the animation completes, the likely easiest solution to
 *  our needs is just to instantaneously remove the connectors when we are not
 *  told about them being in the union set of pre/post-animation visible
 *  things.
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
      var TEXT_PADDING = 3;
      var ANIM_DURATION = "0.15s";
      console.log("WIDTH", WIDTH, "HEIGHT", HEIGHT);

      // - root setup
      var scale = this.scale =
        $pv.Scale.linear( // d3.scale.linear(
          this.obj.creationDate,
          events[events.length-1].date)
        .range(0, HEIGHT);

      var vis = d3.select(this.domNode)
        .append("svg:svg")
          .attr("width", WIDTH + MARGIN)
          .attr("height", HEIGHT + 2 * MARGIN)
          // display:block is vital or firefox does some line-related logic that
          //  grows us by 5 pixels.
          .attr("style",
                "display: block; overflow: hidden; padding: 0; margin: 0;")
        // (create root g that is translated to provide upper-margin)
        .append("svg:g")
          .attr("transform", "translate(0," + MARGIN + ")");


      var scrollThumbColor = "hsla(30, 100%, 50%, 0.1)";
      var scrollThumb = vis.append("svg:rect")
        .attr("stroke", scrollThumbColor)
        .attr("fill", scrollThumbColor)
        .attr("x", CONNECTOR_WIDTH)
        .attr("width", TIMELINE_WIDTH)
        // Let's just have it be zero-sized at the top to start with.  It
        //  might be better to defer in the future instead.
        .attr("y", 0)
        .attr("height", 0);
      var thumbAnimY, thumbAnimH, thumbCurY0 = 0, thumbCurH = 0;
      var pendingAnimate = this.pendingAnimate = [];
      function triggerAnim() {
        /*
        var parent = this.parentNode;
        parent.removeChild(this);
        var clone = this; // .cloneNode(true);
        parent.appendChild(clone);
        */
        pendingAnimate.push(this);
      }

      this.updateThumb = function(startTS, endTS) {
        // create the animation node if it does not yet exist
        if (!thumbAnimY) {
          thumbAnimY = scrollThumb.append("svg:animate")
            .attr("attributeName", "y")
            .attr("attributeType", "XML")
            .attr("begin", "indefinite")
            .attr("fill", "freeze")
            .attr("dur", ANIM_DURATION);
          thumbAnimH = scrollThumb.append("svg:animate")
            .attr("attributeName", "height")
            .attr("attributeType", "XML")
            .attr("begin", "indefinite")
            .attr("fill", "freeze")
            .attr("dur", ANIM_DURATION);
        }
        thumbAnimY
          .attr("from", thumbCurY0)
          .attr("to", (thumbCurY0 = scale(startTS)));
        thumbAnimH
          .attr("from", thumbCurH)
          .attr("to", (thumbCurH = (scale(endTS) - thumbCurY0)));
        thumbAnimY.each(triggerAnim);
        thumbAnimH.each(triggerAnim);
      };

      // - timeline axis labels
      var rules = vis.selectAll("g.rule")
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
        .enter("svg:g")
          .attr("class", "rule")
          // need to bump this out to wmsy css management
          .attr("style", "shape-rendering: crispEdges;");


      rules.append("svg:line")
        .attr("y1", scale)
        .attr("y2", scale)
        .attr("x1", CONNECTOR_WIDTH)
        .attr("x2", CONNECTOR_WIDTH + TIMELINE_WIDTH)
        .attr("stroke", "#cccccc");

      rules.append("svg:text")
        .attr("x", CONNECTOR_WIDTH + TIMELINE_WIDTH + TEXT_PADDING)
        .attr("y", scale)
        .attr("dy", "0.35em")
        .attr("text-anchor", "start")
        .attr("font-size", "10")
        .attr("font-weight", "normal")
        .attr("fill", "#888888")
        .text(scale.tickFormat);

      // - focused event axis label
      var focusedColor = "#ffd280";
/*
      var focusedRuleGroup = vis.append("svg:g")
        .attr("class", "focused");

      focusedRuleGroup.append("svg:line")
        .attr("y1", scale)
        .attr("y2", scale)
        .attr("x1", CONNECTOR_WIDTH)
        .attr("x2", CONNECTOR_WIDTH + TIMELINE_WIDTH + SELECTED_EXTRA_WIDTH)
        .attr("stroke", focusedColor)
        .attr("stroke-width", "2");

      focusedRuleGroup.append("svg:text")
        .attr("x",
              CONNECTOR_WIDTH + TIMELINE_WIDTH + SELECTED_EXTRA_WIDTH +
                TEXT_PADDING)
        .attr("y", scale)
        .attr("text-anchor", "start")
        .attr("stroke", focusedColor)
        .text(scale.tickFormat);
*/

      // - event markers
      var userColor = "rgba(128, 128, 128, 0.5)";
      var qaColor = "rgba(128, 0, 0, 0.5)";
      var driverColor = "rgba(0, 128, 0, 0.5)";
      var devColor = "rgba(0, 0, 128, 0.5)";
      function userEventColor(d) {
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
      };
      function userEventLeft(d) {
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
      };
      var visEvents = vis.selectAll("rect.events")
          .data(events)
        .enter("svg:rect")
          .attr("class", "events")
          .attr("fill", userEventColor)
          .attr("x", userEventLeft)
          .attr("y", function(d) { return scale(d.date.valueOf()) - 1;})
          .attr("width", USER_EVENT_WIDTH)
          .attr("height", "1");

      // - connecty curvy zebra stripes
      var evenColor = "#eeeeee";
      var oddColor = "#dddddd";
      // gain access to the basis interpolator
      function stripe_x(d, i) {
        switch (i) {
        case 0:
          return 0;
        case 1:
          return 20;
        case 2:
          return CONNECTOR_WIDTH - 10;
        default:
          return CONNECTOR_WIDTH;
        }
      }
      function stripe_y0_pre(d, i) {
        switch (i) {
        case 0:
        case 1:
          return d.preDomOffset;
        default:
          return scale(d.eventDate) - 1;
        }
      }
      function stripe_y0_post(d, i) {
        switch (i) {
        case 0:
        case 1:
          return d.postDomOffset;
        default:
          return scale(d.eventDate) - 1;
        }
      }
      function stripe_y1_pre(d, i) {
        switch (i) {
        case 0:
        case 1:
          return d.preDomOffset + d.height;
        default:
          return scale(d.eventDate) + 1;
        }
      }
      function stripe_y1_post(d, i) {
        switch (i) {
        case 0:
        case 1:
          return d.postDomOffset + d.height;
        default:
          return scale(d.eventDate) + 1;
        }
      }
      var stripePreArea = d3.svg.area()
        .interpolate("basis")
        .x(stripe_x)
        .y0(stripe_y0_pre)
        .y1(stripe_y1_pre);
      var stripePostArea = d3.svg.area()
        .interpolate("basis")
        .x(stripe_x)
        .y0(stripe_y0_post)
        .y1(stripe_y1_post);
      function areaPreMaker(mod) {
        return stripePreArea([mod, mod, mod, mod]);
      }
      function areaPostMaker(mod) {
        return stripePostArea([mod, mod, mod, mod]);
      }
      // (stripes are entirely dynamic, so nothing to do right now...)
      this.updateStripes = function(stripeMods) {
        var stripes = vis.selectAll("path.stripes")
            .data(stripeMods, "id");

        // - new
        var newPaths = stripes.enter("svg:path")
            .attr("class", "stripes")
            .attr("id", function(d) { return d.id; })
            .attr("fill", function (d) {
                    if (d.focused)
                      return focusedColor;
                    if (d.id % 2)
                      return oddColor;
                    return evenColor;
                  })
            .attr("d", areaPreMaker);
        newPaths.append("svg:animate")
          .attr("attributeName", "d")
          //.attr("attributeType", "XML")
          .attr("fill", "freeze")
          .attr("begin", "indefinite")
          .attr("calcMode", "spline")
          .attr("keySplines", "0 0 0.58 1.0")
          //.attr("repeatCount", "indefinite")
          .attr("dur", ANIM_DURATION)
          .attr("values", function(d) {
                  return areaPreMaker(d) + ";  " + areaPostMaker(d);
                })
          .each(triggerAnim);

        // - existing
        stripes.each(function(mod) {
          var animKid = this.firstChild;
          // node is our svg:path
          animKid.setAttribute("values",
                               areaPreMaker(mod) + ";" + areaPostMaker(mod));
          pendingAnimate.push(animKid);
        });

        // - gone
        stripes.exit().remove();
      };

      // protovis seems to be clobbering us to be an inline-block?
      //this.domNode.setAttribute("style", "");
      //this.domNode.children[0].setAttribute("style",
      //  "-moz-box-flex: 1; -webkit-box-flex: 1; box-flex: 1; display: block;");

      pendingAnimate.splice(0);
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
        rootCompensate = containerBounds.top + aDelta + MARGIN;
        halfHeight = rootNode.clientHeight / 2;

        var lastEvents = aBindings[aBindings.length - 1].obj.events;
        thumbSpan = [
          aBindings[0].obj.events[0].date.valueOf(),
          0,
          lastEvents[lastEvents.length - 1].date.valueOf(),
        ];
      }
      // - zebra (with thumb updates)
      var stripeMods = [];
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

          stripeMods.push({
            id: event.id,
            preDomOffset: domOffset + aDelta,
            postDomOffset: domOffset,
            height: domHeight,
            eventDate: event.date,
            focused: eventBinding.focused,
          });

          domOffsetsToTime.push([domOffset, domHeight, event, eventBinding]);
        }
      }

      this.updateThumb(thumbSpan[0], thumbSpan[2]);
      this.updateStripes(stripeMods);
      this.domNode.firstChild.pauseAnimations();
      var pendingAnimate = this.pendingAnimate;
      for (var i = 0; i < pendingAnimate.length; i++) {
        pendingAnimate[i].beginElement();
      }
      pendingAnimate.splice(0);
      this.domNode.firstChild.unpauseAnimations();
    },
    visNeedsUpdate: function() {
    },
    focusChanged: function(aFocusedBinding, aFocusedDomain) {
/*
      this.focusedRulePanel.data(
        (aFocusedBinding && ("date" in aFocusedBinding.obj)) ?
          [aFocusedBinding.obj.date] : []);
      this.focusedRulePanel.render();
      this.domLinesPanel.render();
*/
    },
  },
  style: {
    root: [
      "overflow: hidden;",
      "padding: 0;",
      "margin: 0;",
    ]
  }
});

}); // end define
