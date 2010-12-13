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
    "wmsy/wmsy-syntax",
    "wmsy/viewslice-array",
    "wmsy/dom-geom",
    "wmsy/exploders",
    "exports"
  ],
  function(
    wmsySyntax,
    $vs_array,
    domgeom,
    $exploders,
    exports
  ) {

var WmsyStructMarker = wmsySyntax.WmsyStructMarker,
    WmsyObjDecorator = wmsySyntax.WmsyObjDecorator,
    WmsyFocusMarker = wmsySyntax.WmsyFocusMarker;

var SELF = null;
var NONE = undefined;

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
   * An alternate binding to use as a binding's parent.  For use by pop-ups
   *  that are rooted at the top of the tree but want to pretend that they
   *  live under the node that spawned them for context purposes.
   *
   * XXX This may have some unintentional focus handling fallout.
   */
  __indirectParentBinding: null,

  /**
   * Internal helper to find the parent binding of this binding.  Currently
   *  not public because this really only should be used for event-dispatching
   *  type things.  If user code wants to do something like this then either
   *  they are doing something wrong or we have failed them.
   */
  get __parentBinding() {
    if (this.__indirectParentBinding)
      return this.__indirectParentBinding;
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
  __destroy: function wbp___destroy(keepDom, forbidKeepDom) {
    var destructors = this.__destructors;
    for (var i = 0; i < destructors.length; i++) {
      destructors[i].call(this, keepDom, forbidKeepDom);
    }
    this.domNode.binding = null;
  },

  toString: function() {
    return "[wmsy:" + this.__cssClassBaseName + "]";
  },

  /**
   * Make sure this binding is as visible as possible on the screen.  This is
   *  done by walking up to the wmsy top bound node and at every layer seeing if
   *  the DOM node is scrolly.  If it is (scrolly), provides a
   *  blah_ensureVisible, and we came out of a dom node that was a binding, then
   *  we call the blah_ensureVisible function.  We then continue on our merry
   *  journey to the top.
   *
   * This does not need to be the world's fastest process because we do not
   *  expect to be called all that often.  (We should usually be the result
   *  of a one-off user action.)
   */
  ensureVisible: function wbp_ensureVisible() {
    var curNode, lastNode;
    for (curNode = this.domNode, lastNode = curNode;
         curNode && (!("wmsyTop" in curNode));
         lastNode = curNode, curNode = curNode.parentNode) {

      // We used to check and fast-path based on scrollHeight versus
      //  clientHeight, but that does not work for things like the virtual
      //  list widget, so no more fast path.

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
        throw $exploders.missingStructMeta(curNode, curClass);

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

  /**
   * Convenience magic way to get at the antics singleton for the document for
   *  the domain this widget is defined in.
   */
  get ANTICS() {
    return this.domNode.ownerDocument.wmsyAnticsDomains[this.__domainName];
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
 * Pretends to be a proper binding for the purposes of focus logic, but is not.
 * This gets hooked up by makeFormFieldFocusable which also takes care of the
 *  destroy life-cycle issues.
 */
function FormFieldFakeBinding(domNode, complexKeyBehavior) {
  this.domNode = domNode;
  if (complexKeyBehavior)
    this.__complexKeyBehavior = true;
}
FormFieldFakeBinding.prototype = {
  // form fields must be click-to-focus, it's the way of the world
  __clickToFocus: true,

  __structMap: {
    root: {
      firstFocusable: undefined,
    }
  },

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
   * Derive our focus enabled state from our parent.
   */
  get __focusEnabled() {
    return this.__parentBinding.__focusEnabled;
  },
  __focusEnable: function() {
    throw $exploders.formFieldNoFocusEnable(this);
  },
  get focused() {
    return this.domNode.hasAttribute("wmsy-focused");
  },
  focus: function() {
    console.log("trying to focus input box");
    var focusManager = this.domNode.ownerDocument.wmsyFocusManager;
    focusManager.focusBinding(this);
  },
  ensureVisible: function() {
    // we are not a standalone semantic entity; make sure our owner is visible
    //  instead.
    this.__parentBinding.ensureVisible();
  },

  /**
   * Only invoked if __complexKeyBehavior is true.  When true, wmsy's key
   *  navigation logic defers to us before doing anything.
   *
   * If we return true, wmsy handles the event, if we return false, wmsy
   *  doesn't.  It's on us to preventDefault if we return false.
   */
  __handleComplexKeyBehavior: function __handleComplexKeyBehavior(event) {
    var domNode = this.domNode;
    // handle outright if there is nothing entered right now
    if (!domNode.value.length)
      return true;
    // do not handle if it was a left-arrow and we are not at the left yet
    if (event.keyCode == 37 && domNode.selectionStart)
      return false;
    // do not handle if it was a right-arrow and we are not at the right yet
    if (event.keyCode == 39 && domNode.selectionStart < domNode.value.length)
      return false;
    // otherwise handle it
    return true;
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
    __domainName: aDomain.name,
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

  //////////////////////////////////////////////////////////////////////////////
  // Widget Binding

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
      // Failure to resolve is okay if this is not a bound widget and the
      //  value we were provided is null.
      if (widgetFab === null && aBindAttr === undefined && aVal === null)
        widgetFab = NullWidgetFactory;
      // Explicitly complain on failure to evaluate to something.
      if (widgetFab === null)
        throw $exploders.failedWidgetResolution(domNode, aConstraintBasis);
      // Detect and fail on a self-recursive binding; likely a sign of a
      //  subwidget gone awry.
      if (this.obj === aVal && widgetFab === this.__factory__)
        throw $exploders.selfRecursiveBinding(this, aNodeName);

      if ("binding" in domNode) {
        var binding = domNode.binding;
        // if we're just going to end up re-binding the same widget type to the
        //  same object, turn this into an update() call...
        if (widgetFab === binding.__factory__ &&
            binding.obj === aVal && !aForce) {
          binding.update();
          return binding;
        }
        binding.destroy(false, false);
        return widgetFab.replaceBindOnto(aConstraintBasis, domNode);
      }
      return widgetFab.bindOnto(aConstraintBasis, domNode);
    };

    // Don't add a destructor if we are just helping out addWidgetList; it will
    //  add its own.
    if (!aIsListReuse) {
      this.proto.__destructors.push(function $_destroy(keepDom, forbidKeepDom) {
        var domNode = this[elemAttrName];
        // if not auto-bound there may be no binding on that dom node, so check.
        if (aBindAttr !== undefined ||
            (("binding" in domNode) && domNode.binding))
          domNode.binding.destroy(keepDom, forbidKeepDom);
      });
    }

    if (aBindAttr !== undefined) {
      this._commonBindUpdate(aBindAttr, function $_bindUpdate(obj) {
        return this[setterAttrName](obj);
      });
    }
  },

  addWidgetList: function(aNodeName, aConstraintBasis, aSeparator,
                          aElemOverride, aChildCssClass,
                          aVertical, aDomain, aDecorated, aIsStream) {
    // Create the attribute on the prototype so we can assume the attribute
    //  always exists even if it is never actually used for a widget.  (It
    //  will only be set on widgetlists where focus is ever set.  The
    //  actual resource and performance impact of this is unclear; we may be
    //  fooling ourselves or making things worse...)
    this.proto[aNodeName + "_lastFocused"] = null;

    var elemAttrName = aNodeName + "_element";
    var partialAttrName = "__" + aNodeName + "_partial";
    var partial = this.proto[partialAttrName];

    // If we create an array view slice, we cram it in sliceAttrName for the
    //  widget code.  If a view slice was exposed to us directly then there is
    //  no need to name it.
    var sliceAttrName = aNodeName + "_slice";
    var sliceListenerAttrName = "__" + aNodeName + "_sliceListener";
    var dataAttrName = aNodeName + "_data";

    var fabBefore, viewDecoratorConstructor;
    // - Stream!
    // Insert strings and objects with a toDOMNode into the DOM directly;
    //  widget fab everything else.
    if (aIsStream) {
      // helper function for toDOMNode to let it recursively invoke our logic.
      var nestedStreamFab = function(parentNode, kids) {
        for (var i = 0; i < kids.length; i++) {
          fabBefore(kids[i], null, parentNode);
        }
      };
      fabBefore = function(aItem, aBeforeNode, aParentNode, aElemOverride) {
        var node;
        // - String!
        if (typeof(aItem) === "string") {
          node = aParentNode.ownerDocument.createTextNode(aItem);
          aParentNode.insertBefore(node, aBeforeNode);
          return node;
        }
        // - toDOMNode!
        else if ("toDOMNode" in aItem) {
          node = aItem.toDOMNode(aParentNode.ownerDocument, nestedStreamFab);
          aParentNode.insertBefore(node, aBeforeNode);
          return node;
        }
        // - widget time!
        aConstraintBasis.obj = aItem;
        var widgetFab = partial.evaluate(aConstraintBasis);
        if (!widgetFab) {
          throw $exploders.failedWidgetResolution(aParentNode,
                                                  aConstraintBasis);
        }
        return widgetFab.insertBefore(aConstraintBasis, aBeforeNode,
                                      aParentNode,
                                      aElemOverride, aChildCssClass).domNode;
      };
    }
    // - Undecorated widget list/flow
    else if (!aDecorated) {
      fabBefore = function(aItem, aBeforeNode, aParentNode, aElemOverride) {
        aConstraintBasis.obj = aItem;
        var widgetFab = partial.evaluate(aConstraintBasis);
        if (!widgetFab) {
          throw $exploders.failedWidgetResolution(aParentNode,
                                                  aConstraintBasis);
        }
        widgetFab.insertBefore(aConstraintBasis, aBeforeNode, aParentNode,
                               aElemOverride, aChildCssClass);
      };
    }
    // - Decorate widget list/flow
    // decorated view slices need custom logic to:
    // 1) use the alternate constraint for synthetic items.  We allow this to
    //     vary using fabFromItem which we conditionalize below.
    // 2) wrap the underlying view slice.  We just have the _set logic do
    //     some extra legwork right now with an if.
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
          throw $exploders.failedWidgetResolution(aParentNode, basis);
        }
        widgetFab.insertBefore(basis, aBeforeNode, aParentNode, aElemOverride);
      };
    }

    // this intentionally clobbers the addWidget setter.
    this.proto[aNodeName + "_set"] = function $_set(aVal, aForce) {
      var domNode = this[elemAttrName];
      // transform nulls into empty lists; it's friendlier than exploding.
      if (aVal == null)
        aVal = [];
      // this is allowed to either be an array or a viewsplice instance
      if (Array.isArray(aVal)) {
        aVal = new $vs_array.ArrayViewSlice(aVal,
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

    this.proto[aNodeName + "_findById"] = function $_findById(aIdSpace, aId) {
      var domNode = this[elemAttrName];
      var idDomains = domNode.ownerDocument.wmsyIdSpaceDomains[aDomain.name];
      var extractor = idDomains.getBindingExtractor(aIdSpace);
      var kid = domNode.firstChild;
      while (kid) {
        if (!kid.hasAttribute("wmsy-antic") &&
            ("binding" in kid) && kid.binding) {
          if (extractor(kid.binding.obj) === aId)
            return kid.binding;
        }
        kid = kid.nextSibling;
      }
      return null;
    };

    this.proto.__destructors.push(function(keepDom, forbidKeepDom) {
      this[sliceListenerAttrName].didSplice(0, undefined, undefined,
                                            false, false,
                                            this[sliceAttrName],
                                            keepDom, forbidKeepDom);
    });

    this.proto[sliceListenerAttrName] = {
      didSeek: function $_sliceListener_didSeek(aItems, aMoreExpected, aSlice) {
        // Trigger a splice that deletes everything we know about and replaces
        //  it with what we're being told about.
        this.didSplice(0, undefined, aItems, true, false, aSlice);
      },

      didSplice: function $_sliceListener_splice(aIndex, aHowMany, aItems,
                                                 aRequested, aMoreExpected,
                                                 aSlice,
                                                 keepDom, forbidKeepDom) {
        // We use childNodes rather than children because it tells us about
        //  text children (which streams can create!)
        var dis = aSlice.data;
        var domNode = dis[elemAttrName], nextKidNode, curKidNode;
        if (aIndex < 0) {
          if (aSeparator)
            aIndex = aIndex * 2 + (domNode.childNodes.length + 1);
          else
            aIndex += domNode.childNodes.length;
        }
        // -- remove bit
        // (we figure out what to remove from our own DOM tree)
        if (aHowMany === undefined || aHowMany > 0) {
          var toKill;
          if (aHowMany) {
            toKill = aHowMany;
          }
          else {
            toKill = aSeparator ? ((domNode.childNodes.length || -1) + 1) / 2 :
              domNode.childNodes.length;
            toKill -= aIndex;
          }
          nextKidNode = domNode.childNodes[aSeparator ? (aIndex * 2) : aIndex];
          while (toKill-- && nextKidNode) {
            // just ignore destroyed bindings that are being animated out of
            //  existence
            while (("hasAttribute" in nextKidNode) &&
                   nextKidNode.hasAttribute("wmsy-antic")) {
              nextKidNode = nextKidNode.nextSibling;
              if (!nextKidNode)
                break;
            }
            if (!nextKidNode)
              break;

            var localKeepDom = keepDom;
            // (if a DOM node doesn't have a binding, don't kill it; streams.)
            if (("binding" in nextKidNode) && nextKidNode.binding) {
              localKeepDom = nextKidNode.binding.destroy(keepDom,
                                                         forbidKeepDom) ||
                             keepDom;
            }
            // Remove a separator if appropriate.
            if (aSeparator) {
              if (nextKidNode.nextSibling)
                domNode.removeChild(nextKidNode.nextSibling);
              else if (nextKidNode.previousSibling)
              domNode.removeChild(nextKidNode.previousSibling);
            }
            curKidNode = nextKidNode;
            nextKidNode = nextKidNode.nextSibling;
            if (localKeepDom)
              curKidNode.setAttribute("wmsy-antic", "true");
            else
              domNode.removeChild(curKidNode);
          }
        }
        else {
          if (aIndex < domNode.childNodes.length)
            nextKidNode = domNode.childNodes[aSeparator ? (aIndex * 2) : aIndex];
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
        // (skip DOM nodes without bindings)
        var rval = ("binding" in domNode) ? aCallback(domNode.binding) : false;
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

  //////////////////////////////////////////////////////////////////////////////
  // Object Identity

  /**
   * Hookup one or more id-spaces by adding an initializer and replacing the
   *  destructor with an id-space aware destructor.  We replace the destructor
   *  because we want antics to be able to convey to us via its id-space
   *  watching hook that we should not destroy our DOM tree.  This results in
   *  us calling all destruction functions with a flag to convey this and
   *  return that value to the caller of destroy as well.  It does not try
   *  and make sense to generalize the destructor item protocol to allow us
   *  to implement this as a destructor item.
   */
  hookupIdSpaces: function(domainName, spaceNames) {
    this.proto.__initers.unshift(function $_registerBinding() {
      for (var i = 0; i < spaceNames.length; i++) {
        this.domNode.ownerDocument.wmsyIdSpaceDomains[domainName]
          .registerBinding(spaceNames[i], this);
      }
    });
    this.proto.__destroy = function idspace__destroy(keepDom,
                                                     forbidKeepDom) {
      var i;
      var idUniverse =
        this.domNode.ownerDocument.wmsyIdSpaceDomains[domainName];
      for (i = 0; i < spaceNames.length; i++) {
        if (idUniverse.unregisterBinding(spaceNames[i], this, forbidKeepDom))
          keepDom = true;
      }

      // the regular...
      var destructors = this.__destructors;
      for (i = 0; i < destructors.length; i++) {
        destructors[i].call(this, keepDom, forbidKeepDom);
      }
      this.domNode.binding = null;

      return keepDom;
    };
    // if destroy wasn't already overridden, update the default impl too...
    if (this.proto.destroy === WidgetBaseProto.__destroy)
      this.proto.destroy = this.proto.__destroy;
  },

  //////////////////////////////////////////////////////////////////////////////
  // String Formatting

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
      throw $exploders.badFormatterSpec(formatter);

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
    throw $exploders.badFormatterSpec(formatter);
  },

  //////////////////////////////////////////////////////////////////////////////
  // Binding

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
        throw $exploders.badComputedBindName(this, aBindAttr);
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
    // impldata bind
    else if ((aBindAttr instanceof WmsyStructMarker) &&
             aBindAttr.kind == "implData") {
      this.proto.__updaters.push(function $_updater_implData() {
        return aCall.call(this, this[aBindAttr.bindAttr]);
      });
    }
    // dictAsList decoration... (we re-dispatch to ourselves...)
    // (We are decorating aCall with the obj->list transformation step.)
    else if ((aBindAttr instanceof WmsyStructMarker) &&
             aBindAttr.kind == "dictAsList") {
      return this._commonBindUpdate(
        aBindAttr.bindAttr,
        function(obj) {
          var l = [];
          for (var key in obj) {
            l.push(obj[key]);
          }
          return aCall.call(this, l);
        },
        aAlsoInit);
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
          // no one benefits from us exploding; just return null.
          if (val == null)
            break;
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

  //////////////////////////////////////////////////////////////////////////////

  /**
   * For a popup we need to end up with a widget that is the popup and the
   *  widget that is the content that gets shown in the popup.
   */
  addPopup: function(aPopupName,
                     aPopupConstraint, aPopupDomain,
                     aConstraintBasis, aPositioning, aClickAway,
                     aCenterOnFocus) {
    var widgetPartialAttrName = "__popup" + aPopupName + "_widget_partial";
    var partialAttrName = "__popup" + aPopupName + "_contents_partial";


    this.proto[widgetPartialAttrName] =
      aPopupDomain.dtree.partialEvaluate(aPopupConstraint);

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

      var pwPartial = this[widgetPartialAttrName];
      var pwObj = {
        constraint: aConstraintBasis,
        widgetFactory: widgetFab,
        obj: aObj,
      };
      aPopupConstraint.obj = pwObj;
      var pwFab = pwPartial.evaluate(aPopupConstraint);

      var focusManager = this.domNode.ownerDocument.wmsyFocusManager;
      focusManager.pushPopup();

      var pwBinding = pwFab.popup(aPopupConstraint, pos_calc, aRelBinding);
      var popupNode = pwBinding.domNode;
      focusManager.activePopup = pwBinding;

      var payloadBinding = pwBinding.payloadBinding;

      var docElem = popupNode.ownerDocument.documentElement;

      // create the click-away listener if desired
      if (aClickAway) {
        var clickAwayListener = function clickAwayListener(aEvent) {
          // bail if we find the root of our popup...
          var node = aEvent.target;
          while (node != null) {
            if (node == popupNode)
              return true;
            node = node.parentNode;
          }
          // (the user did not click inside the popup, kill the popup)
          payloadBinding.done(false, aEvent.target);
          return true;
        };
        docElem.addEventListener("click", clickAwayListener, true);
      }

      // poke the 'done' method into the instantiated binding...
      payloadBinding.done = function popup_$_done() {
        pwBinding.destroy();
        pwBinding.domNode.parentNode.removeChild(pwBinding.domNode);
        docElem.removeEventListener("click", clickAwayListener, true);
        focusManager.popPopup();

        if (aCallback)
          aCallback.apply(null, arguments);
      };

      return payloadBinding;
    };
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

  //////////////////////////////////////////////////////////////////////////////
  // Context

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
   * Create a __context getter that asks our __parentBinding, if we have one,
   *  for its context.  This used to do its own DOM traversal but we now
   *  do the recursive thing so that __parentBinding can handle indirect
   *  parent bindings.  We do not believe the recursion poses a major danger
   *  to the stack.
   */
  makeContextPassthrough: function() {
    this.proto.__defineGetter__("__context", function _context_getter() {
      var parentBinding = this.__parentBinding;
      if (parentBinding)
        return parentBinding.__context;
      return null;
    });
  },

  //////////////////////////////////////////////////////////////////////////////
  // Emit / Receive

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
   *  potential for a widget to end up hooked to both ancestors and descendents
   *  for the same signal.  This is an outgrowth of an inherent ambiguity in
   *  our emit/receive specification.  We're expecting it's generally fine but
   *  will eventually bite someone badly.
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

            // if this binding has an indirect parent, follow it instead of
            //  the DOM tree
            if (binding.__indirectParentBinding) {
              curNode = binding.__indirectParentBinding.domNode;
              continue;
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

  //////////////////////////////////////////////////////////////////////////////
  // Focus

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
      // Do not null out the __focusDomain, as it helps descendents be aware
      //  that they are part of a dead focus domain.  (It gets marked !alive).
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
   * Cause the form-field to be focusable by establishing a fake-ish apparent
   *  binding on it.
   */
  makeFormFieldFocusable: function(aNodeName, aIsTextField) {
    var elemAttrName = aNodeName + "_element";
    this.proto.__initers.push(function _init_focusable_form_field() {
      var elem = this[elemAttrName];
      elem.binding = new FormFieldFakeBinding(elem, aIsTextField);
    });
    this.proto.__destructors.push(function _destroy_focusable_form_field() {
      var elem = this[elemAttrName];
      if (elem.hasAttribute("wmsy-focused")) {
        var focusManager = elem.ownerDocument.wmsyFocusManager;
        focusManager.focusedBindingBeingDestroyed(elem.binding);
      }
    });
  },

  //////////////////////////////////////////////////////////////////////////////

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
      constructor = function constructor_simple(aConstraintBasis, aDomNode) {
        if ("obj" in aConstraintBasis)
          this.obj = aConstraintBasis.obj;
        else
          this.obj = null;
        if (realConstructor)
          realConstructor.call(this, aConstraintBasis, aDomNode);
      };
    }
    else {
      var parameterAttributes = this.parameterizedByConstraint;
      var protoCache = this.parameterizedProtos;
      var baseProto = this.proto;
      var protoConstructor = ("protoConstructor" in this.widgetDef) ?
                               this.widgetDef.protoConstructor : null;
      constructor = function constructor_parameterized(aConstraintBasis,
                                                       aDomNode) {
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
            protoConstructor.call(proto, aConstraintBasis, aDomNode);
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

    return new WidgetFactory(constructor, this.proto,
                             this.domain, this.origin.qname);
  }
};
exports.WidgetProtoFab = WidgetProtoFab;

/**
 * A widget factory is responsible for creating a widget instance and inserting
 *  in into the document tree.
 *
 * We need to make sure that we insert the CSS rules for each domain in each
 *  document.  We want to be quick about checking this.  We currently accomplish
 *  this by creating a 'wmsyInsertedDomains' expando attribute on the document
 *  that tracks whether we have done so.  We used to do this with a widget
 *  granularity, but that results in a lot of style nodes and could have
 *  performance impact if it causes restyling each time.
 */
function WidgetFactory(aConstructor, aPrototype, aDomain, aExportDomainQName) {
  this.constructor = aConstructor;
  this.proto = aPrototype;
  this.proto.__factory__ = this;
  /**
   * The domain the widget belongs to.  We are adding this for style binding
   *  purposes.  We need to be able to know the widget's domain's name and to
   *  get at the domain to perform the CSS injection.
   */
  this.domain = aDomain;
  this.exportDomainQName = aExportDomainQName;
}
WidgetFactory.prototype = {
  toString: function() {
    return "[WidgetFactory: " + this.proto.__cssClassBaseName + "]";
  },

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
   *   @param[aSetValues #:optional]
   * ]
   * @return[Binding]{
   *   The JS binding.
   * }
   */
  appendChild: function(aConstraintBasis, aParentNode, aElemOverride,
                        aMakePopup, aSetValues) {
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
    return this.bindOnto(aConstraintBasis, newNode, aSetValues);
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
   *     The DOM node to establish the binding on.  This node must already be
   *     bound into a document; it can't just be floating in space.
   *   }
   *   @param[aSetValues #:optional]{
   *     A dictionary of attributes to push onto the binding prior to any
   *     initializers are invoked.  Created to allow popups to have an explicit
   *     __indirectParentBinding forced onto them since popups are rooted
   *     outside the traditional dom tree and so won't see their actual parent
   *     binding.
   *   }
   * ]
   * @return[Binding]
   */
  bindOnto: function(aConstraintBasis, aNode, aSetValues) {
    var doc = aNode.ownerDocument;
    var binding = new this.constructor(aConstraintBasis, aNode);
    var proto = this.proto;
    var frag = proto.__fabFragment(doc);
    var wmsyInsertedDomains = doc.wmsyInsertedExportDomains;

    // We need to make sure the domain's CSS has been injected into the
    //  document...
    if (!(this.exportDomainQName in wmsyInsertedDomains)) {
      this.domain.attachExportDomainToDocument(this.exportDomainQName,
                                               binding.__domainName, doc);
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

    if (aSetValues) {
      for (var key in aSetValues)
        binding[key] = aSetValues[key];
    }

    if ("preInit" in binding)
      binding.preInit();
    if (binding.__initers.length){
      var initers = binding.__initers;
      for (var i = 0; i < initers.length; i++) {
        initers[i].call(binding);
      }
    }
    if ("postInit" in binding)
      binding.postInit();
    binding.update();
    if ("postInitUpdate" in binding)
      binding.postInitUpdate();
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
    var binding = this.appendChild(
                    aConstraintBasis, bodyElem, undefined, true,
                    {__indirectParentBinding: aRelBinding});

    var pos = aPositioner(binding, aRelBinding);
    var domNode = binding.domNode;
    domNode.style.left = pos.left + "px";
    domNode.style.top = pos.top + "px";

    return binding;
  },
};

/**
 * Create a widget factory that replaces a binding with an empty div.  This
 *  is used to allow us to set some bindings to null to destroy what was there
 *  without having to create a magic empty binding for every case.
 */
var NullWidgetFactory = new WidgetFactory(null, {}, null, null);
NullWidgetFactory.bindOnto = function() {};

}); // end require.def
