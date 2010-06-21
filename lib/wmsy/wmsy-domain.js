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
* Portions created by the Initial Developer are Copyright (C) 2009 the Initial
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

var DecisionSpace = require("wmsy/decision-space").DecisionSpace;

var syntax = require("wmsy/wmsy-syntax");
var WmsyStructMarker = syntax.WmsyStructMarker,
    WmsyObjDecorator = syntax.WmsyObjDecorator,
    WmsyFocusMarker = syntax.WmsyFocusMarker;

var FocusManager = require("wmsy/wmsy-focus").FocusManager;

var WidgetProtoFab = require("wmsy/wmsy-protofab").WidgetProtoFab;

/**
 * Clone an object by tricking JSON into doing it for us.  This only works if
 *  everyone is a primitive.
 */
function deepSimpleClone(aObj) {
  return JSON.parse(JSON.stringify(aObj));
}

function WmsyDomain(aName, aLibDomain, aGlobalCssClassToStructInfo) {
  this.name = aName;
  this.dtree = new DecisionSpace();
  this.WILD = this.dtree.WILD;
  this.PARAM = this.dtree.WILD2;

  this._libDomain = aLibDomain;

  this.cssClassToStructInfo = {};
  this.globalCssClassToStructInfo = aGlobalCssClassToStructInfo;
}
WmsyDomain.prototype = {
  /**
   * We need a toString so that we can be used as a parameter by library
   *  widgets.
   */
  toString: function() {
    return this.name;
  },

  /**
   * Process the 'structure' definition of a widget, building up a per
   *  observed key meta-info object that will be stored on the prototype.
   *
   * @return The structure map whose keys are all the keys observed in
   *     traversing the 'structure' definition and its sub-objects.  The values
   *     are objects with the following attributes:
   * - path: A list whose values are the numeric offset from the 'current' node
   *     at each level, starting with the widget's domNode at the root.  The
   *     goal is to be able to locate the DOM node for each thing without having
   *     to have a per-instance reference or use potentially more expensive
   *     CSS selector-style queries.
   * - cssClassName: The unique-ified class name to use for the DOM node.
   * - textContent: The static text contents of the DOM node, if any.
   * - elementType: either "div" or "span"
   */
  _structureChew: function(aStructDef, aProtoFab, aWidgetDef, aStructExtra) {
    var smap = {};
    this.__structureChewNode(smap, "root", aStructDef, [], aProtoFab,
                             aWidgetDef, aStructExtra);
    return smap;
  },
  /**
   * |_structureChewNode| recursive helper; processes each node seen.
   *
   * @param aSMap The structure map being populated.  This is a flattened
   *     meta-info structure derived from walking the hierarchy.  This is the
   *     value that |_structureChew| returns.
   * @param aKey The key that names this node.
   * @param aValue The value that goes with the key.
   * @param {Array} aPath The numeric offset path to get to the provided value.
   * @param {WidgetProtoFab} aProtoFab The proto fab for this widget.
   * @param aWidgetDef The root widget definition; currently used for subwidget
   *     support.
   * @param [aStructMapExtra] Extra meta-data to mix-in to the structure map
   *     definition.  Speculatively introduced to support the virtual container
   *     lib widget.
   * @param [aParentMeta] The structure map meta-data for our parent in the
   *     nested structure hierarchy.
   */
  __structureChewNode: function(aSMap, aKey, aValue, aPath, aProtoFab,
                                aWidgetDef, aStructMapExtra, aParentMeta) {
    var kdata = aSMap[aKey] = {listy: false};
    kdata.name = aKey;
    kdata.path = aPath;
    kdata.cssClassName = aProtoFab.proto.cssClassBaseName + aKey;
    kdata.textContent = null;
    kdata.elementType = null;
    var softElementType = "div";

    aProtoFab.addElement(aKey, kdata.path);

    // Localizable string.
    if (typeof(aValue) == "string") {
      kdata.elementType = "span";
      kdata.children = null;
      kdata.textContent = aValue;
    }
    // helper tagged things
    else if (aValue instanceof WmsyStructMarker) {
      if (aValue.kind == "widget") {
        aProtoFab.addWidget(aKey, aValue.args, aValue.bindAttr, this);
      }
      // Subwidget constraints are expected to be limited so we just clone the
      //  widget's constraint and clobber-set everything we find in the
      //  subwidget's additional constraints.  (A full solution would be to
      //  perform fusion of nested objects as well.)
      else if (aValue.kind == "subwidget") {
        var constraint = deepSimpleClone(aWidgetDef.constraint);
        var valArgs = aValue.args;
        for (var cKey in valArgs) {
          constraint[cKey] = valArgs[cKey];
        }

        aProtoFab.addWidget(aKey, constraint, null, this);
      }
      else if (aValue.kind == "libwidget") {
        var libConstraint = deepSimpleClone(aValue.args);
        // tell the widget about our domain
        libConstraint.domain = this;
        // and bind the widget inside the lib domain
        aProtoFab.addWidget(aKey, libConstraint, aValue.bindAttr,
                            this._libDomain);
      }
      else if (aValue.kind == "widgetflow" ||
               aValue.kind == "widgetlist") {
        kdata.listy = true;
        kdata.listVertical = aValue.opts.vertical;

        if (aValue.kind == "widgetflow")
          kdata.elementType = kdata.subElementType = "span";
        else
          kdata.elementType = kdata.subElementType = "div";

        var idAttr = "id";
        if ("id" in aValue.opts)
          idAttr = aValue.opts.id;

        var separator = ("separator" in aValue.opts) ?
                          aValue.opts.separator : null;
        aProtoFab.addWidget(aKey, aValue.args, aValue.bindAttr, this, true);
        aProtoFab.addWidgetList(aKey, aValue.args, separator,
                                kdata.subElementType, idAttr);
      }
      else if (aValue.kind == "bind") {
        kdata.elementType = "span";
        aProtoFab.addBinding(aKey, aValue.bindAttr, aValue.args);
      }
      else if (aValue.kind == "bindImage") {
        kdata.elementType = "img";
        aProtoFab.addBinding(aKey, null, aValue.args);
      }

    }
    // sub-object, possibly decorated; may be richer localizable string in the
    //  future too.
    else {
      // If it's a decorator, set things up then pierce the decorator.
      if (aValue instanceof WmsyObjDecorator) {
        if (aValue.kind == "flow") {
          softElementType = "div";
          kdata.subElementType = "span";
          aProtoFab.addBinding(aKey, null, aValue.attrs);
        }
        else if (aValue.kind == "block") {
          // (kind semantics are unchanged from defaults)
          aProtoFab.addBinding(aKey, null, aValue.attrs);
        }
        else {
          throw new Exception("Unsupported WmsyObjDecorator kind: " +
                              aValue.kind);
        }
        // escape the decorator
        aValue = aValue.obj;
      }

      kdata.children = [];

      var iNodeThisLevel = 0;
      for (var subKey in aValue) {
        var subValue = aValue[subKey];
        var kidPath = aPath.concat();
        kidPath.push(iNodeThisLevel);
        kdata.children.push(this.__structureChewNode(aSMap, subKey, subValue,
                                                     kidPath, aProtoFab,
                                                     aWidgetDef, kdata));
        iNodeThisLevel++;
      }
    }

    // default the elementType if something above did not set it explicitly
    if (!kdata.elementType) {
      if (aParentMeta && ("subElementType" in aParentMeta))
        kdata.elementType = aParentMeta.subElementType;
      else
        kdata.elementType = softElementType;
    }

    // mix-in any extra data.
    if (aStructMapExtra && (aKey in aStructMapExtra)) {
      var structExtra = aStructMapExtra[aKey];
      for (var extraKey in structExtra) {
        if (structExtra[extraKey] == this.SELF)
          kdata[extraKey] = kdata;
        else
          kdata[extraKey] = structExtra[extraKey];
      }
    }

    return kdata;
  },

  /**
   * Pending CSS standard transform helpers.
   */
  __pendingStandardTransforms: [
    [/display *: *box;/,
     "display: -moz-box; display: -webkit-box; display: box;"],
    [/box-(.+) *: *(.+);/g,
     "-moz-box-$1: $2; -webkit-box-$1: $2; box-$1: $2;"],
  ],

  __whitespaceCleanupRE: /\n */g,
  __styleChewLevel: function(aCssStrings, aStyleLevelDef,
                             aActiveSelector, aCssClassBaseName) {
    for (var key in aStyleLevelDef) {
      var value = aStyleLevelDef[key];

      // lists of strings
      if (typeof(value) == "object" && "length" in value)
        value = value.join("\n");

      // _ means this thing applies to the parent without any extra context
      if (key == "_") {
        aCssStrings.push(aActiveSelector + " {\n" +
                         value.replace(this.__whitespaceCleanupRE, "\n  ") +
                         "}\n");
      }
      else {
        if (key == ":focused")
          key = '[wmsy-focused]';
        else if (key == ":focused-active")
          key = '[wmsy-focused-active]';
        else if (key == ":focused-inactive")
          key = '[wmsy-focused-inactive]';

        var nextSelector = aActiveSelector;
        if (key[0] == ":" || key[0] == "[")
          nextSelector += key;
        else
          nextSelector += (nextSelector ? " ." : ".") + aCssClassBaseName + key;

        if (typeof(value) == "string") {
          // normalize certain pending standards...
          var pendingStandards = this.__pendingStandardTransforms;
          for (var iStd = 0; iStd < pendingStandards.length; iStd++) {
            value = value.replace(pendingStandards[iStd][0],
                                  pendingStandards[iStd][1]);
          }
          aCssStrings.push(nextSelector + " {\n  " +
                           value.trim().replace(this.__whitespaceCleanupRE,
                                                "\n  ") +
                           "\n}\n");
        }
        else {
          this.__styleChewLevel(aCssStrings, value, nextSelector,
                                aCssClassBaseName);
        }
      }
    }
  },

  /**
   * Process the 'style' definition of a widget.
   *
   * @return A CSS string containing all of our compiled styles.
   */
  _styleChew: function(aStyleDef, aCssClassBaseName) {
    var cssStrings = [];
    if (aStyleDef)
      this.__styleChewLevel(cssStrings, aStyleDef, "", aCssClassBaseName);
    return cssStrings;
  },

  /**
   * Process event definitions, filing the event handling functions away on the
   *  structure data for the element in the structure map.  The event handlers
   *  never get put on the prototype, although they are always invoked with the
   *  'this' context of the binding.  I'm not sure there is a deep reason for
   *  why we do this, but it is nice to avoid cluttering up the prototype and
   *  discouraging hacks that directly invoke other handlers (or shortcut
   *  testing).
   */
  _eventsChew: function(aEventsDef, aStructMap) {
    for (var nodeName in aEventsDef) {
      var handlers = aEventsDef[nodeName];
      if (!(nodeName in aStructMap))
        throw new Error("Unknown structure node: " + nodeName +
                        " to bind event to!");

      var structMeta = aStructMap[nodeName];
      for (var eventName in handlers) {
        var eventHandler = handlers[eventName];
        if (eventName == "command")
          eventName = "click";
        structMeta["on_" + eventName] = eventHandler;
      }
    }
  },

  /**
   * Process one or more popup definitions, creating a popup_NAME method on the
   *  prototype for each popup.  The definition must include a constraint and
   *  may also include some additional option flags.  The popup_NAME method will
   *  take the object
   */
  _popupsChew: function(aPopupDefs, aProtoFab) {
    for (var popupName in aPopupDefs) {
      var popupDef = aPopupDefs[popupName];
      if (!("constraint" in popupDef))
        throw new Error("Popup " + popupName + " needs a constraint!");

      aProtoFab.addPopup(popupName, popupDef.constraint, popupDef.position,
                         ("clickAway" in popupDef) ? popupDef.clickAway : false);
    }
  },

  /**
   * Process the emit/receive/relay definitions.
   *
   * The runtime impact of an emit block is that _boundInit logic is generated
   *  that populates data structures and if emit/receive, walks up the DOM tree
   *  looking for bindings that satisfy our needs or relay our needs.
   */
  _rendezvousChew: function(aEmitDef, aReceiveDef, aRelayDef, aProtoFab) {
    var i, receiveNames = [];
    if (aEmitDef) {
      for (i = 0; i < aEmitDef.length; i++) {
        var emitName = aEmitDef[i];
        aProtoFab.addEmitter(emitName);
      }
    }

    if (aReceiveDef) {
      for (var receiveName in aReceiveDef) {
        var receiveFunc = aReceiveDef[receiveName];
        receiveNames.push(receiveName);
        aProtoFab.addReceiver(receiveName, receiveFunc);
      }
    }

    // relays are totally handled below...

    aProtoFab.makeRendezvousLogic(aRelayDef, aEmitDef, receiveNames);
  },

  /**
   *
   */
  _focusChew: function(aFocusDef, aStructMap, aProtoFab) {
    if (!(aFocusDef instanceof WmsyFocusMarker))
      throw new Error("Illegal 'focus' value: " + aFocusDef);

    // -- item
    if (aFocusDef.kind == "item") {
      aProtoFab.makeFocusable();
      return;
    }
    // (nested items are focusable containers)
    if (aFocusDef.kind == "nestedItem")
      aProtoFab.makeFocusable();

    if (aFocusDef.kind == "domain")
      aProtoFab.makeFocusDomain();

    // -- container
    if (!aFocusDef.kidNames || !aFocusDef.kidNames.length)
      throw new Error("You need to list the container's focusable children " +
                      "in their focus order.");

    // - update each struct map to have the prev/next linkage for focus stuff...
    var kidNames = aFocusDef.kidNames, kidStruct;
    var lastStruct = null;
    var rootStruct = aStructMap.root;
    rootStruct.navVertical = aFocusDef.vertical;
    for (var i = 0; i < kidNames.length; i++) {
      kidStruct = aStructMap[kidNames[i]];
      if (i == 0)
        rootStruct.firstFocusable = kidStruct;
      else
        lastStruct.nextFocusable = kidStruct;
      kidStruct.navVertical = aFocusDef.vertical;
      kidStruct.prevFocusable = lastStruct;

      lastStruct = kidStruct;
    }
    kidStruct.nextFocusable = null;
    rootStruct.lastFocusable = lastStruct;

    if (aFocusDef.kind == "nestedItem") {
      rootStruct.nextFocusable = rootStruct.firstFocusable;
      rootStruct.nextFocusable.prevFocusable = rootStruct;
      rootStruct.firstFocusable = rootStruct;
    }

    aProtoFab.makeFocusContainer();
  },

  /**
   * The process of compiling a widget goes like this:
   * - Traverse the provided structure, building up a document fragment and
   *    retrieval offset information.
   * -
   *
   * @param aOrigin Who is defining this widget?
   * @param aWidgetDef The widget definition
   */
  defineWidget: function(aOrigin, aWidgetDef) {
    // -- constraint
    // - sanity check constraint
    if (!("constraint" in aWidgetDef) || !aWidgetDef.constraint) {
      throw new Error("You need to provide a constraint for '" +
                      aWidgetDef.name + "'!");
    }
    var anyConstraints = false;
    for (var ckey in aWidgetDef.constraint) {
      anyConstraints = true;
      break;
    }
    if (!anyConstraints)
      throw new Error("You need to provide a constraint for '" +
                      aWidgetDef.name + "'!");

    // -- name
    // it is very important there be no spaces in the widget name.
    aWidgetDef.name = aWidgetDef.name.replace(" ", "_", "g")
                                     .replace(":", "_", "g");
console.log("WIDGET DEF: " + aWidgetDef.name);

    var protoFab = new WidgetProtoFab(this, aOrigin, aWidgetDef);
    // -- impl
    if ("impl" in aWidgetDef)
      protoFab.contribute(aWidgetDef.impl);

    // -- structure
    var structureMap = this._structureChew(
      aWidgetDef.structure, protoFab, aWidgetDef,
      ("_structureMapExtra" in aWidgetDef) ? aWidgetDef._structureMapExtra
                                           : null
    );
    protoFab.proto._structMap = structureMap;
    protoFab.proto._rootCssClassName = structureMap.root.cssClassName;
    protoFab.proto._rootElementType = structureMap.root.elementType;
    protoFab.proto._rootTextContent = structureMap.root.textContent;

    var cssClassToStructInfo = protoFab.proto._cssClassToStructInfo = {};
    var domainCssClassToStructInfo = this.cssClassToStructInfo;
    var globalCssClassToStructInfo = this.globalCssClassToStructInfo;

    for (var key in structureMap) {
      var meta = structureMap[key];
      cssClassToStructInfo[meta.cssClassName] = meta;
      domainCssClassToStructInfo[meta.cssClassName] = meta;
      globalCssClassToStructInfo[meta.cssClassName] = meta;
    }

    // -- style
    var cssBlocks = this._styleChew(aWidgetDef.style,
                                    protoFab.proto.cssClassBaseName);
    protoFab.proto._flattenedCssString = cssBlocks.join("\n");


    // -- events
    if ("events" in aWidgetDef)
      this._eventsChew(aWidgetDef.events, structureMap);

    // -- rendezvous
    if (("emit" in aWidgetDef) || ("receive" in aWidgetDef) ||
        ("relay" in aWidgetDef)) {
      this._rendezvousChew(
        ("emit" in aWidgetDef) ? aWidgetDef.emit : null,
        ("receive" in aWidgetDef) ? aWidgetDef.receive : null,
        ("relay" in aWidgetDef) ? aWidgetDef.relay : null,
        protoFab
      );
    }

    // -- focus
    if ("focus" in aWidgetDef)
      this._focusChew(aWidgetDef.focus, structureMap, protoFab);

    // -- popups
    if ("popups" in aWidgetDef)
      this._popupsChew(aWidgetDef.popups, protoFab);

    var widgetFactory = protoFab.makeFactory();
    this.dtree.addPossibility(aWidgetDef.constraint, widgetFactory);

    this.dtree.build();
console.log("  END WIDGET DEF: " + aWidgetDef.name);
  },

  undefineWidget: function(aWidgetDef) {

    this.dtree.removePossibility(aWidgetDef);
console.log("REMOVED WIDGET, REBUILDING");
    this.dtree.build();
console.log("  REBUILT");
  },

  /**
   * Find a widget appropriate to the constraint (with object if applicable) and
   *  append the widget to the dom element.
   *
   * @param aConstraintWithObj The constraint which should include the object
   *     being bound (in the common case where there is an object being bound.)
   * @param aDomElem The DOM element to append the widget binding to.
   *
   * @return the widget binding.
   */
  emit: function(aConstraintWithObj, aDomElem) {
    // make sure the document has been initialized for wmsy!
    var doc = aDomElem.ownerDocument;
    if (!("wmsyInsertedClasses" in doc)) {
      doc.wmsyInsertedClasses = {};
      doc.wmsyFocusManager =
        new FocusManager(this.globalCssClassToStructInfo);
    }

    var widgetFab = this.dtree.evaluate(aConstraintWithObj);
    var binding = widgetFab.appendChild(aConstraintWithObj, aDomElem);

    return binding;
  },

  /**
   * Just hard-code a list of supported events right now, though we should
   *  perhaps just add listeners as needed? XXX
   */
  SUPPORTED_EVENTS: ["click", "DOMMouseScroll", "mousewheel",
                     "mousedown", "mousemove", "mouseup"],
  /**
   * Hookup event handling for the given root element.
   */
  bindEventsOnRoot: function(aRootElem) {
    var dis = this;
    var handler = function(aEvent) {
                    return dis._handleEvent(aEvent);
                  };

    for (var i = 0; i < this.SUPPORTED_EVENTS.length; i++) {
      aRootElem.addEventListener(this.SUPPORTED_EVENTS[i], handler, false);
    }

    var keyNavHandler = function(aEvent) {
      return dis._handleKeyNavigationEvent(aEvent);
    };

    aRootElem.addEventListener("keydown", keyNavHandler, false);
    //aRootElem.addEventListener("keyup", keyNavHandler, false);
  },

  BS_EVENT_TRANSFORMS: {
    DOMMouseScroll: function khaaaaaaaaan(aEvent) {
      return {
        type: "mousewheel",
        wheelDelta: aEvent.detail * -40,
        target: aEvent.target
      };
    },
  },

  /**
   * Handle
   */
  _handleKeyNavigationEvent: function(aEvent) {
console.log("KEY EVENT!", aEvent.keyCode);
    if (aEvent.keycode < 37 || aEvent.keyCode > 40)
      return true;

    var focusManager = aEvent.target.ownerDocument.wmsyFocusManager;

    // -- UP
    if (aEvent.keyCode == 38) {
      focusManager.navigate(true, -1);
    }
    // -- DOWN
    else if (aEvent.keyCode == 40) {
      focusManager.navigate(true, 1);
    }
    // -- LEFT
    else if (aEvent.keyCode == 37) {
      focusManager.navigate(false, -1);
    }
    // -- RIGHT
    else if (aEvent.keyCode == 39) {
      focusManager.navigate(false, 1);
    }

    aEvent.preventDefault();
    return false;
  },

  /**
   * Event handling based on bubbling.
   *
   * Our general dispatch looks like this:
   *
   * - Look at the actual target of the event.  Walk up the parent hierarchy
   *   until we find a node with one of our CSS class names, possibly the event
   *   target itself.
   * - Check whether our meta-info for that element indicates event handling
   *   logic.  If not, keep walking until we find something that cares.
   */
  _handleEvent: function(aEvent) {
    var i;
    if (aEvent.type in this.BS_EVENT_TRANSFORMS)
      aEvent = this.BS_EVENT_TRANSFORMS[aEvent.type](aEvent);

    var handler_name = "on_" + aEvent.type;
    // find and latch the most specific binding...
    var targetBinding = null;
    for (var curNode = aEvent.target; curNode && (!("wmsyTop" in curNode));
           curNode = curNode.parentNode) {
      // skip nodes without a class attribute; text nodes can't, some don't
      if ((curNode.nodeType == 3) || !curNode.hasAttribute("class"))
        continue;
      var cssClassNames = curNode.getAttribute("class").split(" ");
      // (the most specific css class name is first)
      for (var iClass = 0; iClass < cssClassNames.length; iClass++) {
        var cssClassName = cssClassNames[iClass];
        // map to structinfo by css name
        var structInfo;
        if (!(cssClassName in this.globalCssClassToStructInfo))
          continue;
        structInfo = this.globalCssClassToStructInfo[cssClassName];

        // if we have not yet latched the target binding, figure it out now
        if (!targetBinding) {
          targetBinding = curNode;
          // (walk up to the binding root)
          for (i=structInfo.path.length; i > 0; i--)
            targetBinding = targetBinding.parentNode;
          targetBinding = targetBinding.binding;
        }

        // keep looking if it has no handler
        if (!(handler_name in structInfo))
          continue;

        // figure out the binding it belongs to so we can give it the right this
        var bindingRootNode = curNode;
        for (i=structInfo.path.length; i > 0; i--)
          bindingRootNode = bindingRootNode.parentNode;

        structInfo[handler_name].call(bindingRootNode.binding, targetBinding,
                                      aEvent);
        return;
      }
    }
  },
};
exports.RawWmsyDomain = WmsyDomain;