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

var wmsySyntax = require("wmsy/wmsy-syntax");
var WmsyStructMarker = wmsySyntax.WmsyStructMarker,
    WmsyObjDecorator = wmsySyntax.WmsyObjDecorator,
    WmsyFocusMarker = wmsySyntax.WmsyFocusMarker;

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

  /**
   * Ensure that the given child binding is visible.  This is only relevant
   *  to this widget list if its scroll length along its designated axis
   *  exceeds its client length (aka scrolling can happen).
   * This is a 'listy' behavior and exists primarily so more complicated widgets
   *  that need to control scrolling can do so.
   */
  $_ensureVisible: function(aBinding, aOriginBinding) {
  },

  /**
   * A reference to the last child binding of this list that was focused or had
   *  a descendent focused.  This is only created on instances where a
   *  descendent gets focused but will always exist on the prototype.
   */
  $_lastFocused: null,
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
  __cssClassBaseName: "",

  /**
   * The CSS class name of the root node.  Stashed here because the root is not
   *  part of the document fragment.
   */
  __rootCssClassName: "",
  /**
   * The element type of the root node.  Stashed here because the root is not
   *  part of the document fragment.
   */
  __rootElementType: "",

  /**
   * The string representation of the CSS for the widget.  This gets inserted
   *  into the document by the |WidgetFactory|.
   */
  __flattenedCssString: "",

  /**
   * Provides meta-information about every key seen in the 'structure' widget
   *  definition.
   */
  __structMap: {},

  /**
   * Maps CSS class names back to the structured map info they come from.  This
   *  is used in event handling.
   */
  __cssClassToStructInfo: {},

  /**
   * A list of initialization functions to invoke when initializing the widget.
   *  All functions are invoked prior to calls to preInit and update with 'this'
   *  properly initialized.
   */
  __initers: [],

  /**
   * A list of updater functions to invoke when updating this widget.  Each
   *  bound widget puts something in here.  |__update| calls these with the
   *  proper 'this' context when invoked.  It's regrettable that we have to
   *  resort to this but without better code generation capabilities than eval
   *  this is where we find ourselves.  Hope it JITs!
   */
  __updaters: [],

  /**
   * A list of destructor functions to invoke when destorying this widget.
   *  |__destroy| calls these with the proper 'this' context when invoked.
   */
  __destructors: [],

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
   *  just be an alias to the |__update| automatically created method.  If the
   *  widget implementation does define this method, it should call the
   *  |__update| method before it returns.
   *
   * @param [aRecursive=false] Should all nested widgets be updated as well?
   *     Sub-widgets are always automatically updated.
   */
  update: function(aRecursive) {
  },

  /**
   * Destroy the widget.
   *
   * If the widget implementation does not define a 'destroy' method, this will
   *  just be an alias to the |__destroy| automatically created method.  If the
   *  widget implementation does define this method, it should call the
   *  |__destroy| method before it returns.
   */
  destroy: function() {

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
  __fragment: null,

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
  __fabFragment: function wbp___fabFragment(aDoc) {
    var frag = this.__fragment;
    if (frag)
      return frag.cloneNode(true);

    frag = this.__fragment = aDoc.createDocumentFragment();

    var rootMeta = this.__structMap.root;

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
  __update: function wbp___update() {
    var updaters = this.__updaters;
    for (var iUpdater = 0; iUpdater < updaters.length; iUpdater++) {
      updaters[iUpdater].call(this);
    }
  },

  /**
   * Base/default destroy implementation.
   */
  __destroy: function wbp___destroy() {
    var destructors = this.__destructors;
    for (var i = 0; i < destructors.length; i++) {
      destructors[i].call(this);
    }
  },

  /**
   * Make sure this binding is as visible as possible on the screen.  This is
   *  done by walking up to the wmsy top bound node and at every layer seeing
   *  if the DOM node is scrolly (scroll dims not equal to client dims).  If
   *  it is (scrolly), provides a blah_ensureVisible, and we came out of a
   *  dom node that was a binding, then we call the blah_ensureVisible
   *  function.  We then continue on our merry journey to the top.
   * This does not need to be the world's fastest process because we do not
   *  expect to be called all that often.  (We should usually be the result
   *  of a one-off user action.)
   */
  ensureVisible: function wbp_ensureVisible() {
    var curNode, lastNode;
    for (curNode = this.domNode, lastNode = null;
         curNode && (!("wmsyTop" in curNode));
         lastNode = curNode, curNode = curNode.parentNode) {
      // nothing to do here if everything is good.
      if (curNode.scrollHeight == curNode.clientHeight &&
          curNode.scrollWidth == curNode.clientWidth) {
        continue;
      }
      // (the current DOM node is scrolly)
      // make sure the lastNode was a binding, bail otherwise
      if (!("binding" in lastNode))
        continue;

      // run upwards until we find a binding...
      var bindyNode = curNode;
      while (bindyNode && !("binding" in bindyNode))
        bindyNode = bindyNode.parentNode;
      if (!bindyNode)
        break;

      var binding = bindyNode.binding;
      // - figure out the structure map for curNode
      var curClass = curNode.getAttribute("class");
      // we want the specific one (widget lists don't have this; just wlib-virt)
      if (curClass.indexOf(" ") >= 0)
        curClass = curClass.substring(0, curClass.indexOf(" "));
      var structMeta = binding.__cssClassToStructInfo[curClass];
      if (!structMeta)
        throw new Error("Struct meta does not exist for " + curClass);

      // - check for a usable ensureVisible...
      var evName = structMeta.name + "_ensureVisible";
      if (!(evName in binding))
        continue;

      binding[evName](lastNode.binding, this);
    }
  },

  /**
   * Update all bindings of the same class.
   */
  updateSimilar: function wbp_updateSimilar() {
    var similarNodes = this.domNode.ownerDocument.getElementsByClassName(
                         this.__rootCssClassName);
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
    __cssClassBaseName: aDomain.name + "-" + aOrigin.name + "-" +
                          aWidgetDef.name + "-",
    __initers: [],
    __updaters: [],
    __destructors: [],
    update: WidgetBaseProto.__update,
    destroy: WidgetBaseProto.__destroy,
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
    var partialAttrName = "__" + aNodeName + "_partial";
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
                        this.__cssClassBaseName + aNodeName);
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
      this.proto.__destructors.push(function() {
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
                          aElemOverride, aIdAttr, aVertical) {
    // Create the attribute on the prototype so we can assume the attribute
    //  always exists even if it is never actually used for a widget.  (It
    //  will only be set on widgetlists where focus is ever set.  The
    //  actual resource and performance impact of this is unclear; we may be
    //  fooling ourselves or making things worse...)
    this.proto[aNodeName + "_lastFocused"] = null;

    var elemAttrName = aNodeName + "_element";
    //let itemsAttrName = aNodeName + "_items";
    var partialAttrName = "__" + aNodeName + "_partial";
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
        itemMap[(aIdAttr == null) ? item : item[aIdAttr]] = binding;
      }
    };
    this.proto[aNodeName + "_updateAll"] = function $_updateAll(aItems) {
      var itemMap = this[itemElemMapAttrName];
      for (var iItem = 0; iItem < aItems.length; iItem++) {
        var item = aItems[iItem];
        var itemId = (aIdAttr == null) ? item : item[aIdAttr];
        if (!(itemId in itemMap))
          continue;
        itemMap[itemId].update();
      }
    };
    this.proto[aNodeName + "_removeAll"] = function $_removeAll(aItems) {
      var itemMap = this[itemElemMapAttrName];
      for (var iItem = 0; iItem < aItems.length; iItem++) {
        var item = aItems[iItem];
        var itemId = (aIdAttr == null) ? item : item[aIdAttr];
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

    this.proto[aNodeName + "_iterWalk"] = function $_iterWalk(aStart, aDir,
                                                              aCallback) {
      var linkAttr = (aDir < 0) ? "previousSibling" : "nextSibling";
      var domNode;
      if (aStart == null) {
        if (aDir > 0)
          domNode = this[elemAttrName].firstChild;
        else
          domNode = this[elemAttrName].lastChild;
        // we might be empty, return false immediately if so
        if (domNode == null)
          return false;
      }
      else {
        domNode = aStart.domNode[linkAttr];
        if (!domNode)
          return false;
        if (aSeparator)
          domNode = domNode[linkAttr];
      }

      while (true) {
        var rval = aCallback(domNode.binding);
        if (rval)
          return rval;
        domNode = domNode[linkAttr];
        if (!domNode)
          return false;
        if (aSeparator)
          domNode = domNode[linkAttr];
      }
    };

    var clientLenAttr = aVertical ? "clientHeight" : "clientWidth";
    //var scrollLenAttr = aVertical ? "scrollHeight" : "scrollWidth";
    var scrollOffAttr = aVertical ? "scrollTop" : "scrollLeft";
    var offsetOffAttr = aVertical ? "offsetTop" : "offsetLeft";
    this.proto[aNodeName + "_ensureVisible"] = function $_ensureVisible(
        aBinding, aOriginBinding) {
      var containerNode = this[elemAttrName];
      var containerLen = dNode[clientLenAttr];
      var containerOff = dNode[offsetOffAttr];
      var containerScroll = dNode[scrollOffAttr];

      var kidNode = aBinding.domNode;
      var kidLen = kidNode[clientLenAttr];

      var originNode = aOriginBinding.domNode;

      // see if the origin binding is currently fully visible.  if it is, we have
      //  nothing to do.
      var originOff = originNode[offsetOffAttr];
      var originLen = originNode[clientLenAttr];
      if ((originOff >= containerOff + containerScroll) &&
          (originOff + originLen <=
             containerOff + containerScroll + containerLen))
        return;

      // (it's not fully visible)
      // Figure out how to perturb our child's position so that the origin
      //  binding can fit in our viewport area in its entirety.  If the origin
      //  binding is simply too big, then fit as much of it as possible as
      //  scrolling would expose if the user was doing it.

      // (our child is too big)
      // figure out how to position our child binding so that
    };

    // this intentionally clobbers the addWidget setter.
    this.proto[aNodeName + "_set"] = function $_set(aVal, aForce) {
      var domNode = this[elemAttrName];
      this[clearAttrName]();
      this[addAllAttrName](aVal);
    };

    this.proto.__destructors.push(function() {
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
      this.proto.__updaters.push(function $_updater_self() {
        return aCall.call(this, this.obj);
      });
    }
    // simple attribute bind
    else if (typeof(aBindAttr) == "string") {
      this.proto.__updaters.push(function $_updater_simpleAttr() {
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
      var paramAttrName = "__parameter_" + aBindAttr.bindAttr;
      // We are then able to use this parameter to perform the lookup:
      this.proto.__updaters.push(function $_updater_fromConstraint() {
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
      this.proto.__updaters.push(function $_updater_multiTraversal() {
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
    var partialAttrName = "__popup" + aPopupName + "_partial";

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

      var focusManager = null;
      focusManager.pushPopup();

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
        focusManager.popPopup();

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
    var receiverListName = "__receivers_" + aName;
    var handlerName = "__receive_" + aName;
    // add the broadcasting mechanism...
    this.proto["emit_" + aName] = function emit_$() {
      var receivers = this[receiverListName];
      for (var i = 0; i < receivers.length; i++) {
        var receiver = receivers[i];
        receiver[handlerName].apply(receiver, arguments);
      }
    };
  },

  addReceiver: function(aName, aFunc) {
    this.proto["__receive_" + aName] = aFunc;
  },

  /**
   * Adds the shared logic for binding-time hookup of emitter/receivers and
   *  builds the prototype data structures used at hookup-time.
   *
   * Receivers interact with relayers by looking for both emitters and relayers
   *  with the same name as what the receiver receives as they climb the tree.
   *  If they find an interested relayer, they replace their own __receivers_$
   *  list with a reference to the one on the relayer.
   *
   * Because both emitters and receivers go looking, there is currently the
   *  potential for an ice cream sandwich
   */
  makeRendezvousLogic: function(aRelayNames, aEmitNames, aReceiveNames) {
    var i;
    // add the maps to the proto that explain what we are looking for...
    if (aEmitNames) {
      // build an __emit object for quick attribute testing...
      this.proto.__emit = {};
      for (i = 0; i < aEmitNames.length; i++) {
        this.proto.__emit[aEmitNames[i]] = true;

      }
    }
    if (aReceiveNames) {
      this.proto.__receive = {};
      for (i = 0; i < aReceiveNames.length; i++) {
        this.proto.__receive[aReceiveNames[i]] = true;
      }
    }
    if (aRelayNames) {
      this.proto.__relay = {};
      for (i = 0; i < aRelayNames.length; i++) {
        this.proto.__relay[aRelayNames[i]] = true;
      }
    }

    this.proto.__initers.push(function _init_rendezvous() {
      var i;
      // set up the receiver lists for emitting and relaying
      if (aEmitNames) {
        for (i = 0; i < aEmitNames.length; i++) {
          this["__receivers_" + aEmitNames[i]] = [];
        }
      }
      if (aRelayNames) {
        for (i = 0; i < aRelayNames.length; i++) {
          this["__receivers_" + aRelayNames[i]] = [];
        }
      }

      // if we emit/receive anything, walk up the tree looking for fulfillment
      if (aEmitNames || aReceiveNames) {
        var emitNames = aEmitNames ? aEmitNames.concat() : null;
        var receiveNames = aReceiveNames ? aReceiveNames.concat() : null;

        // start looking for bindings from our parent.
        var curNode = this.domNode.parentNode;
        while (curNode && !("wmsyTop" in curNode)) {
          if ("binding" in curNode) {
            var binding = curNode.binding, emitName;
            // - emitter seeking relay to steal receivers list
            if (emitNames && ("__relay" in binding)) {
              for (i = emitNames.length - 1; i >= 0; i--) {
                emitName = emitNames[i];
                if (emitName in binding.__relay) {
                  var receiverListName = "__receivers_" + emitName;
                  this[receiverListName] = binding[receiverListName];
                  emitNames.splice(i, 1); // check it off our list
                  if (!emitNames.length) {
                    emitNames = null;
                    if (!receiveNames)
                      break;
                  }
                }
              }
            }
            // - emitter seeking receiver
            if (emitNames && ("__receive" in binding)) {
              for (i = emitNames.length - 1; i >= 0; i--) {
                emitName = emitNames[i];
                if (emitName in binding.__receive) {
                  this["__receivers_" + emitName].push(binding);
                  emitNames.splice(i, 1); // check it off our list
                  if (!emitNames.length) {
                    emitNames = null;
                    if (!receiveNames)
                      break;
                  }
                }
              }
            }
            // - receiver seeking emitter/relay
            if (receiveNames &&
                (("__emit" in binding) || ("__relay" in binding))) {
              for (i = receiveNames.length - 1; i >= 0; i--) {
                var receiveName = receiveNames[i];
                var receiverListName = "__receivers_" + receiveName;
                if (receiverListName in binding) {
                  binding[receiverListName].push(this);
                  receiveNames.splice(i, 1); // check it off our list
                  if (!receiveNames.length) {
                    receiveNames = null;
                    if (!emitNames)
                      break;
                  }
                }
              }
            }
          }
          curNode = curNode.parentNode;
        }
      }
    });

    // For cleanup, only receivers need to worry about doing anything.  Emitters
    //  not relaying store the receiver list themselves and so that list will
    //  be obliterated when the binding is destroyed.  Emitters using relays
    //  can just leave the relay's list of receivers intact.  This leaves
    //  receivers to remove themself from receiver lists.
    this.proto.__destructors.push(function _destroy_rendezvous() {
      if (aReceiveNames) {
        var receiveNames = aReceiveNames ? aReceiveNames.concat() : null;

        // start looking for bindings from our parent.
        var curNode = this.domNode.parentNode;
        while (curNode && !("wmsyTop" in curNode)) {
          if ("binding" in curNode) {
            var binding = curNode.binding, emitName;
            if (receiveNames &&
                (("__emit" in binding) || ("__relay" in binding))) {
              for (i = receiveNames.length - 1; i >= 0; i--) {
                var receiveName = receiveNames[i];
                var receiverListName = "__receivers_" + receiveName;
                if (receiverListName in binding) {
                  var rlist = binding[receiverListName];
                  rlist.splice(rlist.indexOf(this), 1);
                  receiveNames.splice(i, 1); // check it off our list
                  if (!receiveNames.length)
                    break;
                }
              }
            }
          }
          curNode = curNode.parentNode;
        }
      }
    });
  },

  /**
   * Focus domain hookup.  This is assumed to be called after structure chewing
   *  so that when we push our updater to compel a focus we can be reasonably
   *  confident it comes after the updaters.  That might benefit from its own
   *  phase though...
   */
  makeFocusDomain: function() {
    this.proto.__initers.push(function _init_focusDomain() {
      var focusManager = this.domNode.ownerDocument.wmsyFocusManager;
      this.__focusDomain = focusManager.newFocusDomain(this);
    });

    this.proto.__updaters.push(function _update_focusDomain() {
      var focusManager = this.domNode.ownerDocument.wmsyFocusManager;
      focusManager.ensureDomainFocused(this.__focusDomain);
    });

    this.proto.__destructors.push(function _destroy_focusDomain() {
      var focusManager = this.domNode.ownerDocument.wmsyFocusManager;
      focusManager.destroyFocusDomain(this.__focusDomain);
      this.__focusDomain = null;
    });
  },

  /**
   * Focusable item hookup.
   *
   * There is no JS per-binding cost for focusable things.  We store the focused
   *  state as a DOM attribute on the node.
   *
   * All focusable items need helper logic to:
   * - Tell the focus manager to unfocus them if they are focused.
   */
  makeFocusable: function() {
    this.proto.__defineGetter__("focused", function _get_focused() {
      return this.domNode.hasAttribute("wmsy-focused");
    });

    this.proto.focus = function focus() {
      var focusManager = this.domNode.ownerDocument.wmsyFocusManager;
      focusManager.focusBinding(this);
      this.ensureVisible();
    };

    this.proto.__destructors.push(function _destroy_unfocus() {
      if (this.domNode.hasAttribute("wmsy-focused")) {
        var focusManager = this.domNode.ownerDocument.wmsyFocusManager;
        focusManager.focusedBindingBeingDestroyed(this);
      }
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
            proto["__parameter_" + paramAttr] = aConstraintBasis[paramAttr];
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
exports.WidgetProtoFab = WidgetProtoFab;

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
                                    this.proto.__rootElementType);
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
  insertBefore: function(aConstraintBasis, aBeforeNode, aParentNode,
                         aElemOverride) {
    var doc = aParentNode.ownerDocument;

    var newNode = doc.createElement(aElemOverride ||
                                    this.proto.__rootElementType);
    aParentNode.insertBefore(newNode, aBeforeNode);
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
    var frag = proto.__fabFragment(doc);
    var wmsyInsertedClasses = doc.wmsyInsertedClasses;

    // We need to make sure the CSS has been injected into the document...
    if (!(proto.__cssClassBaseName in wmsyInsertedClasses)) {
      var styleElem = doc.createElement("style");
      styleElem.setAttribute("type", "text/css");
      styleElem.textContent = proto.__flattenedCssString;
      var headTags = doc.getElementsByTagName("head");
      if (headTags.length == 0) {
        var headTag = doc.createElement("head");
        doc.documentElement.insertBefore(headTag,
                                         doc.documentElement.firstChild);
        headTags = [headTag];
      }
      headTags[0].appendChild(styleElem);
      wmsyInsertedClasses[proto.__cssClassBaseName] = true;
    }

    // The DOM node may already have a (single) class from our widgeting
    //  framework; keep it.
    var existingClass = aNode.className;
    if (existingClass)
      aNode.className = proto.__rootCssClassName + " " + existingClass;
    else
      aNode.className = proto.__rootCssClassName;

    if (proto.__rootTextContent)
      aNode.textContent = proto.__rootTextContent;
    aNode.appendChild(frag);
    binding.domNode = aNode;
    aNode.binding = binding;
    if (binding.__initers.length){
      var initers = binding.__initers;
      for (var i = 0; i < initers.length; i++) {
        initers[i].call(binding);
      }
    }
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
