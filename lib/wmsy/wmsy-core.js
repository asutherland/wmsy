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

/**
 * A simple meta-data holding class used by the various sugaring helper
 *  functions on WmsyExportDomain.
 *
 * @param aKind A string tag.
 * @param aArgs Usually an object dictionary that names constraints or maps
 *     multiple attribute bindings.
 * @param aBindAttr Usually a string naming an attribute for some kind of
 *     binding.
 * @param aOpts Usually an option dictionary.
 */
function WmsyStructMarker(aKind, aArgs, aBindAttr, aOpts) {
  this.kind = aKind;
  this.args = aArgs;
  this.bindAttr = aBindAttr;
  this.opts = aOpts;
}
WmsyStructMarker.prototype = {
};

/**
 * Simple meta-data decorating class; currently just used to mark objects as
 *  "flow" (= span) rather than the default (= div) objects.
 */
function WmsyObjDecorator(aKind, aObj) {
  this.kind = aKind;
  this.obj = aObj;
}
WmsyObjDecorator.prototype = {
};

/**
 * An artifact from our jetpack heritage; each jetpack was supposed to get one
 *  of these so that we could unload its contributions when the time came.
 *  Still useful.
 */
function WmsyExportDomain(aContext) {
  if ("domain" in aContext)
    this.useDomain(aContext.domain);
  else
    this.useDomain("default");
  this.name = aContext.id;

  this.widgetDefinitions = [];

  // jetpack unloading semantics went here
}
WmsyExportDomain.prototype = {
  SELF: null,
  NONE: undefined,

  useDomain: function(aName) {
    this.domain = TbWmsy.getDomain(aName);
    this.WILD = this.domain.WILD;
    this.PARAM = this.domain.PARAM;
  },

  /**
   * @name Widget Definition
   */
  //@{

  /**
   * @param aDef.name
   * @param aDef.doc
   * @param aDef.constraint
   * @param aDef.structure
   * @param aDef.style
   * @param aDef.constructor
   * @param aDef.impl
   * @param aDef.handle
   * @param aDef.events
   */
  defineWidget: function(aDef) {
    this.domain.defineWidget(this, aDef);
    this.widgetDefinitions.push(aDef);
  },

  /**
   * @param aParentName
   * @see |defineWidget|
   */
  subclassWidget: function(aParentName, aDef) {

  },
  //@}

  /**
   * @name Widget Definition Helpers
   */
  //@{

  /**
   * Mark that the contents
   */
  flow: function(aFlowObjs) {
    return new WmsyObjDecorator("flow", aFlowObjs);
  },

  /**
   * Bind a widget to a div tag.
   *
   * @param aPartialConstraint The guaranteed constraints on what will be
   *     provided to this widget.
   */
  widget: function(aPartialConstraint, aBindAttr) {
    return new WmsyStructMarker("widget", aPartialConstraint, aBindAttr);
  },

  /**
   * Bind a sub-widget to a div tag.
   *
   * A sub-widget is focused on displaying only a portion of an object but it
   *  is still bound to the object as a whole.  For example, a widget to show
   *  whether a message is starred and allow the state to be toggled would
   *  only show the star, but its "obj" attribute would be the entire message.
   */
  subWidget: function(aAdditionalConstraints) {
    return new WmsyStructMarker("subwidget", aAdditionalConstraints);
  },

  /**
   * Bind a library widget to a div tag.
   */
  libWidget: function(aPartialConstraint, aBindAttr) {
    return new WmsyStructMarker("libwidget", aPartialConstraint, aBindAttr);
  },

  /**
   * Defines a point where multiple widgets are inserted where everyone is a div.
   */
  widgetList: function(aPartialConstraint, aBindAttr, aOpts) {
    return new WmsyStructMarker("widgetlist", aPartialConstraint, aBindAttr,
                                aOpts);
  },

  /**
   * Defines a point where multiple widgets are inserted where everyone is a
   *  span.
   */
  widgetFlow: function(aPartialConstraint, aBindAttr, aOpts) {
    return new WmsyStructMarker("widgetflow", aPartialConstraint, aBindAttr,
                                aOpts);
  },

  /**
   * Bind a span tag for text content purposes and/or HTML attribute purposes.
   */
  bind: function(aTextAttrName, aDOMAttrBindings) {
    return new WmsyStructMarker("bind", aDOMAttrBindings, aTextAttrName);
  },

  bindImage: function(aTextAttrName, aDOMAttrBindings) {
    if (!aDOMAttrBindings)
      aDOMAttrBindings = {};
    aDOMAttrBindings["src"] = aTextAttrName;
    return new WmsyStructMarker("bindImage", aDOMAttrBindings);
  },

  /**
   * Pull something, probably an attribute name, out of the run-time constraint
   * dictionary.  This is our mechanism to allow parameterization of widgets
   * in a way that allows widgets to be overridden by specialized widgets.
   *
   * For example, you might want to use the same collection display widget for
   * the 'to' and 'cc' recipients off the bat.  By passing the attribute name
   * through the constraint, a single widget can serve both purposes, but
   * someone can also later define a new widget that explicitly handles the
   * 'cc' case.
   *
   * @param aKeyName The name of the attribute in the constraint basis whose
   *     value we should extract.
   * @param [aProcFunc] An optional function to process the attribute name.
   *     If this function is omitted, we simply lookup the attribute name on the
   *     object.  If provided, the function is invoked with the attribute name
   *     as the first argument and the object as the second argument.  The
   *     function should return whatever it wants to be treated as the value of
   *     the binding.
   */
  fromConstraint: function(aKeyName, aProcFunc) {
    return new WmsyStructMarker("fromConstraint", aProcFunc, aKeyName);
  },
  //@}

  cssFuse: function(aBaseCSS, aExtraCSS) {
    var clone = deepSimpleClone(aBaseCSS);
    for (var key in aExtraCSS) {
      if (key in clone) {
        clone[key] = clone[key].concat(aExtraCSS[key]);
      }
      else {
        clone[key] = aExtraCSS[key];
      }
    }
    return clone;
  },

  focus: {
    container: {
      horizontal: 0,
      vertical: 1
    }
  },

  /**
   * @name Widget Instantiation
   */
  //@{
  wrapElement: function(aDomElem) {
    aDomElem.wmsyTop = true;
    return new WmsyWrappedElement(this.domain, aDomElem);
  },
  //@}
};
exports.WmsyDomain = WmsyExportDomain;


/**
 * Wrapped DOM node exposed to a jetpack sandbox for convenient widget creation.
 * This should likely be secured by a change to a lexically constructed object so
 *  that internals aren't accessible.
 */
function WmsyWrappedElement(aDomain, aDomElem) {
  this.domain = aDomain;
  this.domElem = aDomElem;

  this.domain.bindEventsOnRoot(this.domElem);
}
WmsyWrappedElement.prototype = {
  emit: function(aConstraintWithObj) {
    return this.domain.emit(aConstraintWithObj, this.domElem);
  },

  remove: function(aBinding) {
    aBinding.destroy();
    var domNode = aBinding.domNode;
    domNode.parentNode.removeChild(domNode);
  },
};

var WidgetProto_WidgetBase_DOC = {
  /**
   * A getter that returns the element for the widget.
   */
  $_element: null,

  /**
   * The decision tree Partial for this subwidget.
   */
  $_partial: null,
};

var WidgetProto_Widget_DOC = {
  /**
   * Set/change the object that is being displayed at the given widget point.
   *  This will fast-path out if it turns out the object you are setting is
   *  already what the widget is bound to.  If you want to update the
   *  representation of that object then you should call |update| on the
   *  binding, not call us.
   */
  $_set: function(aVal) {
  },
};

var WidgetProto_WidgetList_DOC = {
  __proto__: WidgetProto_WidgetBase_DOC,

  /**
   * Map from item ids to the widget bound to them.  Specifically, each
   *  value is a widget instance with a 'domNode', an 'obj', and all the
   *  trappings.
   */
  $_itemMap: null,

  /**
   * Render the provided items, adding them to the list of displayed items.
   */
  $_addAll: function(aItems) {
  },
  /**
   * Updates the provided sub-set of already rendered items.
   */
  $_updateAll: function(aItems) {
  },
  /**
   * Destroy the widgets corresponding to the given items and remove the items.
   * If you want to just clear out everything, use |$_clear|.
   */
  $_removeAll: function(aItems) {
  },
  /**
   * Clears out all widgets in the list.
   */
  $_clear: function() {
  },
};

/**
 * Document what you expect to see on a per-widget prototype (things that vary
 *  per-widget, as opposed to things that are on all widgets and can be found
 *  on the real |WidgetBaseProto| and its documentation.)
 */
var WidgetProto_DOC = {
  /**
   * The string we prefix to the class names we use on the widget DOM nodes.
   *  We also prefix the CSS rules we generate (or things wouldn't work).
   * This will be of the form "DOMAIN-CONTEXT-NAME-" where domain is the
   *  |WmsyDomain|'s name, context identifies the jetpack, and name is the
   *  jetpack's name for the widget.
   */
  cssClassBaseName: "",

  /**
   * The CSS class name of the root node.  Stashed here because the root is not
   *  part of the document fragment.
   */
  _rootCssClassName: "",
  /**
   * The element type of the root node.  Stashed here because the root is not
   *  part of the document fragment.
   */
  _rootElementType: "",

  /**
   * The string representation of the CSS for the widget.  This gets inserted
   *  into the document by the |WidgetFactory|.
   */
  _flattenedCssString: "",

  /**
   * Provides meta-information about every key seen in the 'structure' widget
   *  definition.
   */
  _structMap: {},

  /**
   * Maps CSS class names back to the structured map info they come from.  This
   *  is used in event handling.
   */
  _cssClassToStructInfo: {},

  /**
   * A list of updater functions to invoke when updating this widget.  Each
   *  bound widget puts something in here.  |_update| calls these with the
   *  proper 'this' context when invoked.  It's regrettable that we have to
   *  resort to this but without better code generation capabilities than eval
   *  this is where we find ourselves.  Hope it JITs!
   */
  _updaters: [],

  /**
   * The WidgetFactory instance associated with this widget type.  This exists
   *  to allow us to detect recursive binding attempts right now.  (In theory,
   *  fromConstraint could allow intentional, harmless, bounded self-recursion,
   *  but that would be a bad idea anyways.)
   */
  __factory__: null,

  /**
   * Update the widget to reflect changes to the underlying object.
   *
   * If the widget implementation does not define an 'update' method, this will
   *  just be an alias to the |_update| automatically created method.  If the
   *  widget implementation does define this method, it should call the
   *  |_update| method before it returns.
   *
   * @param [aRecursive=false] Should all nested widgets be updated as well?
   *     Sub-widgets are always automatically updated.
   */
  update: function(aRecursive) {
  }
};

/**
 * Documents what you expect to see on a widget instance.  This is ideally
 *  practically nothing.
 */
var WidgetInstance_DOC = {
  /**
   * The root dom node that represents us.
   */
  domNode: null,

  /**
   * The JS object we are bound to and visualizing.
   */
  obj: null,
};

/**
 * Root prototype for all widgets.  We are the part of all per-widget-definition
 *  prototypes.  Said prototypes are created by |WidgetProtoFab| instances and
 *  will conform to |WidgetProto_DOC|'s documentation.  They will in turn be
 *  referenced by the actual widget instances which will conform to
 *  |WidgetInstance_DOC|'s documentation.
 */
var WidgetBaseProto = {
  /**
   * Document fragment representing the pre-built state of the DOM.  This gets
   *  created on demand (we need a document to create a document fragment) and
   *  is set on the widget prototype rather than the instance or this singleton
   *  proto.
   * This does not include the root node, just its children.  The reason for
   *  this is that we might end up binding onto an already existing root node.
   */
  _fragment: null,

  /**
   * Return a cloned fragment appropriate for adding to a document DOM given
   *  a document so we can get at a document context.  This constructs the
   *  document fragment on demand because we currently have no clue how to
   *  do this without a document.  (And I'm wary of assuming we operate in
   *  a context with a document right now, although we may have one because
   *  of how jetpack currently works.)
   *
   * This MUST be invoked on the widget prototype instance.  Which is to say if
   *  'foo' is the widget constructor, then the invocation must be on
   *  'foo.prototype'.
   */
  _fabFragment: function(aDoc) {
    var frag = this._fragment;
    if (frag)
      return frag.cloneNode(true);

    frag = this._fragment = aDoc.createDocumentFragment();

    var rootMeta = this._structMap.root;

    function fabLevel(aParentMeta, aParentNode) {
      var children = aParentMeta.children;
      for (var iKid = 0; iKid < children.length; iKid++) {
        var kidMeta = children[iKid];
        var node = aDoc.createElement(kidMeta.elementType);
        aParentNode.appendChild(node);
        node.setAttribute("class", kidMeta.cssClassName);
        if (kidMeta.textContent)
          node.textContent = kidMeta.textContent;

        if (kidMeta.children)
          fabLevel(kidMeta, node);
      }
    }
    if (rootMeta.children)
      fabLevel(rootMeta, frag);

    return frag.cloneNode(true);
  },

  /**
   * Base/default update implementation.
   */
  _update: function() {
    var updaters = this._updaters;
    for (var iUpdater = 0; iUpdater < updaters.length; iUpdater++) {
      updaters[iUpdater].call(this);
    }
  },

  /**
   * Base/default destroy implementation.
   */
  _destroy: function() {
    var destructors = this._destructors;
    for (var i = 0; i < destructors.length; i++) {
      destructors[i].call(this);
    }
  },

  /**
   * Update all bindings of the same class.
   */
  updateSimilar: function() {
    var similarNodes = this.domNode.ownerDocument.getElementsByClassName(
                         this._rootCssClassName);
    for (var i = 0; i < similarNodes.length; i++) {
      similarNodes[i].binding.update();
    }
  },
};

/**
 * Creates a widget's prototype.  Our primary goal is to create useful
 *  parameterized helper methods/getters while maintaing a low
 *  per-widget-instance overhead for both memory and construction runtime costs.
 * We accomplish this by defining getters and helper functions that are
 *  parameterized by a lexical closure.
 */
function WidgetProtoFab(aDomain, aOrigin, aWidgetDef) {
  this.domain = aDomain;
  this.origin = aOrigin;
  this.widgetDef = aWidgetDef;
  /**
   * A list of constraint attributes that parameterize this widget.
   */
  this.parameterizedByConstraint = [];

  // walk the top-level widget constraints looking for PARAMs...
  for (var key in aWidgetDef.constraint) {
    var val = aWidgetDef.constraint[key];
    if (val == aDomain.PARAM)
      this.parameterizedByConstraint.push(key);
  }

  /**
   * Interposed prototypes keyed by a string built from the attribute names and
   *  their values.  This is only accessed by the constructor so look at that
   *  code (in |makeFactory|) to figure out what we store in there.
   * We create a prototype for each permutation so that it can have
   *  _parameter_* attributes without a per-instance memory cost, although there
   *  may also have been some forward-looking planning for further optimization
   *  through something resembling constant-propagation.
   *
   * This could simply be closed over but I'm hanging it off the instance for
   *  ease of debugging.
   */
  this.parameterizedProtos = {};

  this.proto = {
    __proto__: WidgetBaseProto,
    cssClassBaseName: aDomain.name + "-" + aOrigin.name + "-" +
                        aWidgetDef.name + "-",
    _updaters: [],
    _destructors: [],
    update: WidgetBaseProto._update,
    destroy: WidgetBaseProto._destroy,
  };
}
WidgetProtoFab.prototype = {
  /**
   * Create a $_element getter.
   */
  addElement: function(aNodeName, aPath) {
    var elemAttrName = aNodeName + "_element";

    this.proto.__defineGetter__(elemAttrName, function $_element_getter() {
      var node = this.domNode;
      // XXX we might be able to use querySelector here for a serious speedup.
      for (var iPathPart = 0; iPathPart < aPath.length; iPathPart++) {
        var iOffset = aPath[iPathPart];
        var kids = node.childNodes;
        if (kids.length <= iOffset)
          return null;
        node = kids[iOffset];
      }
      return node;
    });
  },

  addWidget: function(aNodeName, aConstraintBasis, aBindAttr, aDomain,
                      aIsListReuse) {
    var elemAttrName = aNodeName + "_element";
    var partialAttrName = "_" + aNodeName + "_partial";
    var setterAttrName = aNodeName + "_set";

    this.proto[partialAttrName] =
      aDomain.dtree.partialEvaluate(aConstraintBasis);

    this.proto[setterAttrName] = function $_set(aVal, aForce) {
      var domNode = this[elemAttrName];
      var partial = this[partialAttrName];
      aConstraintBasis.obj = aVal;
      var widgetFab = partial.evaluate(aConstraintBasis);
      // Detect and fail on a self-recursive binding; likely a sign of a
      //  subwidget gone awry.
      if (this.obj === aVal && widgetFab === this.__factory__)
        throw new Error("self-recursive binding detected: " +
                        this.cssClassBaseName + aNodeName);
      if ("binding" in domNode) {
        var binding = domNode.binding;
        // if we're just going to end up re-binding the same widget type to the
        //  same object, turn this into an update() call...
        if (widgetFab === binding.__factory__ &&
            binding.obj === aVal && !aForce) {
          binding.update();
          return binding;
        }
        binding.destroy();
        return widgetFab.replaceBindOnto(aConstraintBasis, domNode);
      }
      return widgetFab.bindOnto(aConstraintBasis, domNode);
    };

    // Don't add a destructor if we are just helping out addWidgetList; it will
    //  add its own.
    if (!aIsListReuse) {
      this.proto._destructors.push(function() {
        var domNode = this[elemAttrName];
        domNode.binding.destroy();
      });
    }

    if (aBindAttr !== undefined) {
      this._commonBindUpdate(aBindAttr, function(obj) {
        return this[setterAttrName](obj);
      });
    }
  },

  /**
   * @param aConstraintBasis a shallow copied object that we are allowed to
   *     manipulate so we can provide it to the partially evaluated decision
   *     with the actual object in question.
   */
  addWidgetList: function(aNodeName, aConstraintBasis, aSeparator,
                          aElemOverride) {
    var elemAttrName = aNodeName + "_element";
    //let itemsAttrName = aNodeName + "_items";
    var partialAttrName = "_" + aNodeName + "_partial";
    var itemElemMapAttrName = aNodeName + "_itemMap";

    var addAllAttrName = aNodeName + "_addAll";
    var clearAttrName = aNodeName + "_clear";

    this.proto[addAllAttrName] = function $_addAll(aItems) {
      var domNode = this[elemAttrName];
      var partial = this[partialAttrName];
      var itemMap = this[itemElemMapAttrName];
      for (var iItem = 0; iItem < aItems.length; iItem++) {
        var item = aItems[iItem];
        aConstraintBasis.obj = item;
        // Add a separator if there is any content already present.
        // (we could probably use fragments to speed this up)
        if (aSeparator && domNode.lastChild) {
          var sepNode = domNode.ownerDocument.createElement("span");
          sepNode.textContent = aSeparator;
          domNode.appendChild(sepNode);
        }
        var widgetFab = partial.evaluate(aConstraintBasis);
        if (!widgetFab) {
          console.error(
            "Failed to resolve widget fab from partial evaluation of:\n" +
               JSON.stringify(aConstraintBasis, null, 2));
        }
        var binding =
          widgetFab.appendChild(aConstraintBasis, domNode, aElemOverride);
        itemMap[item.id] = binding;
      }
    };
    this.proto[aNodeName + "_updateAll"] = function $_updateAll(aItems) {
      var itemMap = this[itemElemMapAttrName];
      for (var iItem = 0; iItem < aItems.length; iItem++) {
        var item = aItems[iItem];
        var itemId = item.id;
        if (!(itemId in itemMap))
          continue;
        itemMap[itemId].update();
      }
    };
    this.proto[aNodeName + "_removeAll"] = function $_removeAll(aItems) {
      var itemMap = this[itemElemMapAttrName];
      for (var iItem = 0; iItem < aItems.length; iItem++) {
        var item = aItems[iItem];
        var itemId = item.id;
        if (!(itemId in itemMap))
          continue;
        var node = itemMap[itemId].domNode;
        itemMap[itemId].destroy();
        delete itemMap[itemId];
        // Remove a separator if appropriate.
        if (aSeparator) {
          if (node.previousSibling)
            node.parentNode.removeChild(node.previousSibling);
          else if (node.nextSibling)
            node.parentNode.removeChild(node.nextSibling);
        }
        node.parentNode.removeChild(node);
      }
    };
    this.proto[clearAttrName] = function $_clear(aItems) {
      var domNode = this[elemAttrName], childNode;
      while ((childNode = domNode.lastChild)) {
        childNode.binding.destroy();
        domNode.removeChild(childNode);
        // eat separators without beliving they are bindings!
        if (aSeparator && ((childNode = domNode.lastChild)))
          domNode.removeChild(childNode);
      }
      this[itemElemMapAttrName] = {};
    };

    // this intentionally clobbers the addWidget setter.
    this.proto[aNodeName + "_set"] = function $_set(aVal, aForce) {
      var domNode = this[elemAttrName];
      this[clearAttrName]();
      this[addAllAttrName](aVal);
    };

    this.proto._destructors.push(function() {
      this[clearAttrName]();
    });
  },

  /**
   * Handle the simple text attribute, multi-attribute traversal bind, and
   *  fromConstraint attribute binding mechanisms.  This is a code readability
   *  win but likely an efficiency loss unless clever optimization is in play.
   *  We can revisit this when the performance becomes an issue.
   *
   * @param aBindAttr What to bind; this is either null, a string, a list, or a
   *     WmsyStructMarker of type "fromConstraint".
   * @param aCall The function to invoke with the value of the binding lookup.
   */
  _commonBindUpdate: function(aBindAttr, aCall) {
    // self (obj) bind
    if (aBindAttr === null) {
      this.proto._updaters.push(function $_updater_self() {
        return aCall.call(this, this.obj);
      });
    }
    // simple attribute bind
    else if (typeof(aBindAttr) == "string") {
      this.proto._updaters.push(function $_updater_simpleAttr() {
        return aCall.call(this, this.obj[aBindAttr]);
      });
    }
    // from-constraint bind
    else if ((aBindAttr instanceof WmsyStructMarker) &&
             aBindAttr.kind == "fromConstraint") {
      // XXX now that we walk looking for param we can likely remove this
      //  once we update the existing WILD usages (or move to warn for a
      //  bit and then remove)
      if (this.parameterizedByConstraint.indexOf(aBindAttr.bindAttr) == -1) {
        this.parameterizedByConstraint.push(aBindAttr.bindAttr);
      }
      // Parameterized widgets get an additional prototype interposed that
      // stores the parameters in attributes named per the next line.
      var paramAttrName = "_parameter_" + aBindAttr.bindAttr;
      // We are then able to use this parameter to perform the lookup:
      this.proto._updaters.push(function $_updater_fromConstraint() {
        var val;
        if (aBindAttr.args)
          val = aBindAttr.args.call(this, this[paramAttrName], this.obj);
        else
          val = this.obj[this[paramAttrName]];
        return aCall.call(this, val);
      });
    }
    // multi-attribute traversal bind
    else {
      this.proto._updaters.push(function $_updater_multiTraversal() {
        var val = this.obj;
        for (var iBind = 0; iBind < aBindAttr.length; iBind++) {
          var subAttr = aBindAttr[iBind];
          val = val[subAttr];
        }
        return aCall.call(this, val);
      });
    }
  },

  /**
   * Create a 'bind' instance; a DOM node whose text and/or attributes are
   *  extracted from the underlying object.
   */
  addBinding: function(aNodeName, aBindText, aBindAttrs) {
    var elemAttrName = (aNodeName == "root") ? "domNode" :
                                               (aNodeName + "_element");

    if (aBindText)
      this._commonBindUpdate(aBindText, function(val) {
        var domNode = this[elemAttrName];
        domNode.textContent = val;
      });
    if (aBindAttrs) {
      // because we don't have 'let' we need a function to introduce a closure
      //  to latch the attr name.
      var dis = this;
      function bindAttr(latchedAttrName, attrSource) {
        dis._commonBindUpdate(attrSource, function(val) {
          var domNode = this[elemAttrName];
          domNode.setAttribute(latchedAttrName, val);
        });
      };
      for (var attrName in aBindAttrs) {
        bindAttr(attrName, aBindAttrs[attrName]);
      }
    }
  },

  addPopup: function(aPopupName, aConstraintBasis, aPositioning, aClickAway) {
    var partialAttrName = "_popup" + aPopupName + "_partial";

    var domain = this.domain;
    this.proto[partialAttrName] =
      domain.dtree.partialEvaluate(aConstraintBasis);

    // -- position processing
    var posnode = "root";
    var posx = 0, posy = -1, pospad = 5;
    for (var poskey in aPositioning) {
      switch (poskey) {
        // - positioning direction directives
        // The -ish variants are intended to mean to failover to the opposite
        //  direction when things don't fit.  Not implemented. XXX.
        case "abovish":
        case "above":
          posx = 0;
          posy = -1;
          posnode = aPositioning[poskey];
          break;
        case "belowish":
        case "below":
          posx = 0;
          posy = 1;
          posnode = aPositioning[poskey];
          break;
        case "rightof":
          posx = 1;
          posy = 0;
          posnode = aPositioning[poskey];
          break;
        case "leftof":
          posx = -1;
          posy = 0;
          posnode = aPositioning[poskey];
          break;
        // - how much padding / spacing between the relnode and the popup
        case "pad":
          pospad = aPositioning[poskey];
          break;
      }
    }

    var relElemAttrName;
    if (posnode == "root")
      relElemAttrName = "domNode";
    else
      relElemAttrName = posnode + "_element";

    // -- popup_$
    this.proto["popup_" + aPopupName] = function popup_$(aObj, aCallback) {
      var partial = this[partialAttrName];
      aConstraintBasis.obj = aObj;
      var widgetFab = partial.evaluate(aConstraintBasis);

      var relElem = this[relElemAttrName];
      var binding = widgetFab.popup(aConstraintBasis, relElem,
                                    posx * pospad, posy * pospad);
      var popupNode = binding.domNode;

      // create the click-away listener if desired
      if (aClickAway) {
        var docElem = relElem.ownerDocument.documentElement;
        var clickAwayListener = function clickAwayListener(aEvent) {
          // bail if we find the root of our popup...
          var node = aEvent.target;
          while (node != null) {
            if (node == popupNode)
              break;
            node = node.parentNode;
          }
          // Because the popup is rooted higher than the wmsy top element, we
          //  need to re-consider this click in the context of wmsy event
          //  handling.
          if (node != null) {
            return domain._handleEvent(aEvent);
          }

          binding.done();
          return true;
        };
        docElem.addEventListener("click", clickAwayListener, true);
      }

      // poke the 'done' method into the instantiated binding...
      binding.done = function popup_$_done() {
        binding.domNode.parentNode.removeChild(binding.domNode);
        docElem.removeEventListener("click", clickAwayListener, true);

        if (aCallback)
          aCallback.apply(null, arguments);
      };
    };
    console.log("bound popup on", this.proto);
  },

  /**
   * Contribute some stuff to the prototype.  This will clobber, so be careful,
   *  yo!
   *
   * @param aObjWithStuff The stuff to contribute.
   */
  contribute: function(aObjWithStuff) {
    for (var key in aObjWithStuff) {
      this.proto[key] = aObjWithStuff[key];
    }
  },

  addEmitter: function(aName) {
    var receiverListName = "_receivers_" + aName;
    var handlerName = "handle_" + aName;
    // add the broadcasting mechanism...
    this.proto["emit_" + aName] = function emit_$() {
      var receivers = this[receiverListName];
      for (var i = 0; i < receivers.length; i++) {
        var receiver = receivers[i];
        receiver[handlerName].apply(receiver, arguments);
      }
    };
  },

  /**
   * Receivers interact with relayers by looking for both emitters and relayers
   *  with the same name as what the receiver receives as they climb the tree.
   *  If they find an interested relayer, they replace their own _receivers_$
   *  list with a reference to the one on the relayer.
   */
  makeRendezvousLogic: function(aRelayNames, aEmitNames, aReceiveDef) {
    var i;
    // add the maps to the proto that explain what we are looking for...
    if (aEmitNames) {
      // build an __emit object for quick attribute testing...
      this.proto.__emit = {};
      for (i = 0; i < aEmitNames.length; i++) {
        this.proto.__emit[aEmitNames[i]] = true;

      }
    }
    var receiveNamesList;
    if (aReceiveDef) {
      this.proto.__receive = {};

    }

    this.proto._boundInit = function _boundInit() {
      var i;
      // if we do any relaying, set up those structures

      // if we emit/receive anything, walk up the tree looking for fulfillment
      if (aEmitNames || aReceiveNames) {
        var emitNames = aEmitNames.concat();
        var receiveNames = receiveNamesList.concat();

        // start looking for bindings from our parent.
        var curNode = this.domNode.parentNode;
        while (curNode && !("wmsyTop" in curNode)) {
          if ("binding" in curNode) {
            var binding = curNode.binding;
            if (emitNames && ("__receive" in binding)) {
              for (i = 0; i < emitNames.length; i++) {
                var emitName = emitNames[i];
                if (emitName in binding.__receive) {

                }
              }
            }
            if (receiveNames && ("__relay" in binding)) {

            }
            if (receiveNames && ("__emit" in binding)) {

            }
          }
          curNode = curNode.parentNode;
        }
      }
    };

    // walk up the tree using the same logic we used to register, but
    //  removing ourselves from receiver lists as we go.
    this.proto._destructors.push(function _destroy_rendezvous() {

    });
  },

  /**
   * If we are a caterpillar, this bit makes the butterfly; create the
   *  constructor function and hand it and our prototype off to a freshly
   *  created WidgetFactory.
   */
  makeFactory: function() {
    var realConstructor;
    if ("constructor" in this.widgetDef)
      realConstructor = this.widgetDef.constructor;

    var constructor;
    if (this.parameterizedByConstraint.length == 0) {
      constructor = function constructor_simple(aConstraintBasis) {
        if ("obj" in aConstraintBasis)
          this.obj = aConstraintBasis.obj;
        else
          this.obj = null;
        if (realConstructor)
          realConstructor.call(this, aConstraintBasis);
      };
    }
    else {
      var parameterAttributes = this.parameterizedByConstraint;
      var protoCache = this.parameterizedProtos;
      var baseProto = this.proto;
      var protoConstructor = ("protoConstructor" in this.widgetDef) ?
                               this.widgetDef.protoConstructor : null;
      constructor = function constructor_parameterized(aConstraintBasis) {
        var protoKey = "", iParam;
        for (iParam = 0; iParam < parameterAttributes.length; iParam++) {
          var paramAttr = parameterAttributes[iParam];
          protoKey += paramAttr + ":" + aConstraintBasis[paramAttr] + ";";
        }
        var proto;
        if (!(protoKey in protoCache)) {
          proto = {
            __proto__: baseProto, // we could also use this.__proto__
          };
          for (iParam = 0; iParam < parameterAttributes.length; iParam++) {
            var paramAttr = parameterAttributes[iParam];
            proto["_parameter_" + paramAttr] = aConstraintBasis[paramAttr];
          }
          if (protoConstructor)
            protoConstructor.call(proto, aConstraintBasis);
          protoCache[protoKey] = proto;
        }
        else {
          proto = protoCache[protoKey];
        }
        // re-parent us to the right parameterized prototype
        this.__proto__ = proto;
        if ("obj" in aConstraintBasis)
          this.obj = aConstraintBasis.obj;
        else
          this.obj = null;
        if (realConstructor)
          realConstructor.call(this, aConstraintBasis);
      };
    }
    constructor.name = this.domain.name + "-" + this.origin.name + "-" +
                         this.widgetDef.name + "-constructor";
    constructor.prototype = this.proto;

    return new WidgetFactory(constructor, this.proto);
  }
};

/**
 * A widget factory is responsible for creating a widget instance and inserting
 *  in into the document tree.
 *
 * We need to make sure that we insert the CSS rules for each widget in each
 *  document.  We want to be quick about checking this.  We currently accomplish
 *  this by creating a 'wmsyInsertedClasses' expando attribute on the document
 *  that tracks whether we have done so.  We just insert the CSS prefix if we
 *  have.
 */
function WidgetFactory(aConstructor, aPrototype) {
  this.constructor = aConstructor;
  this.proto = aPrototype;
  this.proto.__factory__ = this;
}
WidgetFactory.prototype = {
  /**
   * Create and append a widget binding to the given (parent) node, returning the
   *  JS binding instance.  You can get the dom node from the 'domNode' attribute
   *  on the binding.
   *
   * @param aConstraintBasis The constraint basis evaluated to choose this
   *     widget (factory), which must include an 'obj' attribute whose value is
   *     the object to create a binding for.
   * @param aParentNode The DOM node to append the created node to.
   * @param [aElemOverride] Force a specific element type to be used for the
   *     widget.
   * @return The JS binding.
   */
  appendChild: function(aConstraintBasis, aParentNode, aElemOverride) {
    var doc = aParentNode.ownerDocument;
    var newNode = doc.createElement(aElemOverride ||
                                    this.proto._rootElementType);
    aParentNode.appendChild(newNode);
    return this.bindOnto(aConstraintBasis, newNode);
  },

  /**
   * Create and insert a widget binding prior to the given node, returning the
   *  JS binding instance.  You can get the dom node from the 'domNode' attribute
   *  on the binding.
   *
   * @param aConstraintBasis The constraint basis evaluated to choose this
   *     widget (factory), which must include an 'obj' attribute whose value is
   *     the object to create a binding for.
   * @param aBeforeNode The DOM node to insert the created node ahead of.
   * @param [aElemOverride] Force a specific element type to be used for the
   *     widget.
   * @return The JS binding.
   */
  insertBefore: function(aConstraintBasis, aBeforeNode, aElemOverride) {
    var doc = aBeforeNode.ownerDocument;
    var parentNode = aBeforeNode.parentNode;

    var newNode = doc.createElement(aElemOverride ||
                                    this.proto._rootElementType);
    parentNode.insertBefore(newNode, aBeforeNode);
    return this.bindOnto(aConstraintBasis, newNode);
  },

  /**
   * Replace a bound DOM node with a new binding.  We throw away the existing
   *  DOM node in order to avoid having to deal with listener difficulties or
   *  DOM attributes set by the previous binding.
   */
  replaceBindOnto: function(aConstraintBasis, aNode) {
    var doc = aNode.ownerDocument;
    var nextNode = aNode.nextSibling;
    var parentNode = aNode.parentNode;
    parentNode.removeChild(aNode);

    var newNode = doc.createElement(aNode.tagName);
    parentNode.insertBefore(newNode, nextNode);

    // The node may have had a class set on it before our binding; grab and
    //  propagate that if so.
    var curClass = aNode.className;
    if (curClass) {
      var idxSpace = curClass.indexOf(" ");
      if (idxSpace >= 0)
        newNode.className = curClass.substring(idxSpace+1);
    }

    return this.bindOnto(aConstraintBasis, newNode);
  },

  /**
   * Given an existing DOM node, converting it into a binding.  Call
   *  |replaceBindOnto| if the node already has a binding attached.
   *
   * @param aConstraintBasis The constraint basis evaluated to choose this
   *     widget (factory), which must include an 'obj' attribute whose value is
   *     the object to create a binding for.
   * @param aNode The DOM node to establish the binding on.
   * @return The JS binding.
   */
  bindOnto: function(aConstraintBasis, aNode) {
    var doc = aNode.ownerDocument;
    var binding = new this.constructor(aConstraintBasis);
    var proto = this.proto;
    var frag = proto._fabFragment(doc);

    // We need to make sure the CSS has been injected into the document...
    var wmsyInsertedClasses;
    if (!("wmsyInsertedClasses" in doc))
      wmsyInsertedClasses = doc.wmsyInsertedClasses = {};
    else
      wmsyInsertedClasses = doc.wmsyInsertedClasses;
    if (!(proto.cssClassBaseName in wmsyInsertedClasses)) {
      var styleElem = doc.createElement("style");
      styleElem.setAttribute("type", "text/css");
      styleElem.textContent = proto._flattenedCssString;
      var headTags = doc.getElementsByTagName("head");
      if (headTags.length == 0) {
        var headTag = doc.createElement("head");
        doc.documentElement.insertBefore(headTag,
                                         doc.documentElement.firstChild);
        headTags = [headTag];
      }
      headTags[0].appendChild(styleElem);
      wmsyInsertedClasses[proto.cssClassBaseName] = true;
    }

    // The DOM node may already have a (single) class from our widgeting
    //  framework; keep it.
    var existingClass = aNode.className;
    if (existingClass)
      aNode.className = proto._rootCssClassName + " " + existingClass;
    else
      aNode.className = proto._rootCssClassName;

    if (proto._rootTextContent)
      aNode.textContent = proto._rootTextContent;
    aNode.appendChild(frag);
    binding.domNode = aNode;
    aNode.binding = binding;
    if ("_boundInit" in binding)
      binding._boundInit();
    if ("preInit" in binding)
      binding.preInit();
    binding.update();
    if ("postInit" in binding)
      binding.postInit();
    return binding;
  },

  /**
   * Create a popup-styled widget instance and position it.  This does not
   *  handle click-away handling or anything focus related.
   */
  popup: function(aConstraintBasis, aRelNode, aPosX, aPosY) {
    var docElem = aRelNode.ownerDocument.documentElement;
    var bodyElem = docElem.children[1];
    var binding = this.appendChild(aConstraintBasis, bodyElem);
    var domNode = binding.domNode;
    domNode.style.position = "absolute";

    // try and figure out its size and what not...
    var width = domNode.clientWidth, height = domNode.clientHeight;
    // ?? is getBoundingClientRect more appropriate? (happier on spans?)

    var relBounds = aRelNode.getBoundingClientRect();

    var tLeft, tTop;
    if (aPosY < 0)
      tTop = relBounds.top - height + aPosY;
    else if (aPosY > 0)
      tTop = relBounds.bottom + aPosY;
    else
      tTop = relBounds.top + (relBounds.bottom - relBounds.top) / 2 -
               height / 2;
    if (aPosX < 0)
      tLeft = relBounds.left - width + aPosX;
    else if (aPosX > 0)
      tLeft = relBounds.right + aPosX;
    else
      tLeft = relBounds.left + (relBounds.right - relBounds.left) / 2 -
                width / 2;

    var docWin = aRelNode.ownerDocument.defaultView;
    tLeft += docWin.scrollX;
    tTop += docWin.scrollY;

    domNode.style.left = tLeft + "px";
    domNode.style.top = tTop + "px";

    return binding;
  },
};

/**
 * Clone an object by tricking JSON into doing it for us.  This only works if
 *  everyone is a primitive.
 */
function deepSimpleClone(aObj) {
  return JSON.parse(JSON.stringify(aObj));
}

/**
 * Focus is annoying.
 *
 * The user-visible big picture is that they can tab between containers and
 * inside the containers use arrow keys to get around.
 *
 * Our implementation operates on the roaming tabIndex mode of operation.  The
 * choice of this over aria-activedescendant is made because:
 * - It makes more sense to conform to the DOM's idea of focus rather than the
 *   ARIA model which appears to not currently be reflected in the DOM.  This
 *   is especially pertinent for :focused magic selectors.
 * - We currently don't label all our nodes with id's (which activedescendant
 *   requires) and aren't particularly likely to ever need them since the wmsy
 *   model abhors global knowledge.  (However we might do so for optimization
 *   purposes if our direct DOM node references are causing GC or cross-process
 *   problems.)
 * - aria-activedescendant is writable and it's not clear that this is a
 *   compatible mode of operation when we get to widgets that only render a
 *   subset of the actual underlying data.
 *
 * General assumptions of our focus model:
 * - Our focus granularity is on a (sub)widget basis.  A single (sub)widget
 *   can either be focusable in its entirety or a container that holds other
 *   containers or things that are focusable.
 */
function FocusManager() {

}
FocusManager.prototype = {

  /**
   * Given an origin widget that is currently focused, figure out what focusable
   * widget, if any, can be found by moving in the desired direction.
   *
   * Given the rare occurrence of such navigation, this does not need to be
   * particularly efficient.
   *
   *
   */
  ponderNavigation: function(aOriginWidget, aVertical, aIncrease) {

  }
};

function WmsyDomain(aName, aLibDomain) {
  this.name = aName;
  this.dtree = new DecisionSpace();
  this.WILD = this.dtree.WILD;
  this.PARAM = this.dtree.WILD2;

  this._libDomain = aLibDomain;

  this.cssClassToStructInfo = {};
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
  _structureChew: function(aStructDef, aProtoFab, aWidgetDef) {
    var smap = {};
    this.__structureChewNode(smap, "root", aStructDef, [], aProtoFab,
                             aWidgetDef);
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
   */
  __structureChewNode: function(aSMap, aKey, aValue, aPath, aProtoFab,
                                aWidgetDef, aParentMeta) {
    var kdata = aSMap[aKey] = {};
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
        if (aValue.kind == "widgetflow")
          kdata.elementType = kdata.subElementType = "span";
        else
          kdata.elementType = kdata.subElementType = "div";

        var separator = (aValue.opts && ("separator" in aValue.opts)) ?
                          aValue.opts.separator : null;
        aProtoFab.addWidget(aKey, aValue.args, aValue.bindAttr, this, true);
        aProtoFab.addWidgetList(aKey, aValue.args, separator,
                                kdata.subElementType);
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

    return kdata;
  },

  /**
   * Pending CSS standard transform helpers.
   */
  __pendingStandardTransforms: [
    [/display *: *box;/,
     "display: -moz-box; display: -webkit-box; display: box;"],
    [/box-orient *: *(.+);/,
     "-moz-box-orient: $1; -webkit-box-orient: $1; box-orient: $1;"],
    [/box-flex *: *(.+);/,
     "-moz-box-flex: $1; -webkit-box-flex: $1; box-flex: $1;"],
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
    aWidgetDef.name = aWidgetDef.name.replace(" ", "_", "g");
console.log("WIDGET DEF: " + aWidgetDef.name);

    var protoFab = new WidgetProtoFab(this, aOrigin, aWidgetDef);
    // -- impl
    if ("impl" in aWidgetDef)
      protoFab.contribute(aWidgetDef.impl);

    // -- structure
    var structureMap = this._structureChew(aWidgetDef.structure, protoFab,
                                           aWidgetDef);
    protoFab.proto._structMap = structureMap;
    protoFab.proto._rootCssClassName = structureMap.root.cssClassName;
    protoFab.proto._rootElementType = structureMap.root.elementType;
    protoFab.proto._rootTextContent = structureMap.root.textContent;

    var cssClassToStructInfo = protoFab.proto._cssClassToStructInfo = {};
    var globalCssClassToStructInfo = this.cssClassToStructInfo;

    for (var key in structureMap) {
      var meta = structureMap[key];
      cssClassToStructInfo[meta.cssClassName] = meta;
      globalCssClassToStructInfo[meta.cssClassName] = meta;
    }

    // -- style
    var cssBlocks = this._styleChew(aWidgetDef.style,
                                    protoFab.proto.cssClassBaseName);
    protoFab.proto._flattenedCssString = cssBlocks.join("\n");


    // -- events
    if ("events" in aWidgetDef)
      this._eventsChew(aWidgetDef.events, structureMap);

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
    var widgetFab = this.dtree.evaluate(aConstraintWithObj);
    return widgetFab.appendChild(aConstraintWithObj, aDomElem);
  },

  /**
   * Just hard-code a list of supported events right now, though we should
   *  perhaps just add listeners as needed? XXX
   */
  SUPPORTED_EVENTS: ["click", "mousewheel"],
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
    var handler_name = "on_" + aEvent.type;
    // find and latch the most specific binding...
    var targetBinding = null;
    for (var curNode = aEvent.target; curNode && (!("wmsyTop" in curNode));
           curNode = curNode.parentNode) {
      // text nodes can't have attributes...
      if (curNode.nodeType == 3)
        continue;
      var cssClassNames = curNode.getAttribute("class").split(" ");
      // (the most specific css class name is first)
      for (var iClass = 0; iClass < cssClassNames.length; iClass++) {
        var cssClassName = cssClassNames[iClass];
        // map to structinfo by css name for us and libraries, bail if neither
        var structInfo;
        if (!(cssClassName in this.cssClassToStructInfo)) {
          if (!this._libDomain ||
              !(cssClassName in this._libDomain.cssClassToStructInfo))
            continue;
          structInfo = this._libDomain.cssClassToStructInfo[cssClassName];
        }
        else {
          structInfo = this.cssClassToStructInfo[cssClassName];
        }

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

var TbWmsy = {
  domains: {},

  /**
   * Get the wmsy domain for the given name, creating it if it does not exist.
   */
  getDomain: function(aName) {
    if (aName in this.domains)
      return this.domains[aName];

    var libDomain;
    if (aName != "wlib")
      libDomain = this.getDomain("wlib");

    var domain = new WmsyDomain(aName, libDomain);
    this.domains[aName] = domain;
    return domain;
  },

  makeExported: function(aContext) {
    return new TbWmsyExport(aContext);
  }
};

/**
 * Test CSS generation by transforming objects
 */
function test_css() {
  function teq(a, b) {
    if (a != b)
      throw new Error(a + " != " + b);
    else
      print("  pass: " + a + " == " + b);
  }

  var cssMapifications = [
    [{root: "a: b;"}, ".z-root {a: b;}"],
    [{foo: "a: b;"}, ".z-foo {a: b;}"],
    [{root: {":hover": {foo: "a: b;"}}}, ".z-root:hover .z-foo {a: b;}"],
    [{foo: {":hover": "a: b;"}}, ".z-foo:hover {a: b;}"],
  ];
  const cssPrefix = "z-";

  var domain = new WmsyDomain("test");

  for (var i = 0; i < cssMapifications; i++) {
    var testObj = cssMapifications[i][0];
    var expected = cssMapifications[i][1];

    var blobs = domain._styleChew(testObj, cssPrefix);
    teq(blobs.length, 1);
    var blob = blobs[0].replace("\n", "", "g").replace(/ +/g, " ");
    teq(expected, blob);
  }
}
//test_css();
