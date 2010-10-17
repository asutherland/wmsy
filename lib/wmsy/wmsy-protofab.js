/***************************** BEGIN LICENSE BLOCK *****************************
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

require.def("wmsy/wmsy-protofab",
  [
    "exports",
    "wmsy/wmsy-syntax",
    "wmsy/viewslice-static",
    "wmsy/dom-geom",
  ],
  function(
    exports,
    wmsySyntax,
    vst,
    domgeom
  ) {

var WmsyStructMarker = wmsySyntax.WmsyStructMarker,
    WmsyObjDecorator = wmsySyntax.WmsyObjDecorator,
    WmsyFocusMarker = wmsySyntax.WmsyFocusMarker;

var SELF = null;
var NONE = undefined;

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
   *  trappings.  This is only created for lists where an id is defined.
   */
  $_itemMap: null,

  /**
   * Basically the semantics of Array.splice.
   *
   * @param["aIndex"
   *   @case[@numgte[0]]{
   *     The starting index for modifications.
   *   }
   *   @case[@numlt[0]]{
   *     The number of elements from the back, where -1 is the first, -2 the
   *     second, etc.
   *   }
   * ]
   * @param["aHowManyToDelete"
   *   @case[undefined]{
   *     Delete until the end of the list.
   *   }
   *   @case[@numgte[0]]{
   *     How many items to delete at that index.
   *   }
   * ]
   * @param["aValues"]{
   *   The list of items to insert at @lxref{aIndex}.
   * }
   */
  $_splicey: function(aIndex, aHowManyToDelete, aValues) {
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
   * aRecursive=false: Should all nested widgets be updated as well?
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
        if ("staticAttrs" in kidMeta) {
          for (var attrName in kidMeta.staticAttrs) {
            node.setAttribute(attrName, kidMeta.staticAttrs[attrName]);
          }
        }

        if (kidMeta.children)
          fabLevel(kidMeta, node);
      }
    }
    if (rootMeta.children)
      fabLevel(rootMeta, frag);

    return frag.cloneNode(true);
  },

  /**
   * Internal helper to find the parent binding of this binding.  Currently
   *  not public because this really only should be used for event-dispatching
   *  type things.  If user code wants to do something like this then either
   *  they are doing something wrong or we have failed them.
   */
  get __parentBinding() {
    for (var domNode = this.domNode.parentNode;
         domNode && !("wmsyTop" in domNode);
         domNode = domNode.parentNode) {
      if ("binding" in domNode)
        return domNode.binding;
    }
    return null;
  },

  /**
   * Used to tell a widget that it should or should not be focusable.  This
   *  is added to every widget so that widgets that manage visibility of
   *  their children can stop focus traversal into those objects without
   *  having to know if they are truly focusable and do so without having
   *  a direct reference to the focus manager.
   *
   * The name is double-underscored because this is expert-ish level stuff.
   *
   * (This implementation is a no-op; when a widget is made directly focusable
   *  or into a container it is given a method that actually does something.)
   */
  __focusEnable: function wbp__focusEnable(aEnable) {
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

  toString: function() {
    return "[wmsy:" + this.__cssClassBaseName + "]";
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
    for (curNode = this.domNode, lastNode = curNode;
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

var HelperMethods = {
  /**
   * Do-something implementation of focusEnable used for focusable items and
   *  containers.  By default every binding proto-chain has a no-op until this
   *  shadows it.
   */
  focusEnable: function HM_focusEnable(aEnable) {
    this.__focusEnabled = aEnable;
  },

  /**
   * Given a whole number represented as a string, cram some commas in.
   *
   * We only need to do this because chromium's toLocaleString is a jerk and
   *  does not put commas in.
   */
  commaize: function(wholeStr, commaChar) {
    var l = wholeStr.length, i = l % 3;
    i = i ? i : 3; // if the number is evenly divisible by 3, start by eating 3
    //  since the loop below would otherwise put commas in front of them...
    var outStr = wholeStr.substring(0, i);
    for (i += 3; i <= l; i += 3) {
      outStr += commaChar + wholeStr.substring(i - 3, i);
    }
    return outStr;
  },
};

/**
 * Creates a widget's prototype.  Our primary goal is to create useful
 *  parameterized helper methods/getters while maintaing a low
 *  per-widget-instance overhead for both memory and construction runtime costs.
 * We accomplish this by defining getters and helper functions that are
 *  parameterized by a lexical closure.
 *
 * @args[
 *   @param[aDomain]
 *   @param[aOrigin]
 *   @param[aWidgetDef WidgetDef]
 * ]
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

    var partial = this.proto[partialAttrName] =
      aDomain.dtree.partialEvaluate(aConstraintBasis);

    this.proto[setterAttrName] = function $_set(aVal, aForce) {
      var domNode = this[elemAttrName];
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
   */
  addWidgetList: function(aNodeName, aConstraintBasis, aSeparator,
                          aElemOverride, aChildCssClass,
                          aVertical, aDomain, aDecorated) {
    // Create the attribute on the prototype so we can assume the attribute
    //  always exists even if it is never actually used for a widget.  (It
    //  will only be set on widgetlists where focus is ever set.  The
    //  actual resource and performance impact of this is unclear; we may be
    //  fooling ourselves or making things worse...)
    this.proto[aNodeName + "_lastFocused"] = null;

    var elemAttrName = aNodeName + "_element";
    var partialAttrName = "__" + aNodeName + "_partial";
    var partial = this.proto[partialAttrName];

    // If we create a static view slice, we cram it in sliceAttrName for the
    //  widget code.  If a view slice was exposed to us directly then there is
    //  no need to name it.
    var sliceAttrName = aNodeName + "_slice";
    var sliceListenerAttrName = "__" + aNodeName + "_sliceListener";
    var dataAttrName = aNodeName + "_data";

    var fabBefore, viewDecoratorConstructor;
    // decorated view slices need custom logic to:
    // 1) use the alternate constraint for synthetic items.  We allow this to
    //     vary using fabFromItem which we conditionalize below.
    // 2) wrap the underlying view slice.  We just have the _set logic do
    //     some extra legwork right now with an if.
    if (!aDecorated) {
      fabBefore = function(aItem, aBeforeNode, aParentNode, aElemOverride) {
        aConstraintBasis.obj = aItem;
        var widgetFab = partial.evaluate(aConstraintBasis);
        if (!widgetFab) {
          console.error(
            "Failed to resolve widget fab from partial evaluation of:\n" +
              JSON.stringify(aConstraintBasis, null, 2));
          throw new Error("Failure to resolve; see logged error.");
        }
        widgetFab.insertBefore(aConstraintBasis, aBeforeNode, aParentNode,
                               aElemOverride, aChildCssClass);
      };
    }
    else {
      var synthConstraint = aDecorated.synthConstraint;
      var synthPartial = aDomain.dtree.partialEvaluate(synthConstraint);
      fabBefore = function(aItem, aBeforeNode, aParentNode, aElemOverride) {
        var widgetFab, basis, usePartial;
        // synthetic case
        if (typeof(aItem) === "object" &&
            ("_synthetic" in aItem) &&
            aItem._synthetic === WmsyStructMarker) {
          basis = synthConstraint;
          // unbox the item
          aItem = aItem.obj;
          usePartial = synthPartial;
        }
        // non-synthetic case
        else {
          basis = aConstraintBasis;
          usePartial = partial;
        }
        basis.obj = aItem;
        widgetFab = usePartial.evaluate(basis);
        if (!widgetFab) {
          console.error(
            "Failed to resolve widget fab from partial evaluation of:\n" +
              JSON.stringify(basis, null, 2));
          throw new Error("Failure to resolve; see logged error.");
        }
        widgetFab.insertBefore(basis, aBeforeNode, aParentNode, aElemOverride);
      };
    }

    // this intentionally clobbers the addWidget setter.
    this.proto[aNodeName + "_set"] = function $_set(aVal, aForce) {
      var domNode = this[elemAttrName];
      // this is allowed to either be an array or a viewsplice instance
      if (Array.isArray(aVal)) {
        aVal = new vst.StaticViewSlice(aVal,
                                       this[sliceListenerAttrName],
                                       this);
        this[sliceAttrName] = aVal;
      }
      else {
        aVal._listener = this[sliceListenerAttrName];
        aVal.data = this;
      }
      if (aDecorated) {
        aVal = new aDecorated.constructor(aVal, aDecorated.sliceDef, this);
      }
      // request everything
      aVal.seek(0, undefined, undefined);
    };

    this.proto.__destructors.push(function() {
      this[sliceListenerAttrName].splice(0, undefined, undefined,
                                         this[sliceAttrName]);
    });

    this.proto[sliceListenerAttrName] = {
      didSeek: function $_sliceListener_didSeek(aBaseIndex, aItems, aSlice) {
        // Trigger a splice that deletes everything we know about and replaces
        //  it with what we're being told about.
        this.splice(0, undefined, aItems, aSlice);
      },

      splice: function $_sliceListener_splice(aIndex, aHowMany, aItems,
                                              aSlice) {
        var dis = aSlice.data;
        var domNode = dis[elemAttrName], nextKidNode, curKidNode;
        if (aIndex < 0) {
          if (aSeparator)
            aIndex = aIndex * 2 + (domNode.children.length + 1);
          else
            aIndex += domNode.children.length;
        }
        // -- remove bit
        // (we figure out what to remove from our own DOM tree)
        if (aHowMany === undefined || aHowMany > 0) {
          var toKill;
          if (aHowMany) {
            toKill = aHowMany;
          }
          else {
            toKill = aSeparator ? (domNode.children.length + 1) / 2 :
              domNode.children.length;
            toKill -= aIndex;
          }
          nextKidNode = domNode.children[aSeparator ? (aIndex * 2) : aIndex];
          while (toKill--) {
            nextKidNode.binding.destroy();
            // Remove a separator if appropriate.
            if (aSeparator) {
              if (nextKidNode.nextSibling)
                domNode.removeChild(nextKidNode.nextSibling);
              else if (nextKidNode.previousSibling)
              domNode.removeChild(nextKidNode.previousSibling);
            }
            curKidNode = nextKidNode;
            nextKidNode = nextKidNode.nextSibling;
            domNode.removeChild(curKidNode);
          }
        }
        else {
          if (nextKidNode < domNode.children.length)
            nextKidNode = domNode.children[aSeparator ? (aIndex * 2) : aIndex];
          else
            nextKidNode = null;
        }

        // -- add bit
        if (!aItems)
          return;
        for (var iItem = 0; iItem < aItems.length; iItem++) {
          var item = aItems[iItem];
          // Add a separator if there is any content already present.
          // (we could probably use fragments to speed this up)
          if (aSeparator && domNode.lastChild) {
            var sepNode = domNode.ownerDocument.createElement("span");
            sepNode.textContent = aSeparator;
            domNode.insertBefore(sepNode, nextKidNode);
          }
          fabBefore(item, nextKidNode, domNode, aElemOverride);
        }
      },
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
      var containerLen = containerNode[clientLenAttr];
      var containerOff = containerNode[offsetOffAttr];
      var containerScroll = containerNode[scrollOffAttr];

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

      var lefty = ((originLen > containerLen) ||
                   (originOff < containerOff + containerScroll));

      var scrollTarg;
      // which side of the origin binding do we try and make visible?
      if (lefty) {
        // try and put the top/left at top/left of the container
        scrollTarg = originOff - containerOff;
      }
      else {
        // try and put the bottom/right at the bottom/right of the container
        var originRight = originOff + originLen;
        scrollTarg = originRight - containerOff - containerLen;
      }
      containerNode[scrollOffAttr] = scrollTarg;
    };
  },

  /**
   * Normalize the formatter specification into a formatter function.
   */
  _normFormatterFunc: function(formatter) {
    if (!formatter)
      return formatter;
    var type = typeof(formatter);
    if (type === "function")
      return formatter;
    if (type !== "string")
      throw new Error("Unacceptable formatter spec: " + formatter);

    // exciting #.### syntax mashes up toLocaleString and toFixed.
    var fixedDigits;
    if (formatter[0] === "#") {
      if (formatter.length === 1) {
        return function(v) {
          // get the localized delimited string version
          var wholeString = v.toLocaleString();
          var periodWhole = wholeString.lastIndexOf(".");
          var commaWhole = wholeString.lastIndexOf(",");
          if (commaWhole === -1 && periodWhole === -1) {
            return HelperMethods.commaize(wholeString, ",");
          }
          return wholeString;
        };
      }
      else if (formatter.length > 1 && formatter[1] === ".") {
        fixedDigits = formatter.length - 2;
        return function(v) {
          // get the localized delimited string version
          var wholeString = v.toLocaleString();
          // get the fixed representation version
          var fractionString = v.toFixed(fixedDigits);
          // find the rightmost comma or period in both
          var periodWhole = wholeString.lastIndexOf(".");
          var commaWhole = wholeString.lastIndexOf(",");
          var idxWhole = Math.max(periodWhole, commaWhole);
          var idxFraction = Math.max(fractionString.lastIndexOf("."),
                                     fractionString.lastIndexOf(","));
          // jerky toLocaleString handler:
          if (idxWhole > 3 && (commaWhole === -1 || periodWhole === -1)) {
            var periodChar = wholeString[idxWhole];
            var commaChar = (periodChar === "." ? "," : ".");
            return HelperMethods.commaize(wholeString.substring(0, idxWhole),
                                          commaChar) +
                    periodChar + fractionString.substring(idxFraction + 1);
          }
          // take up through the rightmost from the whole bit, from the right of
          //  the rightmost in fixed.
          // (we want the rounding and padding so we can't just snip...)
          return wholeString.substring(0, idxWhole + 1) +
                 fractionString.substring(idxFraction + 1);
        };
      }
    }
    throw new Error("Unsupported formatter spec: " + formatter);
  },

  /**
   * Handle the simple text attribute, multi-attribute traversal bind, and
   *  fromConstraint attribute binding mechanisms.  This is a code readability
   *  win but likely an efficiency loss unless clever optimization is in play.
   *  We can revisit this when the performance becomes an issue.
   *
   * @args[
   *   @param[aBindAttr]{
   *     What to bind; this is either null, a string, a list, or a
   *     WmsyStructMarker of type "fromConstraint".
   *   }
   *   @param[aCall]{
   *     The function to invoke with the value of the binding lookup.
   *   }
   *   @param[aAlsoInit]{
   *     Should this also be an initer?  We would want to do this in the case
   *     where all updaters want to be able to assume that this code has run.
   *     Another option would be to have more of a concept of phases for the
   *     update logic.
   *   }
   * ]
   */
  _commonBindUpdate: function(aBindAttr, aCall, aAlsoInit) {
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
    // "computed" (bind)
    else if ((aBindAttr instanceof WmsyStructMarker) &&
             aBindAttr.kind == "computed") {
      if (!(aBindAttr.bindAttr in this.proto))
        throw new Error("Computed binding references nonexistent function " +
                        "'" + aBindAttr.bindAttr + "' that needs to exist in " +
                        "impl.");
      var computeFunc = this.proto[aBindAttr.bindAttr];
      var formatFunc = this._normFormatterFunc(aBindAttr.opts.formatter);
      if (formatFunc) {
        this.proto.__updaters.push(function $_updater_computed() {
          // formatFunc is invoked without a 'this' context; the others get one.
          return aCall.call(this, formatFunc(computeFunc.call(this)));
        });
      }
      else {
        // (same deal without a formatter call involved)
        this.proto.__updaters.push(function $_updater_computed() {
          return aCall.call(this, computeFunc.call(this));
        });
      }
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

    if (aAlsoInit)
      this.proto.__initers.push(
        this.proto.__updaters[this.proto.__updaters.length-1]);
  },

  /**
   * Create a 'bind' instance; a DOM node whose text and/or attributes are
   *  extracted from the underlying object.
   */
  addBinding: function(aNodeName, aBindText, aBindAttrs, aFormatter) {
    var elemAttrName = (aNodeName == "root") ? "domNode" :
                                               (aNodeName + "_element");
    aFormatter = this._normFormatterFunc(aFormatter);
    if (aBindText !== undefined) { // null means self-bind.
      if (aFormatter) {
        this._commonBindUpdate(aBindText, function(val) {
          var domNode = this[elemAttrName];
          domNode.textContent = aFormatter(val);
        });
      }
      else {
        this._commonBindUpdate(aBindText, function(val) {
          var domNode = this[elemAttrName];
          domNode.textContent = val;
        });
      }
    }
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

  addPopup: function(aPopupName, aConstraintBasis, aPositioning, aClickAway,
                     aCenterOnFocus) {
    var partialAttrName = "__popup" + aPopupName + "_partial";

    var domain = this.domain;
    this.proto[partialAttrName] =
      domain.dtree.partialEvaluate(aConstraintBasis);

    // -- position processing
    var pos_calc = domgeom.chewRelPositionDef(aPositioning, aCenterOnFocus);

    // -- popup_$
    this.proto["popup_" + aPopupName] = function popup_$(aObj, aRelBinding,
                                                         aCallback) {
      var partial = this[partialAttrName];
      aConstraintBasis.obj = aObj;
      var widgetFab = partial.evaluate(aConstraintBasis);

      var focusManager = this.domNode.ownerDocument.wmsyFocusManager;
      focusManager.pushPopup();

      var binding = widgetFab.popup(aConstraintBasis, pos_calc, aRelBinding);
      var popupNode = binding.domNode;
      focusManager.activePopup = binding;

      // create the click-away listener if desired
      if (aClickAway) {
        var docElem = popupNode.ownerDocument.documentElement;
        var clickAwayListener = function clickAwayListener(aEvent) {
          // bail if we find the root of our popup...
          var node = aEvent.target;
          while (node != null) {
            if (node == popupNode)
              return true;
            node = node.parentNode;
          }
          // (the user did not click inside the popup, kill the popup)
          binding.done(false);
          return true;
        };
        docElem.addEventListener("click", clickAwayListener, true);
      }

      // poke the 'done' method into the instantiated binding...
      binding.done = function popup_$_done() {
        binding.destroy();
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
   * @args[
   *   @param[aObjWithStuff]{
   *     The stuff to contribute.
   *   }
   * ]
   */
  contribute: function(aObjWithStuff) {
    for (var key in aObjWithStuff) {
      this.proto[key] = aObjWithStuff[key];
    }
  },

  /**
   * Create a __context object at initialization time (instead of a
   *  look-up-the-tree getter as makeContextPassthrough does).
   */
  makeContextProvider: function(aBindAttrs) {
    // -- create __context obj
    this.proto.__initers.push(function _init_context() {
      // create our fresh context.
      this.__context = {};
      // find our parent context if there is one.
      var parentBinding = this.__parentBinding;
      // (all bindings expose a __context; sometimes it's just a getter.)
      if (parentBinding)
        this.__context.__proto__ = parentBinding.__context;
    });

    // -- create updaters
    if (aBindAttrs) {
      // because we don't have 'let' we need a function to introduce a closure
      //  to latch the attr name.
      var dis = this;
      function bindAttr(latchedAttrName, attrSource) {
        dis._commonBindUpdate(attrSource, function(val) {
          this.__context[latchedAttrName] = val;
        }, true);
      };
      for (var attrName in aBindAttrs) {
        bindAttr(attrName, aBindAttrs[attrName]);
      }
    }
  },

  /**
   * Create a __context getter that is basically __parentBinding's code modified
   *  so that it just gets a reference to the parent's context.  This ends up
   *  recursively walking upwards in this manner until we hit an actual
   *  __context object or run out of bindings.
   */
  makeContextPassthrough: function() {
    this.proto.__defineGetter__("__context", function _context_getter() {
      for (var domNode = this.domNode.parentNode;
           domNode && !("wmsyTop" in domNode);
           domNode = domNode.parentNode) {
        if ("binding" in domNode)
          return domNode.binding.__context;
      }
      return null;
    });
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

  makeFocusContainer: function() {
    this.proto.__focusEnabled = true;
    this.proto.__focusEnable = HelperMethods.focusEnable;
  },

  /**
   * Focusable item hookup.
   *
   * There is no JS per-binding cost for focusable things.  We store the focused
   *  state as a DOM attribute on the node.
   *
   * All focusable items need helper logic to:
   * - Tell the focus manager to unfocus them if they are focused.
   *
   * @args[
   *   @param[aClickToFocus Boolean]
   * ]
   */
  makeFocusable: function(aClickToFocus) {
    if (aClickToFocus)
      this.proto.__clickToFocus = true;

    this.proto.__focusEnabled = true;
    this.proto.__focusEnable = HelperMethods.focusEnable;

    this.proto.__defineGetter__("focused", function _get_focused() {
      return this.domNode.hasAttribute("wmsy-focused");
    });

    this.proto.focus = function focus() {
      var focusManager = this.domNode.ownerDocument.wmsyFocusManager;
      focusManager.focusBinding(this);
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
   * @args[
   *   @param[aConstraintBasis]{
   *     The constraint basis evaluated to choose this widget (factory), which
   *     must include an 'obj' attribute whose value is the object to create a
   *     binding for.
   *   }
   *   @param[aParentNode]{
   *     The DOM node to append the created node to.
   *   }
   *   @param[aElemOverride #:optional]{
   *     Force a specific element type to be used for the widget.
   *   }
   *   @param[aMakePopup #:optional]{
   *     Make the DOM node be absolutely positioned and mark it with a
   *     wmys-popup attribute.  We want to do this before appending to the tree
   *     to avoid causing more layout than is actually required.
   *   }
   * ]
   * @return[Binding]{
   *   The JS binding.
   * }
   */
  appendChild: function(aConstraintBasis, aParentNode, aElemOverride,
                        aMakePopup) {
    var doc = aParentNode.ownerDocument;
    var newNode = doc.createElement(aElemOverride ||
                                    this.proto.__rootElementType);
    if (aMakePopup) {
      newNode.style.position = "absolute";
      // make sure it can grow in the x and y directions as much as it wants
      //  during its layout!
      newNode.style.left = "0px";
      newNode.style.top = "0px";
      newNode.setAttribute("wmsy-popup", "");
    }
    aParentNode.appendChild(newNode);
    return this.bindOnto(aConstraintBasis, newNode);
  },

  /**
   * Create and insert a widget binding prior to the given node, returning the
   *  JS binding instance.  You can get the dom node from the 'domNode' attribute
   *  on the binding.
   *
   * @args[
   *   @param[aConstraintBasis]{
   *     The constraint basis evaluated to choose this widget (factory), which
   *     must include an 'obj' attribute whose value is the object to create a
   *     binding for.
   *   }
   *   @param[aBeforeNode]{
   *     The DOM node to insert the created node ahead of.
   *   }
   *   @param[aElemOverride #:optional String]{
   *     Force a specific element type to be used for the widget.
   *   }
   *   @param[aBaseStyleClass #:optional String]{
   *     Set a specific base style class.
   *   }
   * ]
   * @return[Binding]
   */
  insertBefore: function(aConstraintBasis, aBeforeNode, aParentNode,
                         aElemOverride, aBaseStyleClass) {
    var doc = aParentNode.ownerDocument;

    var newNode = doc.createElement(aElemOverride ||
                                    this.proto.__rootElementType);
    if (aBaseStyleClass)
      newNode.className = aBaseStyleClass;
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
   * @args[
   *   @param[aConstraintBasis]{
   *     The constraint basis evaluated to choose this widget (factory), which
   *     must include an 'obj' attribute whose value is the object to create a
   *     binding for.
   *   }
   *   @param[aNode]{
   *     The DOM node to establish the binding on.
   *   }
   * ]
   * @return[Binding]
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
  popup: function(aConstraintBasis, aPositioner, aRelBinding) {
    var docElem = aRelBinding.domNode.ownerDocument.documentElement;
    var bodyElem = docElem.children[1];
    // Instantiate the new binding with it starting out absolutely positioned.
    // This should allow the widget to be laid out without impacting the rest of
    //  the document so that the positioner can have everything at its disposal.
    var binding = this.appendChild(aConstraintBasis, bodyElem, undefined, true);

    var pos = aPositioner(binding, aRelBinding);
    var domNode = binding.domNode;
    domNode.style.left = pos.left + "px";
    domNode.style.top = pos.top + "px";

    return binding;
  },
};

}); // end require.def
