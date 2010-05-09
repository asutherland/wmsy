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
* The Initial Developer of the Original Code is Mozilla Messaging, Inc.
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

function WmsyStructMarker(aKind, aArgs, aBindAttr, aOpts) {
  this.kind = aKind;
  this.args = aArgs;
  this.bindAttr = aBindAttr;
  this.opts = aOpts;
}
WmsyStructMarker.prototype = {
};

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
  this.useDomain("default");
  this.name = aContext.id;

  this.widgetDefinitions = [];

  // jetpack unloading semantics went here
}
WmsyExportDomain.prototype = {
  useDomain: function(aName) {
    this.domain = TbWmsy.getDomain(aName);
    this.WILD = this.domain.WILD;
  },


  /**
   * @name Widget Definition
   */
  //@{

  /**
   * @param aDef.name
   * @param aDef.constraint
   * @param aDef.structure
   * @param aDef.events
   * @param aDef.styling
   * @param aDef.constructor
   * @param aDef.impl
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
   * Defines a point where multiple widgets are inserted where everyone is a div.
   */
  widgetList: function(aPartialConstraint, aBindAttr, aOpts) {
    return new WmsyStructMarker("widgetlist", aPartialConstraint, aBindAttr,
                                aOpts);
  },

  /**
   * Defines a point where multiple widgets are inserted where everyone is a span.
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
   */
  fromConstraint: function(aKeyName) {
    return new WmsyStructMarker("fromConstraint", null, aKeyName);
  },
  //@}

  /**
   * @name Widget Instantiation
   */
  //@{
  wrapElement: function(aDomElem) {
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
   * Map from item ids to the widget we bound to them.
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
   *
   */
  _update: function() {
    var updaters = this._updaters;
    for (var iUpdater = 0; iUpdater < updaters.length; iUpdater++) {
      updaters[iUpdater].call(this);
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
  /**
   * Interposed prototypes keyed by a string built from the attribute names and
   *  their values.  This is only accessed by the constructor so look at that
   *  code (in |makeFactory|) to figure out what we store in there.
   * This could simply be closed over but I'm hanging it off the instance for
   *  ease of debugging.
   */
  this.parameterizedProtos = {};

  this.proto = {
    __proto__: WidgetBaseProto,
    cssClassBaseName: aDomain.name + "-" + aOrigin.name + "-" +
                        aWidgetDef.name + "-",
    _updaters: [],
    update: WidgetBaseProto._update,
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

  addWidget: function(aNodeName, aConstraintBasis, aBindAttr) {
    var elemAttrName = aNodeName + "_element";
    var partialAttrName = "_" + aNodeName + "_partial";
    var setterAttrName = aNodeName + "_set";

    this.proto[partialAttrName] =
      this.domain.dtree.partialEvaluate(aConstraintBasis);

    this.proto[setterAttrName] = function $_set(aVal, aForce) {
      var domNode = this[elemAttrName];
      var partial = this[partialAttrName];
      aConstraintBasis.obj = aVal;
      var widgetFab = partial.evaluate(aConstraintBasis);
      if ("binding" in domNode) {
        // check if it's still the same value and we're not forcing => bail.
        if (domNode.binding.obj === aVal && !aForce)
          return domNode.binding;
        return widgetFab.replaceBindOnto(aConstraintBasis, domNode);
      }
      return widgetFab.bindOnto(aConstraintBasis, domNode);
    };

    if (aBindAttr !== undefined) {
      // self (obj) bind
      if (aBindAttr === null) {
        this.proto._updaters.push(function $_updater_self() {
          return this[setterAttrName](this.obj);
        });
      }
      // simple attribute bind
      else if (typeof(aBindAttr) == "string") {
        this.proto._updaters.push(function $_updater_simpleAttr() {
          return this[setterAttrName](this.obj[aBindAttr]);
        });
      }
      // from-constraint bind
      else if ((aBindAttr instanceof WmsyStructMarker) &&
               aBindAttr.kind == "fromConstraint") {
        if (this.parameterizedByConstraint.indexOf(aBindAttr.bindAttr) == -1) {
          this.parameterizedByConstraint.push(aBindAttr.bindAttr);
        }
        // Parameterized widgets get an additional prototype interposed that
        // stores the parameters in attributes named per the next line.
        var paramAttrName = "_parameter_" + aBindAttr.bindAttr;
        // We are then able to use this parameter to perform the lookup:
        this.proto._updaters.push(function $_updater_fromConstraint() {
          return this[setterAttrName](this.obj[this[paramAttrName]]);
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
          this[setterAttrName](val);
        });
      }
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
    var itemElemMapAttrName = "_" + aNodeName + "_itemMap";

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
               JSON.stringify(aConstraintBasis, null, 2) + "\n");
        }
        widgetFab.appendChild(aConstraintBasis, domNode, aElemOverride);
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
        var node = itemMap[itemId];
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
      var domNode = this[elemAttrName];
      while (domNode.lastChild)
        domNode.removeChild(domNode.lastChild);
    };

    // this intentionally clobbers the addWidget setter.
    this.proto[aNodeName + "_set"] = function $_set(aVal, aForce) {
      var domNode = this[elemAttrName];
      this[clearAttrName]();
      this[addAllAttrName](aVal);
    };
  },

  /**
   * Create a 'bind' instance; a DOM node whose text and/or attributes are
   * extracted from the underlying object.
   */
  addBinding: function(aNodeName, aBindText, aBindAttrs) {
    var elemAttrName = aNodeName + "_element";
    this.proto._updaters.push(function $_updater() {
      var domNode = this[elemAttrName];
      var val, iBind, subAttr;
      if (aBindText) {
        if (typeof(aBindText) == "string") {
          domNode.textContent = this.obj[aBindText];
        }
        else {
          val = this.obj;
          for (iBind = 0; iBind < aBindText.length; iBind++) {
            subAttr = aBindText[iBind];
            val = val[subAttr];
          }
          domNode.textContent = val;
        }
      }
      if (aBindAttrs) {
        for (var attrName in aBindAttrs) {
          var attrSource = aBindAttrs[attrName];
          if (typeof(attrSource) == "string") {
            domNode.setAttribute(attrName, this.obj[attrSource]);
          }
          else {
            val = this.obj;
            for (iBind = 0; iBind < attrSource.length; iBind++) {
              subAttr = attrSource[iBind];
              val = val[subAttr];
            }
            domNode.setAttribute(attrName, val);
          }
        }
      }
    });
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

    aNode.setAttribute("class", proto._rootCssClassName);
    if (proto._rootTextContent)
      aNode.textContent = proto._rootTextContent;
    aNode.appendChild(frag);
    binding.domNode = aNode;
    aNode.binding = binding;
    binding.update();
    return binding;
  }
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

function WmsyDomain(aName) {
  this.name = aName;
  this.dtree = new DecisionSpace();
  this.WILD = this.dtree.WILD;

  this.cssClassToStructInfo = {};
}
WmsyDomain.prototype = {

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
        aProtoFab.addWidget(aKey, aValue.args, aValue.bindAttr);
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

        aProtoFab.addWidget(aKey, constraint, null);
      }
      else if (aValue.kind == "widgetflow" ||
               aValue.kind == "widgetlist") {
        if (aValue.kind == "widgetflow")
          kdata.elementType = kdata.subElementType = "span";
        else
          kdata.elementType = kdata.subElementType = "div";

        var separator = (aValue.opts && ("separator" in aValue.opts)) ?
                          aValue.opts.separator : null;
        aProtoFab.addWidget(aKey, aValue.args, aValue.bindAttr);
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

  __whitespaceCleanupRE: /\n */g,
  __styleChewLevel: function(aCssStrings, aStyleLevelDef,
                             aActiveSelector, aCssClassBaseName) {
    for (var key in aStyleLevelDef) {
      var value = aStyleLevelDef[key];
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

        // lists of strings
        if (typeof(value) == "object" && "length" in value)
          value = value.join("\n");
        if (typeof(value) == "string")
          aCssStrings.push(nextSelector + " {\n  " +
                           value.trim().replace(this.__whitespaceCleanupRE,
                                                "\n  ") +
                           "\n}\n");
        else
          this.__styleChewLevel(aCssStrings, value, nextSelector,
                                aCssClassBaseName);
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
   *
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
   * The process of compiling a widget goes like this:
   * - Traverse the provided structure, building up a document fragment and
   *    retrieval offset information.
   * -
   *
   * @param aOrigin Who is defining this widget?
   * @param aWidgetDef The widget definition
   */
  defineWidget: function(aOrigin, aWidgetDef) {
    // it is very important there be no spaces in the widget name.
    aWidgetDef.name = aWidgetDef.name.replace(" ", "_", "g");
console.log("WIDGET DEF: " + aWidgetDef.name + "\n");

    var protoFab = new WidgetProtoFab(this, aOrigin, aWidgetDef);

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

    var cssBlocks = this._styleChew(aWidgetDef.style,
                                    protoFab.proto.cssClassBaseName);
    protoFab.proto._flattenedCssString = cssBlocks.join("\n");


    var widgetFactory = protoFab.makeFactory();
    this.dtree.addPossibility(aWidgetDef.constraint, widgetFactory);

    this.dtree.build();
console.log("  END WIDGET DEF: " + aWidgetDef.name + "\n");
  },

  undefineWidget: function(aWidgetDef) {

    this.dtree.removePossibility(aWidgetDef);
console.log("REMOVED WIDGET, REBUILDING\n");
    this.dtree.build();
console.log("  REBUILT\n");
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
   * Hookup event handling for the given root element.
   */
  bindEventsOnRoot: function(aRootElem) {
    var dis = this;
    aRootElem.addEventListener("click",
                               function(aEvent) {
                                 return dis._handleEvent(aEvent);
                               },
                               false);
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
    for (var curNode = aEvent.target; curNode; curNode = curNode.parentNode) {
      var cssClassName = curNode.getAttribute("class");
console.log("curNode: " + curNode + " : class " + cssClassName + "\n");
      // keep looking if it's not ours
      if (!(cssClassName in this.cssClassToStructInfo))
        continue;
console.log("  found struct info!\n");
      var structInfo = this.cssClassToStructInfo[cssClassName];

      // if we have not yet latched the target binding, figure it out now
      if (!targetBinding) {
        targetBinding = curNode;
        for (i=structInfo.path.length; i >= 0; i--)
          targetBinding = targetBinding.parentNode;
        targetBinding = targetBinding.binding;
      }

      // keep looking if it has no handler
      if (!(handler_name in structInfo))
        continue;

      // figure out the binding it belongs to so we can give it the right 'this'
      var bindingRootNode = curNode;
      for (i=structInfo.path.length; i >= 0; i--)
        bindingRootNode = bindingRootNode.parentNode;

      structInfo[handler_name].call(bindingRootNode.binding, targetBinding,
                                    aEvent);
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

    var domain = new WmsyDomain(aName);
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
