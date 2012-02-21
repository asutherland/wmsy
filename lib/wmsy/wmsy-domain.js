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

define(
  [
    "wmsy/decision-space",
    "wmsy/wmsy-syntax",
    "wmsy/viewslice-interpose",
    "wmsy/wmsy-focus",
    "wmsy/wmsy-protofab",
    "wmsy/wmsy-style",
    "wmsy/wmsy-antics",
    "wmsy/wmsy-idspace",
    "wmsy/exploders",
    "exports",
    "require"
  ],
  function(
    mod_decisionspace,
    syntax,
    $vs_interpose,
    wmsy_focus,
    wmsy_protofab,
    $style,
    $antics,
    $idspace,
    $exploders,
    exports,
    require
  ) {

var DecisionSpace = mod_decisionspace.DecisionSpace;

var WmsyStructMarker = syntax.WmsyStructMarker,
    WmsyObjDecorator = syntax.WmsyObjDecorator,
    WmsyFocusMarker = syntax.WmsyFocusMarker;

function resolveViewSliceDecorator(kind) {
  if (kind === "interposing") {
    return $vs_interpose.DecoratingInterposingViewSlice;
  }
  else {
    throw $exploders.badViewSliceDecoratorKind(decorMarker);
  }
}
exports.resolveViewSliceDecorator = resolveViewSliceDecorator;

const FocusManager = wmsy_focus.FocusManager,
      WidgetProtoFab = wmsy_protofab.WidgetProtoFab,
      LISTY = wmsy_focus.LISTY, STREAMY = wmsy_focus.STREAMY;

/**
 * Clone an object.
 */
function deepSimpleClone(aObj) {
  var oot = {};
  for (var key in aObj) {
    var val = aObj[key];
    if (val != null && (typeof(val) === "object"))
      oot[key] = deepSimpleClone(val);
    else
      oot[key] = val;
  }
  return oot;
}
exports.deepSimpleClone = deepSimpleClone;

/**
 * Provide a default set of priorities that enforce our current structuring
 *  idiom.
 *
 * I am providing these right now because I have a "subwidget" definition that
 *  is losing out to an "obj.type" decision which was chosen to be an earlier
 *  decision because it has a much greater fan-out.  Perhaps these should
 *  actually get colon prefixes or something to convey their newfound magicness?
 */
var DEFAULT_DSPACE_PRIORITIES = [
  "type",
  "subwidget",
];

function WmsyDomain(aName, aLibDomain, aGlobalCssClassToStructInfo) {
  this.name = aName;
  this.dtree = new DecisionSpace(DEFAULT_DSPACE_PRIORITIES);
  this.WILD = this.dtree.WILD;
  this.PARAM = this.dtree.WILD2;

  /**
   * The wmsy domain that libWidget should refer to.  This currently must be
   *  the wmsy widget library.  Not very extensible.
   */
  this._libDomain = aLibDomain;

  this._styleBundle = new $style.WmsyStyleBundle();

  this.idSpaceDefs = {};

  /**
   * A WmsyDomain-local dictionary mapping the CSS classes created by this
   *  domain to their structure info objects.
   */
  this.cssClassToStructInfo = {};
  /**
   * A reference to the global dictionary that maps all wmsy-generated CSS
   *  classes to their structure info.
   */
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

  //////////////////////////////////////////////////////////////////////////////
  // Structure Processing

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
   * @lxref{_structureChew} recursive helper; processes each node seen.
   *
   * @args[
   *   @param[aSMap]{
   *     The structure map being populated.  This is a flattened meta-info
   *     structure derived from walking the hierarchy.  This is the value that
   *     @lxref{_structureChew} returns.
   *   }
   *   @param[aKey]{
   *     The key that names this node.
   *   }
   *   @param[aValue]{
   *     The value that goes with the key.
   *   }
   *   @param[aPath @listof["offset" Number]]{
   *     The numeric offset path to get to the provided value.
   *   }
   *   @param[aProtoFab WidgetProtoFab]{
   *     The proto fab for this widget.
   *   }
   *   @param[aWidgetDef]{
   *     The root widget definition; currently used for subwidget support.
   *   }
   *   @param[aStructMapExtra]{
   *     Extra meta-data to mix-in to the structure map definition.
   *     Speculatively introduced to support the virtual container lib widget.
   *   }
   *   @param[aParentMeta]{
   *     The structure map meta-data for our parent in the nested structure
   *     hierarchy.
   *   }
   * ]
   */
  __structureChewNode: function(aSMap, aKey, aValue, aPath, aProtoFab,
                                aWidgetDef, aStructMapExtra, aParentMeta) {
    var kdata = aSMap[aKey] = {listy: false};
    kdata.name = aKey;
    kdata.path = aPath;
    kdata.listyChild = false;
    kdata.cssClassName = aProtoFab.proto.__cssClassBaseName + aKey;
    kdata.textContent = null;
    kdata.elementType = null;
    var softElementType = "div", hardElementType = null;

    // hyperlink is a light-weight object decorator that we just immediately
    //  unbox.
    if ((aValue instanceof WmsyObjDecorator) &&
        aValue.kind == "hyperlink") {
      hardElementType = "a";
      kdata.subElementType = "span";
      aProtoFab.addBinding(aKey, undefined, aValue.attrs);
      aValue = aValue.obj;
    }

    // Localizable string.
    if (typeof(aValue) == "string") {
      if (!kdata.elementType)
        kdata.elementType = "span";
      kdata.children = null;
      kdata.textContent = aValue;
    }
    // helper tagged things
    else if (aValue instanceof WmsyStructMarker) {
      if (aValue.kind == "widget") {
        aProtoFab.addWidget(aKey, aValue.args, aValue.bindAttr,
                            aValue.opts.domain);
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
               aValue.kind == "widgetlist" ||
               aValue.kind == "stream") {
        kdata.listy = (aValue.kind === "stream") ? STREAMY : LISTY;
        kdata.listVertical = aValue.opts.vertical;

        if (aValue.kind != "widgetlist")
          kdata.elementType = kdata.subElementType = "span";
        else
          kdata.elementType = kdata.subElementType = "div";

        kdata.subElementCssClass = kdata.cssClassName + "-item";

        var separator = ("separator" in aValue.opts) ?
                          aValue.opts.separator : null;

        // decorated view slice?
        var decorMarker, constraintBasis;
        if (aValue.args instanceof WmsyStructMarker) {
          decorMarker = aValue.args.args;
          decorMarker.constructor = resolveViewSliceDecorator(decorMarker.kind);
          constraintBasis = decorMarker.normalConstraint;
        }
        else {
          constraintBasis = aValue.args;
        }

        aProtoFab.addWidget(aKey, aValue.args, aValue.bindAttr,
                            aValue.opts.domain, true);
        aProtoFab.addWidgetList(aKey, constraintBasis, separator,
                                null /* was: kdata.subElementType */,
                                kdata.subElementCssClass,
                                kdata.listVertical, aValue.opts.domain,
                                decorMarker,
                                aValue.kind == "stream");
      }
      else if (aValue.kind == "bind") {
        kdata.elementType = "span";
        aProtoFab.addBinding(aKey, aValue.bindAttr, aValue.args,
                             aValue.opts.formatter);
      }
      else if (aValue.kind == "computed") {
        kdata.elementType = "span";
        // _commonBindUpdate understands "computed" struct markers (since it may
        // also be used as an attribute value with the limitation that you can't
        // in turn try and put more attributes on that), so just pass it
        // through.  It also extracts the formatter via this route, so we do not
        // need to pass it (although the "bind" case does need to!)
        aProtoFab.addBinding(aKey, aValue, aValue.args);
      }
      else if (aValue.kind == "bindImage") {
        kdata.elementType = "img";
        aProtoFab.addBinding(aKey, undefined, aValue.args);
      }
      // XXX form input elements
      else if (aValue.kind == "button") {
        kdata.elementType = "input";
        kdata.children = null;
        kdata.formField = "button";
        kdata.staticAttrs = {
          type: "button",
          value: aValue.bindAttr,
          tabIndex: "-1",
        };
      }
      else if (aValue.kind == "checkbox") {
        // checkboxes want to be: <label> <input type=checkbox> blah </label>
        // to this end, we:
        // - rename kdata to have a fake name
        // - introduce a synthetic child that we bestow our name on to be the
        //    actual input node.
        kdata.elementType = "label";
        kdata.textContent = aValue.bindAttr;

        var fakeKey = aKey + "__label";
        aSMap[fakeKey] = kdata;
        kdata.name = fakeKey;
        kdata.cssClassName = aProtoFab.proto.__cssClassBaseName + fakeKey;

        var syndata = aSMap[aKey] = {listy: false};
        syndata.name = aKey;
        syndata.path = aPath.concat([0]);
        syndata.listyChild = false;
        syndata.cssClassName = aProtoFab.proto.__cssClassBaseName + aKey;
        syndata.textContent = null;
        syndata.elementType = "input";
        syndata.formField = "checkbox";
        syndata.staticAttrs = {
          type: "checkbox",
          tabIndex: "-1",
        };
        // opts holds static attributes to copy
        for (var key in aValue.opts) {
          syndata.staticAttrs[key] = aValue.opts[key];
        }

        kdata.children = [syndata];
        aProtoFab.addBinding(aKey, undefined, undefined, undefined,
                             aValue.args);

        // mess with aPath so it refers to our synthetic node
        aPath = syndata.path;
      }
      else if (aValue.kind === "text" ||
               aValue.kind === "password") {
        kdata.elementType = "input";
        kdata.children = null;
        kdata.formField = "text";
        kdata.staticAttrs = {
          type: aValue.kind,
          tabIndex: "-1",
        };
        // opts holds static attributes to copy
        for (var key in aValue.opts) {
          kdata.staticAttrs[key] = aValue.opts[key];
        }
        // (no textContent; wmsy-syntax already put the value binding into args)
        aProtoFab.addBinding(aKey, undefined, aValue.args);
      }
      else if (aValue.kind === "textarea") {
        kdata.elementType = "textarea";
        kdata.children = null;
        kdata.formField = "text";
        kdata.staticAttrs = {
          tabIndex: "-1",
        };
        // opts holds static attributes to copy
        for (var key in aValue.opts) {
          syndata.staticAttrs[key] = aValue.opts[key];
        }
        aProtoFab.addBinding(aKey, aValue.bindAttr, aValue.args);
      }
    }
    // sub-object, possibly decorated; may be richer localizable string in the
    //  future too.
    else {
      // If it's a decorator, set things up then pierce the decorator.
      if (aValue instanceof WmsyObjDecorator) {
        if (aValue.kind == "flow") {
          softElementType = "span";
          kdata.subElementType = "span";
          aProtoFab.addBinding(aKey, undefined, aValue.attrs);
        }
        else if (aValue.kind == "block") {
          // (kind semantics are unchanged from defaults)
          aProtoFab.addBinding(aKey, undefined, aValue.attrs);
        }
        else {
          throw $exploders.badWmsyObjDecoratorKind(aValue);
        }
        // escape the decorator
        aValue = aValue.obj;
      }

      kdata.children = [];

      var iNodeThisLevel = 0, subKey;

      // is this an anonymous list of things, presumably an l10n clumping?
      if (Array.isArray(aValue)) {
        softElementType = "span";
        kdata.subElementType = "span";
        for (; iNodeThisLevel < aValue.length; iNodeThisLevel++) {
          var subValue = aValue[iNodeThisLevel];
          var kidPath = aPath.concat();
          kidPath.push(iNodeThisLevel);
          // give them dumb anonymous names...
          subKey = aKey + iNodeThisLevel;
          kdata.children.push(this.__structureChewNode(
                                aSMap, subKey, subValue, kidPath, aProtoFab,
                                aWidgetDef, aStructMapExtra, kdata));
        }
      }
      else {
        for (subKey in aValue) {
          var subValue = aValue[subKey];
          var kidPath = aPath.concat();
          kidPath.push(iNodeThisLevel);
          kdata.children.push(this.__structureChewNode(
                                aSMap, subKey, subValue, kidPath, aProtoFab,
                                aWidgetDef, aStructMapExtra, kdata));
          iNodeThisLevel++;
        }
      }
    }

    if (hardElementType) {
      kdata.elementType = hardElementType;
    }
    else if (!kdata.elementType) {
      if (aParentMeta && ("subElementType" in aParentMeta))
        kdata.elementType = aParentMeta.subElementType;
      else
        kdata.elementType = softElementType;
    }

    // mix-in any extra data.
    if (aStructMapExtra && (aKey in aStructMapExtra)) {
      var structExtra = aStructMapExtra[aKey];
      for (var extraKey in structExtra) {
        kdata[extraKey] = structExtra[extraKey];
      }
    }

    // We do this after the logic above to allow sketchy logic such as the
    //  checkbox logic to retarget the provided name to synthetic nodes.
    aProtoFab.addElement(aKey, aPath);

    return kdata;
  },


  //////////////////////////////////////////////////////////////////////////////
  // Object Identity

  defineIdSpace: function(spaceName, idExtractor) {
    this.idSpaceDefs[spaceName] =
      new $idspace.IdSpaceDefinition(spaceName, idExtractor);
  },

  //////////////////////////////////////////////////////////////////////////////
  // Context

  /**
   * The provideContext def is a shallow object full of bind references.
   */
  _contextChew: function(aContextDef, aProtoFab) {
    if (!aContextDef)
      aProtoFab.makeContextPassthrough();
    else // create a context obj on this dude with updaters
      aProtoFab.makeContextProvider(aContextDef);
  },

  //////////////////////////////////////////////////////////////////////////////
  // Styling

  newExportDomainWithCSS: function(exportName, lessCssBlob) {
    this._styleBundle.newExportDomainWithCSS(this.name, exportName,
                                             lessCssBlob);
  },

  //@documentedOn[WmsyExportDomain]
  defineStyleBase: function(name, lessCssBlob) {
    this._styleBundle.defineStyleBase(name, lessCssBlob);
  },

  //@documentedOn[WmsyExportDomain]
  defineRawCss: function(qname, name, cssBlob) {
    return this._styleBundle.defineRawCss(qname, name, cssBlob);
  },

  //@documentedOn[WmsyExportDomain]
  referenceExternalStylesheet: function(exportDomainQName, path) {
    this._styleBundle.referenceExternalStylesheet(exportDomainQName,
                                                  path);
  },

  //////////////////////////////////////////////////////////////////////////////
  // Packaging

  setPackageBaseRelPath: function(relPath) {
    this._styleBundle.setPackageBaseRelPath(relPath);
  },

  //////////////////////////////////////////////////////////////////////////////

  /**
   * Process one or more popup definitions, creating a popup_NAME method on the
   *  prototype for each popup.  The definition must include a constraint and
   *  may also include some additional option flags.  The popup_NAME method will
   *  take the object
   */
  _popupsChew: function(aPopupDefs, aProtoFab) {
    for (var popupName in aPopupDefs) {
      var popupDef = aPopupDefs[popupName];
      // XXX make this default to the simple popup via libWidget if omitted
      if (!("popupWidget" in popupDef))
        throw $exploders.popupNeedsPopupWidget(popupDef, popupName);
      if (!("constraint" in popupDef))
        throw $exploders.popupNeedsConstraint(popupDef, popupName);

      var popupWidget = popupDef.popupWidget;
      if (!(popupWidget instanceof WmsyStructMarker))
        throw $exploders.popupBadPopupWidget(popupName);

      var widgetDomain = (popupWidget.kind === "libwidget") ?
                           this._libDomain : this;

      aProtoFab.addPopup(popupName,
        popupWidget.args, widgetDomain,
        popupDef.constraint,
        popupDef.position,
        ("size" in popupDef) ? popupDef.size : null,
        ("clickAway" in popupDef) ? popupDef.clickAway : false,
        ("centerOnFocus" in popupDef) ? popupDef.centerOnFocus : false);
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
    var i, receiveNames = null;
    if (aEmitDef) {
      for (i = 0; i < aEmitDef.length; i++) {
        var emitName = aEmitDef[i];
        aProtoFab.addEmitter(emitName);
      }
    }

    if (aReceiveDef) {
      receiveNames = [];
      for (var receiveName in aReceiveDef) {
        var receiveFunc = aReceiveDef[receiveName];
        receiveNames.push(receiveName);
        aProtoFab.addReceiver(receiveName, receiveFunc);
      }
    }

    // relays are totally handled below...

    aProtoFab.makeRendezvousLogic(aRelayDef, aEmitDef, receiveNames);
  },

  //////////////////////////////////////////////////////////////////////////////
  // Focus Processing

  /**
   * Process the "focus" entry in the widget definition.
   */
  _focusChew: function(aFocusDef, aStructMap, aProtoFab, aOrigin, aWidgetDef) {
    if (!(aFocusDef instanceof WmsyFocusMarker))
      throw $exploders.badFocusValue(aFocusDef);

    // -- item
    if (aFocusDef.kind == "item") {
      aProtoFab.makeFocusable(aOrigin.clickToFocus, aOrigin.showFocusRing);
      return;
    }
    // (nested items are focusable containers)
    if (aFocusDef.kind == "nested")
      aProtoFab.makeFocusable(aOrigin.clickToFocus, aOrigin.showFocusRing);

    if (aFocusDef.kind == "domain") {
      aProtoFab.makeFocusDomain();
      // add an "focusChanged" emit
      // XXX this is perhaps not the cleanest thing to do but it does save
      //  us a lot of specialized mechanics.  There is likely some in-between
      //  available to us, though...
      if (!("emit" in aWidgetDef))
        aWidgetDef.emit = [];
      if (aWidgetDef.emit.indexOf("focusChanged") == -1)
        aWidgetDef.emit.push("focusChanged");
    }
    aProtoFab.makeFocusContainer();

    // -- container
    if (!aFocusDef.kidNames || !aFocusDef.kidNames.length)
      throw $exploders.focusDefMissingChildren(aFocusDef);

    // - update each struct map to have the prev/next linkage for focus stuff...
    var kidNames = aFocusDef.kidNames, kidStruct;
    var lastStruct = null;
    var rootStruct = aStructMap.root;
    rootStruct.navVertical = aFocusDef.vertical;
    for (var i = 0; i < kidNames.length; i++) {
      if (!(kidNames[i] in aStructMap)) {
        throw $exploders.focusDefNoSuchChild(aWidgetDef, aFocusDef,
                                             kidNames[i]);
      }
      kidStruct = aStructMap[kidNames[i]];
      if (i == 0)
        rootStruct.firstFocusable = kidStruct;
      else
        lastStruct.nextFocusable = kidStruct;
      kidStruct.navVertical = aFocusDef.vertical;
      kidStruct.prevFocusable = lastStruct;

      // cause the form fields to be focusable...
      if (("formField" in kidStruct) && kidStruct.formField) {
        aProtoFab.makeFormFieldFocusable(kidStruct.name,
                                         kidStruct.formField == "text");
      }

      lastStruct = kidStruct;
    }
    kidStruct.nextFocusable = null;
    rootStruct.lastFocusable = lastStruct;

    if (aFocusDef.kind == "nested") {
      rootStruct.nextFocusable = rootStruct.firstFocusable;
      rootStruct.nextFocusable.prevFocusable = rootStruct;
      rootStruct.firstFocusable = rootStruct;
    }
  },

  //////////////////////////////////////////////////////////////////////////////
  // Widget Definition

  /**
   * The process of compiling a widget goes like this:
   * - Traverse the provided structure, building up a document fragment and
   *    retrieval offset information.
   * -
   *
   * @args[
   *   @param[aOrigin]{
   *     Who is defining this widget?
   *   }
   *   @param[aWidgetDef WidgetDef]{
   *     The widget definition
   *   }
   * ]
   */
  defineWidget: function(aOrigin, aWidgetDef) {
    // -- constraint
    // - sanity check constraint
    if (!("constraint" in aWidgetDef) || !aWidgetDef.constraint) {
      throw $exploders.widgetDefMissingConstraint(aWidgetDef);
    }
    var anyConstraints = false;
    for (var ckey in aWidgetDef.constraint) {
      anyConstraints = true;
      break;
    }
    if (!anyConstraints)
      throw $exploders.widgetDefEmptyConstraint(aWidgetDef);

    // -- name
    // it is very important there be no spaces in the widget name.
    aWidgetDef.name = aWidgetDef.name.replace(" ", "_", "g")
                                     .replace(":", "_", "g");
//console.log("WIDGET DEF: " + aWidgetDef.name);

    var protoFab = new WidgetProtoFab(this, aOrigin, aWidgetDef);
    // -- impl
    // This needs to happen before structure processing because "computed"
    //  bindings will refer to functions defined by impl.
    if ("impl" in aWidgetDef)
      protoFab.contribute(aWidgetDef.impl);

    // -- structure
    var structureMap = this._structureChew(
      aWidgetDef.structure, protoFab, aWidgetDef,
      ("_structureMapExtra" in aWidgetDef) ? aWidgetDef._structureMapExtra
                                           : null
    );
    protoFab.proto.__structMap = structureMap;
    protoFab.proto.__rootCssClassName = structureMap.root.cssClassName;
    protoFab.proto.__rootElementType = structureMap.root.elementType;
    protoFab.proto.__rootTextContent = structureMap.root.textContent;

    var cssClassToStructInfo = protoFab.proto.__cssClassToStructInfo = {};
    var domainCssClassToStructInfo = this.cssClassToStructInfo;
    var globalCssClassToStructInfo = this.globalCssClassToStructInfo;

    for (var key in structureMap) {
      var meta = structureMap[key];
      cssClassToStructInfo[meta.cssClassName] = meta;
      domainCssClassToStructInfo[meta.cssClassName] = meta;
      globalCssClassToStructInfo[meta.cssClassName] = meta;
      // Create a meta-entry for the "-item" css class variant for listy
      //  nodes.  This is used by focus-handling logic.
      if (meta.listy && ("subElementCssClass" in meta)) {
        var itemMeta = {
          listyChild: meta.listy,
          parentMeta: meta,
        };
        cssClassToStructInfo[meta.subElementCssClass] = itemMeta;
        domainCssClassToStructInfo[meta.subElementCssClass] = itemMeta;
        globalCssClassToStructInfo[meta.subElementCssClass] = itemMeta;
      }
    }

    // -- context
    this._contextChew(("provideContext" in aWidgetDef) ?
                        aWidgetDef.provideContext : null,
                      protoFab);

    // -- style
    protoFab.proto.__flattenedCssString = this._styleBundle.styleChew(
      aWidgetDef.name,
      ("style" in aWidgetDef) ? aWidgetDef.style : null,
      protoFab.proto.__cssClassBaseName,
      aOrigin.qname);


    // -- events
    if ("events" in aWidgetDef)
      this._eventsChew(aWidgetDef.events, structureMap);

    // -- focus
    // This needs to come before rendezvous because we twiddle the emit
    //  list for focus domains and want that to take effect.
    if ("focus" in aWidgetDef)
      this._focusChew(aWidgetDef.focus, structureMap, protoFab, aOrigin,
                      aWidgetDef);

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

    // -- popups
    if ("popups" in aWidgetDef)
      this._popupsChew(aWidgetDef.popups, protoFab);

    // -- identity
    // (We want last at-bat because we force ourselves to be first in the
    //  initialization and destruction phases and this helps us ensure others
    //  don't meddle by not giving them a chance.)
    if ("idspaces" in aWidgetDef)
      protoFab.hookupIdSpaces(this.name, aWidgetDef.idspaces);


    var widgetFactory = protoFab.makeFactory();
    this.dtree.addPossibility(aWidgetDef.constraint, widgetFactory);

    this.dtree.build();
//console.log("  END WIDGET DEF: " + aWidgetDef.name);
  },

  undefineWidget: function(aWidgetDef) {

    this.dtree.removePossibility(aWidgetDef);
//console.log("REMOVED WIDGET, REBUILDING");
    this.dtree.build();
//console.log("  REBUILT");
  },

  //////////////////////////////////////////////////////////////////////////////
  // Document Binding

  /**
   * Attach an export domain to a document.  Currently this just means injecting
   *  CSS.  This method is only called by the widget fab when its check
   *  of doc.wmsyInsertedExportDomains fails.
   */
  attachExportDomainToDocument: function(exportDomainQName, domainName, doc) {
    // re-firing suppression
    var wmsyInsertedExportDomains = doc.wmsyInsertedExportDomains;
    wmsyInsertedExportDomains[exportDomainQName] = true;

    // - styling
    this._styleBundle.bindIntoDocument(exportDomainQName, doc);

    // - id registry (if the domain has not yet been bound in)
    if (!(domainName in doc.wmsyIdSpaceDomains)) {
      doc.wmsyIdSpaceDomains[domainName] =
        new $idspace.IdSpaceDocRegistry(this.getDomain(domainName).idSpaceDefs);
    }

    // - antics (if the domain has not yet been bound)
    if (!(domainName in doc.wmsyAnticsDomains)) {
      doc.wmsyAnticsDomains[domainName] =
        new $antics.AnticsDocDomainInstance(doc,
                                            doc.wmsyIdSpaceDomains[domainName]);
    }
  },

  /**
   * Find a widget appropriate to the constraint (with object if applicable) and
   *  append the widget to the dom element.
   *
   * @args[
   *   @param[aConstraintWithObj]{
   *     The constraint which should include the object being bound (in the
   *     common case where there is an object being bound.)
   *   }
   *   @param[aDomElem]{
   *     The DOM element to append the widget binding to.
   *   }
   *   @param[aExtra #:optional @dict[
   *     @key[popup #:optional @dict[
   *       @key[position @dict[
   *         @key[left Number]{
   *           Left pixel offset of the pop-up in viewport relative coordinates.
   *         }
   *         @key[top Number]{
   *           Top pixel offset of the pop-up in viewport relative coordinates.
   *         }
   *       ]]{
   *         Static positioning of the pop-up relative to the viewport.
   *         Although the pop-up will be absolutely positioned, it makes no
   *         sense to have it placed somewhere that can't be seen, so we
   *         automatically add the existing scroll coordinates to your values
   *         so you don't have to.
   *       }
   *     ]]{
   *       Bind the widget as a pop-up; if at all possible, you should instead
   *       define a widget that defines a popup and use that mechanism instead.
   *
   *       Since popups need extra positioning (and possibly sizing)
   *       information, this must be explicitly sized.
   *     }
   *   ]]{
   *     Extra parameters for special tricks like binding the widget as a popup.
   *   }
   * ]
   * @return{
   *   The widget binding.
   * }
   */
  bindObjectIntoNode: function(aConstraintWithObj, aDomElem, aExtra) {
    // make sure the document has been initialized for wmsy!
    var doc = aDomElem.ownerDocument;
    if (!("wmsyInsertedExportDomains" in doc)) {
      // - export domain binding tracking
      // track inserted export domains to know when we need to inject more CSS
      doc.wmsyInsertedExportDomains = {};

      // - focus manager, 1 for all domains
      doc.wmsyFocusManager =
        new FocusManager(doc, this.globalCssClassToStructInfo);

      // - id space instances, 1 per domain, create container, don't bind
      doc.wmsyIdSpaceDomains = {};

      // - antics instances, 1 per domain, create container, don't bind
      doc.wmsyAnticsDomains = {};

      // - fancy focus widget instantiation
      var focusConstraint = {type: "focus-ring", obj: {}};
      var focusFab = this._libDomain.dtree.evaluate(focusConstraint);
      doc.wmsyFocusManager.fancyFocusWidget =
        focusFab.appendChild(focusConstraint, doc.body);

      // expose debugging, but only on demand.
      var self = this;
      doc.wmsyDebugUI = function() {
        console.log("requiring the debugui app");
        require(["wmsy/debugui/app"], function (app) {
          console.log("kicking off debug ui");
          app.showDebugUIForDomain(doc, self);
        });
      };
    }

    var widgetFab = this.dtree.evaluate(aConstraintWithObj);
    var binding;
    if (aExtra && ("popup" in aExtra)) {
      if (!("position" in aExtra.popup) ||
          !("top" in aExtra.popup.position) ||
          !("left" in aExtra.popup.position))
        throw $exploders.bindingExplicitPopupLacksPosition(aExtra.popup);
      function positioner() {
        var docWin = doc.defaultView;
        // relativize position provided to us to the viewport
        return {
          left: aExtra.popup.position.left + docWin.scrollX,
          top: aExtra.popup.position.top + docWin.scrollY
        };
      }
      // The popup method needs the rel binding to figure out the document, so
      //  even though it's not really a binding, pretend we have one so we can
      //  propagate this info.
      var fakeRelBinding = {
        domNode: aDomElem,
      };
      binding = widgetFab.popup(aConstraintWithObj, positioner,
                                null, // no explicit sizing
                                fakeRelBinding,
                                null); // no indirect binding
    }
    else {
      binding = widgetFab.appendChild(aConstraintWithObj, aDomElem);
    }

    return binding;
  },

  //////////////////////////////////////////////////////////////////////////////
  // Event Handling

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
        throw $exploders.badEventNodeReference(nodeName);

      var structMeta = aStructMap[nodeName];
      for (var eventName in handlers) {
        var eventHandler = handlers[eventName];
        structMeta["on_" + eventName] = eventHandler;
      }
    }
  },

  /**
   * Just hard-code a list of supported events right now, though we should
   *  perhaps just add listeners as needed? XXX
   *
   * I've taken out mousemove because it was for hover stuff that none of
   *  our current app stuff does.
   */
  SUPPORTED_EVENTS: ["click", "DOMMouseScroll", "mousewheel",
                     "mousedown", "mouseup"], // "mousemove",
  /**
   * Hookup event handling for the given root element.
   */
  bindEventsOnRoot: function(aRootElem) {
    // do not bind events if this element or any of its ancestors already has
    //  events bound.
    for (var curNode = aRootElem; curNode; curNode = curNode.parentNode) {
      if ("_wmsyBound" in curNode)
        return;
    }
    aRootElem._wmsyBound = true;

    var dis = this;
    var handler = function(aEvent) {
                    return dis._handleEvent(aEvent, aEvent.target,
                                            "on_" + aEvent.type,
                                            (aEvent.type == "click") ?
                                              "on_command" : undefined);
                  };

    for (var i = 0; i < this.SUPPORTED_EVENTS.length; i++) {
      aRootElem.addEventListener(this.SUPPORTED_EVENTS[i], handler, false);
    }

    var keyNavHandler = function(aEvent) {
      return dis._handleKeyNavigationEvent(aEvent);
    };

    aRootElem.ownerDocument.addEventListener("keydown", keyNavHandler, false);
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
//console.log("KEY EVENT!", aEvent.keyCode);
    if (aEvent.keyCode != 13 && aEvent.keyCode != 27 &&
        (aEvent.keyCode < 37 || aEvent.keyCode > 40))
      return true;

    var focusManager = aEvent.target.ownerDocument.wmsyFocusManager;
    var focusedBinding = focusManager.focusedBinding;

    if (focusedBinding &&
        ("__complexKeyBehavior" in focusedBinding) &&
        focusedBinding.__complexKeyBehavior) {
      var shouldHandle = focusedBinding.__handleComplexKeyBehavior(aEvent);
      if (!shouldHandle)
        return false;
    }

    switch (aEvent.keyCode) {
      // -- ENTER
      case 13:
        if (focusedBinding)
          this._handleEvent(aEvent, focusedBinding.domNode, "on_enter_key",
                            "on_command");
        break;
      // -- ESCAPE
      case 27:
        if (focusManager.activePopup)
          focusManager.activePopup.done(false);
        break;
      // -- UP
      case 38:
        focusManager.navigate(true, -1);
        break;
      // -- DOWN
      case 40:
        focusManager.navigate(true, 1);
        break;
      // -- LEFT
      case 37:
        focusManager.navigate(false, -1);
        break;
      // -- RIGHT
      case 39:
        focusManager.navigate(false, 1);
        break;

      default:
          // otherwise let it be handled normally
          return false;
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
  _handleEvent: function(aEvent, aTarget, aHandlerName, aSecondaryHandlerName) {
    var i;
    if (aEvent.type in this.BS_EVENT_TRANSFORMS) {
      aEvent = this.BS_EVENT_TRANSFORMS[aEvent.type](aEvent);
      aHandlerName = "on_" + aEvent.type;
    }

    // If the user clicked on a proper hyperlink (with an href), then leave it
    //  to the browser to handle.
    if (aTarget.tagName == "A" &&
        aTarget.hasAttribute("href") &&
        aHandlerName == "on_click") {
      return false;
    }

    // Note if this is a click and we just focused the widget as a result of the
    //  click so logic can be clever and ignore clicks on itself that were
    //  just focusing it.
    var justFocused = null;

    // - Form field click-to-focus handling.
    if (aHandlerName === "on_click" &&
        aTarget.tagName == "INPUT" &&
        aTarget.binding && aTarget.binding.__clickToFocus) {
      aTarget.binding.focus();
      justFocused = aTarget.binding;
    }

    // find and latch the most specific binding...
    var targetBinding = null;
    for (var curNode = aTarget; curNode && (!("wmsyTop" in curNode));
           curNode = curNode.parentNode) {
      // skip nodes without a class attribute; text nodes can't, some don't
      if ((curNode.nodeType == 3) || !curNode.hasAttribute("class"))
        continue;

      // ignore things that are flying antic clones
      if (curNode.hasAttribute("wmsy-antic"))
        return true;

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

          // - should we click-to-focus?
          // (needs to be focusable and be click to focus)
          if (aHandlerName === "on_click" && !justFocused) {
            // Walk upwards until we find an ancestor that is focusable or a
            //  focus domain and see if it is click-to-focus (if focusable).
            //  If it is, focus.  The rationale is that we want to effect click
            //  to focus logic before handling any event handlers (which may
            //  happen 'below' the focusable element.)
            var candBinding = targetBinding;
            while (candBinding) {
              if ("focused" in candBinding) {
                // focus it if it wants to focus on click and it's not already
                //  focused.
                if (("__clickToFocus" in candBinding) &&
                    candBinding.__clickToFocus &&
                    !candBinding.focused) {
                  candBinding.focus();
                  aEvent.preventDefault();
                  justFocused = candBinding;
                }
                break;
              }
              else if ("__focusDomain" in candBinding) {
                break;
              }
              candBinding = candBinding.__parentBinding;
            }
          }
        }

        // keep looking if it has no handler
        if (!(aHandlerName in structInfo) &&
            (!aSecondaryHandlerName || !(aSecondaryHandlerName in structInfo)))
          continue;

        // figure out the binding it belongs to so we can give it the right this
        var bindingRootNode = curNode;
        for (i=structInfo.path.length; i > 0; i--)
          bindingRootNode = bindingRootNode.parentNode;

        var rval;
        if (aHandlerName in structInfo)
          rval = structInfo[aHandlerName].call(bindingRootNode.binding,
                                               targetBinding,
                                               aEvent,
                                               justFocused);
        else if (aSecondaryHandlerName && (aSecondaryHandlerName in structInfo))
          structInfo[aSecondaryHandlerName].call(
            rval = bindingRootNode.binding, targetBinding, aEvent, justFocused);

        return rval;
      }
    }
  },
  //////////////////////////////////////////////////////////////////////////////
};
exports.RawWmsyDomain = WmsyDomain;

}); // end define
