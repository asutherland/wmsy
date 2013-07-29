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

define("wmsy/wmsy-protofab",
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

// XXX currently defined in wmsy-focus.js
const LISTY = 1, STREAMY = 2;

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
        if ("staticAttrs" in kidMeta) {
          for (var attrName in kidMeta.staticAttrs) {
            node.setAttribute(attrName, kidMeta.staticAttrs[attrName]);
          }
        }

        if (kidMeta.children)
          fabLevel(kidMeta, node);
        // XXX we used to do this before we fab'ed the children and accomplished
        //  it via just setting textContent.  We changed this for the checkbox
        //  binding so that in this new case the text would come after the
        //  actual input node which was our only child.  This is arguably okay
        //  because user-space widgets can't create this ambiguous situation,
        //  although it's very much up for debate whether we should have just
        //  put the text as an explicit sibling of the input node...
        if (kidMeta.textContent)
          node.appendChild(aDoc.createTextNode(kidMeta.textContent));
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
    // Every binding except the top binding is also the child of another widget
    //  and this is reflected in its CSS class.  Since we also have a global
    //  map of all CSS class names in a document, this allows our traversal to
    //  have knowledge of the meta-info of the parent-node before we climb to
    //  it.
    var globalCssClassToStructInfo = this.FOCUS.globalCssClassToStructInfo,
        childBinding, childNode, parentBinding, parentNode;
    for (childBinding = this, childNode = this.domNode;
         !("wmsyTop" in childNode.parentNode);
         childBinding = parentBinding, childNode = parentNode) {
      // - find the parent binding (if any)
      var parentClasses = childNode.getAttribute("class").split(" ");
      // XXX Avoid infinite loop problems by bailing when we would previously
      // have gone into an infinite loop.  The current rationale for just
      // bailing is that ensureVisible can have annoying side-effects anyways
      // and not doing anything is far better than an infinite loop.
      //
      // Specific observed problem: For ArbPL, when clicking on the the object
      // dictionary UI table, we would reliaby go into an infinite loop where
      // something like "loggest--ui-loggest--obj-detail-wild--root" would be
      // encountered and we could keep looping over that node because it has
      // a childStruct.listy of false and a childStruct.path.length of 0.
      //
      // Semantically, what's happening is that we bound something into
      // existence in a stream-like context, so what we need to actually do is
      // perform a DOM traversal until we get up to the next binding we find in
      // the DOM tree to give it a chance to trigger ensureVisible.  In this
      // case we're not doing any clever virtual scrolling, so our end goal
      // would mainly be to end up in platform ensureVisible...
      if (parentClasses.length === 1) {
        return;
      }
      var parentChildClass = parentClasses[parentClasses.length - 1],
          childStruct = globalCssClassToStructInfo[parentChildClass];

      // hop up to the parent...
      parentNode = childNode;
      // listyChilds are the item meta-info; we want the container's info so
      //  walk up.
      if (childStruct.listyChild) {
        childStruct = childStruct.parentMeta;
        // hop up once to get to our container
        parentNode = parentNode.parentNode;

        // if this is a streamy child, there can be 0-many nodes between us
        //  and our actual parent, so we need to climb until we find the
        //  container node as identified by the class in question
        if (childStruct.listy === STREAMY) {
          while (parentNode.className !== childStruct.cssClassName) {
            parentNode = parentNode.parentNode;
          }
        }
      }

      // (the distance from the node to its root is known)
      for (var iHop = childStruct.path.length - 1; iHop >= 0; iHop--) {
        parentNode = parentNode.parentNode;
      }
      parentBinding = parentNode.binding;

      // - check for a usable ensureVisible...
      var evName = childStruct.name + "_ensureVisible";
      if (!(evName in parentBinding))
        continue;

      parentBinding[evName](childBinding, this);
    }
  },

  /**
   * Climb the descendent binding's parents until we reach the binding that is
   *  our immediate child.  If the descendent is already our child, we will
   *  return it without any traversal.
   */
  climbToChildBinding: function(descendentBinding) {
    while (descendentBinding) {
      var parentBinding = descendentBinding.__parentBinding;
      if (parentBinding === this)
        return descendentBinding;
      descendentBinding = parentBinding;
    }
    return null;
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

  /**
   * Convenience magic way to get at the antics singleton for the document for
   *  the domain this widget is defined in.
   */
  get IDSPACE() {
    return this.domNode.ownerDocument.wmsyIdSpaceDomains[this.__domainName];
  },

  /**
   * Convenience magic way to get at the focus manager for the document.
   */
  get FOCUS() {
    return this.domNode.ownerDocument.wmsyFocusManager;
  },

  /**
   * Poorly named helper function to allow us to easily notify the focus manager
   *  or anyone else who cares that we have resized ourselves.
   *
   * This is currently used to allow the fancy focus widget to update its size
   *  and position.
   */
  RESIZED: function() {
    this.domNode.ownerDocument.wmsyFocusManager.bindingResized(this);
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
 *
 * This binding is also involved in click handling, but only by having the
 *  event handling method be explicitly of INPUT elements.  More specifically,
 *  it uses the globalCssClassToStructInfo structure to figure out what's
 *  a binding, and this fake binding is not inserted into that hierarchy.
 */
function FormFieldFakeBinding(domNode, complexKeyBehavior) {
  this.domNode = domNode;
  if (complexKeyBehavior)
    this.__complexKeyBehavior = true;
}
FormFieldFakeBinding.prototype = {
  // form fields must be click-to-focus, it's the way of the world
  __clickToFocus: true,
  // form widgets by definition love the focus ring.
  __focusRing: true,

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
    if (val === aDomain.PARAM)
      this.parameterizedByConstraint.push(key);
  }

  /**
   * Interposed constructors keyed by a string built from the attribute names
   *  and their values.  This is only accessed by the maker so look at that code
   *  (in |makeFactory|) to figure out what we store in there.
   * We create a prototype (and constructor) for each permutation so that it can
   *  have _parameter_* attributes without a per-instance memory cost, although
   *  there may also have been some forward-looking planning for further
   *  optimization through something resembling constant-propagation.
   *
   * This could simply be closed over but I'm hanging it off the instance for
   *  ease of debugging.
   */
  this.parameterizedConstructors = {};

  this.proto = {
    __proto__: WidgetBaseProto,
    __cssClassBaseName: aDomain.name + "--" + aOrigin.name + "--" +
                          aWidgetDef.name + "--",
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

    // We always save the viewslice we are using into sliceAttrName.  In theory,
    //  we don't need to do this if it's an automatic binding and we can get
    //  back to the value at destruction time.  But for simplicity we save
    //  it off whether we create the slice or not.
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
        // - Something we better stringify or explosions!
        else if (typeof(aItem) !== "object" || aItem == null) {
          node = aParentNode.ownerDocument.createTextNode(aItem + "");
          aParentNode.insertBefore(node, aBeforeNode);
          return node;
        }
        // - toDOMNode!
        else if ("toDOMNode" in aItem) {
          node = aItem.toDOMNode(aParentNode.ownerDocument, nestedStreamFab);
          var kids;
          if (Array.isArray(node)) {
            kids = node[1];
            node = node[0];
          }
          aParentNode.insertBefore(node, aBeforeNode);
          if (kids)
            nestedStreamFab(node, kids);
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
                                      // no need to force an element type
                                      null, aChildCssClass).domNode;
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
        return widgetFab.insertBefore(aConstraintBasis, aBeforeNode,
                                      aParentNode,
                                      aElemOverride, aChildCssClass).domNode;
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
        return widgetFab.insertBefore(basis, aBeforeNode,
                                      aParentNode,
                                      aElemOverride, aChildCssClass).domNode;
      };
    }

    // this intentionally clobbers the addWidget setter.
    this.proto[aNodeName + "_set"] = function $_set(aVal, aForce) {
      var domNode = this[elemAttrName];
      // transform nulls into empty lists; it's friendlier than exploding.
      if (aVal == null)
        aVal = [];
      // if we already had a slice, we need to unlink from it
      if (this[sliceAttrName])
        this[sliceAttrName].unlink();
      // this is allowed to either be an array or a viewsplice instance
      if (Array.isArray(aVal)) {
        aVal = new $vs_array.ArrayViewSlice(aVal,
                                            this[sliceListenerAttrName],
                                            this);
      }
      else {
        aVal._listener = this[sliceListenerAttrName];
        aVal.data = this;
      }
      // always save off the slice so we can unlink ourselves at destruction
      this[sliceAttrName] = aVal;
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
                                            // it just wants to know about the
                                            //  binding, so give it that.
                                            // (we can't rely on sliceAttrName)
                                            {data: this},
                                            keepDom, forbidKeepDom);
      if (this[sliceAttrName])
        this[sliceAttrName].unlink();
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
    this.proto.__idspaces = spaceNames;
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
      // "#" => put (en-US) commas in if they aren't already there
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
      // "#.#", "#.##", etc. => fixed number of decimal digits, add commas.
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
    // plural syntax... baseline currently assumes english
    else if (formatter[0] === "*") {
      var bits = formatter.substring(1).split("/");
      if (bits.length != 2)
        throw new Error("English pluralization assumes 2 strings.");
      return function (v) {
        return "" + v + bits[v == 1 ? 0 : 1];
      };
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
   *   @param[aBindAttr BindDef]{
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
    // static string bind
    else if ((aBindAttr instanceof WmsyStructMarker) &&
             aBindAttr.kind == "staticString") {
      this.proto.__updaters.push(function $_updater_implData() {
        return aCall.call(this, aBindAttr.bindAttr);
      });
    }
    // localizable string bind
    else if ((aBindAttr instanceof WmsyStructMarker) &&
             aBindAttr.kind == "localizable") {
      this.proto.__updaters.push(function $_updater_implData() {
        return aCall.call(this, aBindAttr.bindAttr);
      });
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
    // dictAsKeyValueObjs decoration... (we re-dispatch to ourselves...)
    // (We are decorating aCall with the obj->list transformation step.)
    else if ((aBindAttr instanceof WmsyStructMarker) &&
             aBindAttr.kind == "dictAsKeyValueObjs") {
      return this._commonBindUpdate(
        aBindAttr.bindAttr,
        function(obj) {
          var l = [];
          for (var key in obj) {
            l.push({key: key, value: obj[key]});
          }
          return aCall.call(this, l);
        },
        aAlsoInit);
    }
    else if ((aBindAttr instanceof WmsyStructMarker) &&
             aBindAttr.kind == "normalizedStream") {
      // extracted from ArbPL's chew-loggest.js which was using it with a
      //  purpose where we wanted commas between multiple rich objects...
      //  turning that off here but leaving it around...
      var useCommas = false;
      return this._commonBindUpdate(
        aBindAttr.bindAttr,
        function(arr) {
          var out = [], needSpace = false, maybeNeedComma = false;
          for (var i = 0; i < arr.length; i++) {
            var bit = arr[i];
            if (typeof(bit) === "string") {
              maybeNeedComma = false;

              // -- If we need whitespace coming into the string...
              if (needSpace) {
                // - kill the need if the left-side doesn't need space
                switch (bit[0]) {
                  // no whitespace needed for the inside of groupy things
                  case ")":
                  case "}":
                  case "]":
                  // no whitespace needed for the left-side of delimiters
                  case ":":
                  case ";":
                  case ",":
                  // if it already has white-space...
                  case " ":
                    needSpace = false;
                    break;
                }
                // - prepend the space if still needed
                if (needSpace)
                  bit = " " + bit;
              }

              // -- Check if we need to set the whitespace flag going out.
              // Only need whitespace if something is coming after us.
              // (and it must be a named reference because we require it.)
              if (i + 1 < arr.length) {
                var lastChar = bit[bit.length - 1];
                switch (lastChar) {
                  // no whitespace for the inside of groupy things
                  case "(":
                  case "{":
                  case "[":
                  // if it already has white-space...
                  case " ":
                    break;

                  // and for everything else, we do want white-space.
                  // (esp. for the right-side of delimiters: comma/colon/semi-colon)
                  default:
                    bit = bit + " ";
                    break;
                }
              }
              needSpace = false;
              out.push(bit);
            }
            else {
              if (useCommas && maybeNeedComma)
                out.push(", ");

              out.push(bit);

              maybeNeedComma = true;
              needSpace = true;
            }
          }
          return aCall.call(this, out);
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
   *
   * @args[
   *   @param[aNodeName String]{
   *     The name of the structure node whose DOM element we care about.
   *   }
   *   @param[aBindText BindDef]{
   *     The binding definition to use to set the textContent on the node.
   *   }
   *   @param[aBindDOMAttrs @dictof[@key["attr name"] @value[BindDef]]]
   *   @param[aFormatter #:optional]
   *   @param[aBindJSAttrs]{
   *     JS/IDL attributes to set on the DOM node.  Introduced for the HTML
   *     checkbox input element since its DOM attribute for "checked" is dumb
   *     and annoying in that its presence is the boolean rather than its
   *     value.
   *   }
   * ]
   */
  addBinding: function(aNodeName, aBindText, aBindDOMAttrs, aFormatter,
                       aBindJSAttrs) {
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
    if (aBindDOMAttrs) {
      // because we don't have 'let' we need a function to introduce a closure
      //  to latch the attr name.
      var dis = this;
      function bindDOMAttr(latchedAttrName, attrSource) {
        dis._commonBindUpdate(attrSource, function(val) {
          var domNode = this[elemAttrName];
          domNode.setAttribute(latchedAttrName, val);
        });
      };
      for (var attrName in aBindDOMAttrs) {
        bindDOMAttr(attrName, aBindDOMAttrs[attrName]);
      }
    }
    if (aBindJSAttrs) {
      // because we don't have 'let' we need a function to introduce a closure
      //  to latch the attr name.
      var dis = this;
      function bindJSAttr(latchedAttrName, attrSource) {
        dis._commonBindUpdate(attrSource, function(val) {
          var domNode = this[elemAttrName];
          domNode[latchedAttrName] = val;
        });
      };
      for (var attrName in aBindJSAttrs) {
        bindJSAttr(attrName, aBindJSAttrs[attrName]);
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
                     aConstraintBasis, aPositioning, aSizing,
                     aClickAway,
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

    // -- size processing
    var size_calc;
    if (aSizing) {
      size_calc = function size_calc(aBinding, aRelBinding) {
        var sizes = {width: null, height: null,
                     maxWidth: null, maxHeight: null};
        var win = aRelBinding.domNode.ownerDocument.defaultView;

        if ("width" in aSizing) {
          if (typeof(aSizing.width) === "number")
            sizes.width = Math.floor(aSizing.width * win.innerWidth) + "px";
          else
            sizes.width = aSizing.width;
        }
        if ("height" in aSizing) {
          if (typeof(aSizing.height === "number"))
            sizes.height = Math.floor(aSizing.height * win.innerHeight) + "px";
          else
            sizes.height = aSizing.height;
        }
        // just propagate maximums for now and let the layout logic figure out
        //  if we told it a height bigger than maxHeight, etc.
        if ("maxWidth" in aSizing) {
          if (typeof(aSizing.maxWidth) === "number")
            sizes.maxWidth =
                Math.floor(aSizing.maxWidth * win.innerWidth) + "px";
          else
            sizes.maxWidth = aSizing.maxWidth;
        }
        if ("maxHeight" in aSizing) {
          if (typeof(aSizing.maxHeight === "number"))
            sizes.maxHeight =
                Math.floor(aSizing.maxHeight * win.innerHeight) + "px";
          else
            sizes.maxHeight = aSizing.maxHeight;
        }

        return sizes;
      };
    }

    // -- popup_$
    this.proto["popup_" + aPopupName] = function popup_$(aObj, aRelBinding,
                                                         aCallback,
                                                         aExplicitParent) {

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

      var pwBinding = pwFab.popup(aPopupConstraint, pos_calc, size_calc,
                                  aRelBinding, aExplicitParent);
      var popupNode = pwBinding.domNode;
      focusManager.popupActive(pwBinding);

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
                if (binding.__relay.hasOwnProperty(emitName)) {
                  var receiverListName = "__receivers_" + emitName;
                  this[receiverListName] = binding[receiverListName];
                  emitNames.splice(i, 1); // check it off our list
                  if (!emitNames.length) { // done with emitters?
                    emitNames = null;
                    // bail if there are no receivers too...
                    if (!receiveNames)
                      return;
                  }
                }
              }
            }
            // - emitter seeking receiver
            if (emitNames && ("__receive" in binding)) {
              for (i = emitNames.length - 1; i >= 0; i--) {
                emitName = emitNames[i];
                if (binding.__receive.hasOwnProperty(emitName)) {
                  this["__receivers_" + emitName].push(binding);
                  emitNames.splice(i, 1); // check it off our list
                  if (!emitNames.length) { // done with emitters?
                    emitNames = null;
                    // bail if there are no receivers too...
                    if (!receiveNames)
                      return;
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
                  if (!receiveNames.length) { // done with receivers?
                    receiveNames = null;
                    // bail if there are no emitters too...
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
   *   @param[aShowFocusRing Boolean]
   * ]
   */
  makeFocusable: function(aClickToFocus, aShowFocusRing) {
    if (aClickToFocus)
      this.proto.__clickToFocus = true;

    this.proto.__focusEnabled = true;
    this.proto.__focusEnable = HelperMethods.focusEnable;
    this.proto.__focusRing = aShowFocusRing;

    this.proto.__defineGetter__("focused", function _get_focused() {
      return this.domNode.hasAttribute("wmsy-focused");
    });

    this.proto.focus = function focus() {
      var focusManager = this.domNode.ownerDocument.wmsyFocusManager;
      focusManager.focusBinding(this);
    };

    // XXX might be better to just do this as DOM node manipulation using
    //  aSetValues or similar mechanism.
    this.proto.__initers.push(function _create_make_focusable() {
      this.tabIndex = -1;
    });

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
   *  factory/maker function and hand it and our prototype off to a freshly
   *  created WidgetFactory.
   */
  makeFactory: function() {
    var realConstructor;
    if ("constructor" in this.widgetDef)
      realConstructor = this.widgetDef.constructor;

    var maker;
    // -- not parameterized: simple constructor
    if (this.parameterizedByConstraint.length == 0) {
      var constructor = function constructor_simple(aConstraintBasis, aDomNode) {
        if ("obj" in aConstraintBasis)
          this.obj = aConstraintBasis.obj;
        else
          this.obj = null;
        if (realConstructor)
          realConstructor.call(this, aConstraintBasis, aDomNode);
      };
      this.proto.constructor = constructor;
      constructor.displayName = this.domain.name + "-" + this.origin.name +
                                  "-" + this.widgetDef.name + "-constructor";
      constructor.prototype = this.proto;
      maker = function maker_simple(aConstraintBasis, aDomNode) {
        return new constructor(aConstraintBasis, aDomNode);
      };
    }
    // -- yes, parameterized:
    else {
      var parameterAttributes = this.parameterizedByConstraint;
      var constructorCache = this.parameterizedConstructors;
      var baseProto = this.proto;
      var protoConstructor = ("protoConstructor" in this.widgetDef) ?
                               this.widgetDef.protoConstructor : null;
      var triplePrefix = this.domain.name + "-" + this.origin.name + "-" +
                               this.widgetDef.name;
      maker = function maker_parameterized(aConstraintBasis, aDomNode) {
        var protoKey = "", iParam;
        for (iParam = 0; iParam < parameterAttributes.length; iParam++) {
          var paramAttr = parameterAttributes[iParam];
          var paramVal = aConstraintBasis[paramAttr];
          // Complex objects need to be stringified so we can tell them apart.
          //  Otherwise they end up like: [object Object] which is not useful in
          //  helping us differentiate between things.
          // XXX this is maybe expensivish
          if ((paramVal != null) && (typeof(paramVal) === "object") &&
              !Array.isArray(paramVal) &&
              paramVal.__proto__ === Object.prototype)
            paramVal = JSON.stringify(paramVal);
          protoKey += paramAttr + ":" + paramVal + ";";
        }
        var constructor, proto;
        if (!constructorCache.hasOwnProperty(protoKey)) {
          proto = {
            __proto__: baseProto,
          };
          for (iParam = 0; iParam < parameterAttributes.length; iParam++) {
            var paramAttr = parameterAttributes[iParam];
            proto["__parameter_" + paramAttr] = aConstraintBasis[paramAttr];
          }
          if (protoConstructor)
            protoConstructor.call(proto, aConstraintBasis, aDomNode);
          constructor = function(aConstraintBasis, aDomNode) {
            if ("obj" in aConstraintBasis)
              this.obj = aConstraintBasis.obj;
            else
              this.obj = null;
            if (realConstructor)
              realConstructor.call(this, aConstraintBasis, aDomNode);
          };
          proto.constructor = constructor;
          proto.__constraint = aConstraintBasis;
          constructor.displayName =  triplePrefix + "-constructor";
          constructor.prototype = proto;
          constructorCache[protoKey] = constructor;
        }
        else {
          constructor = constructorCache[protoKey];
        }
        return new constructor(aConstraintBasis, aDomNode);
      };
    }

    return new WidgetFactory(maker, this.proto,
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
function WidgetFactory(aMaker, aPrototype, aDomain, aExportDomainQName) {
  this.makeAnInstance = aMaker;
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
    var binding = this.makeAnInstance(aConstraintBasis, aNode);
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
   *
   * @typedef[SizingOutput @dict[
   *   @key[width #:optional CSSString]
   *   @key[maxWidth #:optional CSSString]
   *   @key[height #:optional CSSString]
   *   @key[maxHeight #:optional CSSString]
   * ]]
   *
   * @args[
   *   @param[aConstraintBasis ConstraintBasis]
   *   @param[aPositioner @func[
   *     @args[
   *       @param[binding WmsyBinding]{
   *         The popup binding being positioned.
   *       }
   *       @param[relBinding WmsyBinding]{
   *         The binding the popup is being positioned in relation to.
   *       }
   *       @param[explicitSizing #:optional SizingOutput]{
   *         The output of the sizing function (when used) which may in turn
   *         have been augmented by the __sized helper on the widget.
   *       }
   *     ]
   *     @return[@dict[
   *       @key[left Number]{
   *         Left offset from the edge of the body tag in pixels.
   *       }
   *       @key[top Number]{
   *         Top offset from the top of the body tag in pixels.
   *       }
   *     ]]
   *   ]]
   *   @param[aSizer #:optional @func[
   *     @args[
   *       @param[binding WmsyBinding]{
   *         The popup binding being positioned.
   *       }
   *       @param[relBinding WmsyBinding]{
   *         The binding the popup is being positioned in relation to.
   *       }
   *     ]
   *     @return[SizingOutput]
   *   ]]{
   *     Logic to suggest a size for the popup.  This is invoked prior to the
   *     positioning logic.
   *   }
   *   @param[aRelBinding WmsyBinding]{
   *     The binding the popup is being positioned in relation to.
   *   }
   *   @param[aExplicitParent #:optional]{
   *     The binding to use as a parent for this binding.  If omitted (and
   *     therefore undefined), we treat `aRelBinding` as our parent binding.
   *     If null, we do not specify an indirect parent binding.  If a non-null
   *     value, we set that to be the indirect parent binding.
   *   }
   * ]
   */
  popup: function(aConstraintBasis, aPositioner, aSizer, aRelBinding,
                  aExplicitParent) {
    var doc = aRelBinding.domNode.ownerDocument;
    var bodyElem = doc.body;
    // Instantiate the new binding with it starting out absolutely positioned.
    // This should allow the widget to be laid out without impacting the rest of
    //  the document so that the positioner can have everything at its disposal.
    var extra;
    if (aExplicitParent === undefined)
      extra = {__indirectParentBinding: aRelBinding};
    else if (aExplicitParent === null)
      extra = null;
    else
      extra = {__indirectParentBinding: aExplicitParent};
    var binding = this.appendChild(
                    aConstraintBasis, bodyElem, undefined, true,
                    extra);

    var domNode = binding.domNode;

    // -- sizing
    var sizing = null;
    if (aSizer) {
      sizing = aSizer(binding, aRelBinding);
      if (sizing.maxWidth)
        domNode.style.maxWidth = sizing.maxWidth;
      if (sizing.width)
        domNode.style.width = sizing.width;
      if (sizing.maxHeight)
        domNode.style.maxHeight = sizing.maxHeight;
      if (sizing.height)
        domNode.style.height = sizing.height;
      if ("__sized" in binding)
        binding.__sized(sizing); // it has a chance to mutate sizing too...
    }

    // -- positioning
    var pos = aPositioner(binding, aRelBinding, sizing);
    domNode.style.left = pos.left + "px";
    domNode.style.top = pos.top + "px";

    if ("__positioned" in binding)
      binding.__positioned();

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

}); // end define
