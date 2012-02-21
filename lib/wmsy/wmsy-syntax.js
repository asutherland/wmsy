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

define(
  [
    "exports",
  ],
  function(
    exports
  ) {

/**
 * Clone an object by tricking JSON into doing it for us.  This only works if
 *  everyone is a primitive.
 */
function deepSimpleClone(aObj) {
  return JSON.parse(JSON.stringify(aObj));
}

/**
 * A simple meta-data holding class used by the various sugaring helper
 *  functions on WmsyExportDomain.
 *
 * @args[
 *   @param[aKind String]{
 *     A string tag.
 *   }
 *   @param[aArgs]{
 *     Usually an object dictionary that names constraints or maps multiple
 *     attribute bindings.
 *   }
 *   @param[aBindAttr]{
 *     Usually a string naming an attribute for some kind of binding.
 *   }
 *   @param[aOpts]{
 *     Usually an option dictionary.
 *   }
 * ]
 */
function WmsyStructMarker(aKind, aArgs, aBindAttr, aOpts) {
  this.kind = aKind;
  this.args = aArgs;
  this.bindAttr = aBindAttr;
  this.opts = aOpts;
}
WmsyStructMarker.prototype = {
};
exports.WmsyStructMarker = WmsyStructMarker;

/**
 * Simple meta-data decorating class; currently just used to mark objects as
 *  "flow" (= span) rather than the default (= div) objects.
 */
function WmsyObjDecorator(aKind, aObj, aAttrs) {
  this.kind = aKind;
  this.obj = aObj;
  this.attrs = aAttrs;
}
WmsyObjDecorator.prototype = {
};
exports.WmsyObjDecorator = WmsyObjDecorator;

function WmsyFocusMarker(aKind, aVertical, aKidNames) {
  this.kind = aKind;
  this.vertical = aVertical;
  this.kidNames = aKidNames;
}
WmsyFocusMarker.prototype = {
};
exports.WmsyFocusMarker = WmsyFocusMarker;

/**
 * @return[@func[
 *   @args[
 *     @rest["kid names" String]
 *   ]
 *   @return[WmsyFocusMarker]
 * ]]
 */
function FocusCurrier(aKind, aVertical) {
  return function _curried_focus() {
    return new WmsyFocusMarker(aKind, aVertical, arguments);
  };
}

/**
 * An artifact from our jetpack heritage; each jetpack was supposed to get one
 *  of these so that we could unload its contributions when the time came.
 *  Still useful.
 *
 * @args[
 *   @param[aContext @dict[
 *     @key["id" String]{
 *       A unique name within the domain to identify the source of the
 *       contributions to the domain.  This would usually be the name of the
 *       source file.  This does not segregate widgets, merely aid in
 *       identifying their origin within a domain.
 *     }
 *     @key["domain" #:default "default" String]{
 *       A unique value used to create a namespace that separates all the
 *       widgets defined in a given domain from widgets in all other domains.
 *       You would use this to segregate different UI interfaces that have no
 *       overlap.
 *     }
 *     @key[css LessCSSString]{
 *       The lesscss formatted style definitions for the widgets defined using
 *       this (export) domain.
 *     }
 *     @key["clickToFocus" #:default true Boolean]{
 *       Should clicking on a focusable item automatically focus it?
 *     }
 *     @key["focusRing" #:default true Boolean]{
 *       Should the fancy focus ring widget be displayed around this widget
 *       when focused?  The fancy focus ring is an animated focus ring that
 *       overlays the currently focused item.
 *
 *       If you are doing something with your widgets to convey focus using
 *       our synthetic ":focused"/":focused-active"/":focused-inactive"
 *       selectors, then you may not want/need the focus widget.  Keep in
 *       mind that you can also replace the fancy focus widget with your own
 *       or change its styling.
 *     }
 *   ]]
 * ]
 */
function WmsyExportDomain(aContext) {
  if ("domain" in aContext)
    this.useDomain(aContext.domain);
  else
    this.useDomain("default");
  this.clickToFocus = ("clickToFocus" in aContext) ?
                        Boolean(aContext.clickToFocus) : true;
  this.showFocusRing = ("focusRing" in aContext) ?
                         Boolean(aContext.focusRing) : true;
  this.name = aContext.id;
  this.qname = this.domain.name + "-" + this.name;

  if ("css" in aContext)
    this.domain.newExportDomainWithCSS(this.name, aContext.css);

  this.widgetDefinitions = [];

  // jetpack unloading semantics went here
}
WmsyExportDomain.prototype = {
  /**
   * Marker for use in bindings to re-bind using the current binding's bound
   *  object.
   */
  SELF: null,
  /**
   * Marker for use in bindings indicating no automatic binding should occur.
   */
  NONE: undefined,

  // XXX wmsy-core clobbers this; interp-munge must not be re-munging.
  useDomain: null,

  //////////////////////////////////////////////////////////////////////////////
  // Widget Definition

  /**
   * Define a new widget.
   *
   * @args[
   *   @param["aDef" WidgetDef]{}
   * ]
   */
  defineWidget: function(aDef) {
    this.domain.defineWidget(this, aDef);
    this.widgetDefinitions.push(aDef);
  },

  //////////////////////////////////////////////////////////////////////////////
  // Widget Definition Helpers

  /**
   * Mark that the contents should be spans instead of divs.
   *
   * @args[
   *   @param["aFlowObjs" WmsyObjDef]{}
   *   @param["aAttrs" WmsyObjAttrDict]{}
   * ]
   * @return[WmsyObjDecorator]{}
   */
  flow: function(aFlowObjs, aAttrs) {
    return new WmsyObjDecorator("flow", aFlowObjs, aAttrs);
  },

  /**
   * Same as default semantics but allows you to pass an attribute dictionary
   *  like bind takes to set DOM attributes on the element automatically.
   *
   * @args[
   *   @param[aObjDef StructureDef]{
   *     The structure definition you wish to annotate.  As a hint, if you
   *     were not making this call, this is what you would put in our place.
   *   }
   *   @param[aAttrs @dictof[
   *     @key["attribute name" String]{
   *       The name of the DOM attribute to expose the bound value on.
   *     }
   *     @value["object binding" String]{
   *       Actually, this can be a list or other stuff, but I'm just trying
   *       to stub this out quickly for the blog post.
   *
   *       XXX refactor this out into a proper type.
   *     }
   *   ]]
   * ]
   * @return[WmsyObjDecorator]{}
   */
  block: function(aObjDef, aAttrs) {
    return new WmsyObjDecorator("block", aObjDef, aAttrs);
  },

  /**
   * Bind a widget to a div tag.
   *
   * @args[
   *   @param[aPartialConstraint]{
   *     The guaranteed constraints on what will be provided to this widget.
   *   }
   * ]
   */
  widget: function(aPartialConstraint, aBindAttr, aOpts) {
    if (!aOpts)
      aOpts = {};
    aOpts.domain = this.domain;
    return new WmsyStructMarker("widget", aPartialConstraint, aBindAttr,
                                aOpts);
  },

  /**
   * Bind a sub-widget to a div tag.
   *
   * A sub-widget is focused on displaying only a portion of an object but it
   *  is still bound to the object as a whole.  For example, a widget to show
   *  whether a message is starred and allow the state to be toggled would
   *  only show the star, but its "obj" attribute would be the entire message.
   */
  subWidget: function(aAdditionalConstraints, aOpts) {
    if (!aOpts)
      aOpts = {};
    aOpts.domain = this.domain;
    return new WmsyStructMarker("subwidget", aAdditionalConstraints, this.SELF,
                                aOpts);
  },

  /**
   * Bind a library widget to a div tag.
   */
  libWidget: function(aPartialConstraint, aBindAttr, aOpts) {
    return new WmsyStructMarker("libwidget", aPartialConstraint, aBindAttr,
                                aOpts);
  },

  /**
   * Defines a point where multiple widgets are inserted where everyone is a div.
   */
  widgetList: function(aPartialConstraint, aBindAttr, aOpts) {
    if (aOpts) {
      if (!("vertical" in aOpts))
        aOpts.vertical = 1;
    }
    else {
      aOpts = {vertical: 1};
    }
    aOpts.domain = this.domain;
    return new WmsyStructMarker("widgetlist", aPartialConstraint, aBindAttr,
                                aOpts);
  },

  /**
   * Defines a fully expanded widget list that is vertically oriented for the
   *  purposes of automatic focus handling.
   */
  vertList: function(aPartialConstraint, aBindAttr, aOpts) {
    if (aOpts)
      aOpts.vertical = 1;
    else
      aOpts = {vertical: 1};
    aOpts.domain = this.domain;
    return this.widgetList(aPartialConstraint, aBindAttr, aOpts);
  },
  /**
   * Defines a fully expanded widget list that is horizontally oriented for the
   *  purposes of automatic focus handling.
   */
  horizList: function(aPartialConstraint, aBindAttr, aOpts) {
    if (aOpts)
      aOpts.vertical = 0;
    else
      aOpts = {vertical: 0};
    aOpts.domain = this.domain;
    return this.widgetList(aPartialConstraint, aBindAttr, aOpts);
  },

  /**
   * Defines a point where multiple widgets are inserted where everyone is a
   *  span.
   */
  widgetFlow: function(aPartialConstraint, aBindAttr, aOpts) {
    if (aOpts) {
      if (!("vertical" in aOpts))
        aOpts.vertical = 0;
    }
    else {
      aOpts = {vertical: 0};
    }
    aOpts.domain = this.domain;
    return new WmsyStructMarker("widgetflow", aPartialConstraint, aBindAttr,
                                aOpts);
  },

  /**
   * Bind a span tag for text content purposes and/or HTML attribute purposes.
   */
  bind: function(aTextAttrName, aOptionalFormatter, aDOMAttrBindings) {
    // If it's a formatter it will be a string or a function; shift the attr
    //  bindings to the right if not.
    if (typeof(aOptionalFormatter) == "object") {
      aDOMAttrBindings = aOptionalFormatter;
      aOptionalFormatter = undefined;
    }
    return new WmsyStructMarker("bind", aDOMAttrBindings, aTextAttrName,
                                {formatter: aOptionalFormatter});
  },

  /**
   * Like a widget list but the contents of the list/view slice are first
   *  checked if they are a string or are an object with a toDOMNode(document)
   *  function.  If either of those are true, they are directly inserted into
   *  the DOM.  Otherwise, an attempt is made to evaluate them with the provided
   *  partial constraint.
   *
   * This is used in cases where we just want some straight-up HTML content
   *  interspersed with the occasional widget.
   *
   * The view slice support, like for the widget list, is limited to asking
   *  for everything the view slice has.
   *
   * XXX _iterWalk needs to be changed to perform more clever traversal...
   */
  stream: function(aPartialConstraint, aBindAttr, aOpts) {
    if (aOpts)
      aOpts.vertical = 1;
    else
      aOpts = {vertical: 1};
    aOpts.domain = this.domain;
    return new WmsyStructMarker("stream", aPartialConstraint, aBindAttr,
                                aOpts);
  },

  //////////////////////////////////////////////////////////////////////////////
  // Bind Helpers

  /**
   * Like bind but pulling data from the invocation of a function found on impl.
   *
   * @return[ComputedValueDescriptor]
   */
  computed: function(aImplFuncName, aOptionalFormatter, aDOMAttrBindings) {
    // if it's actually a formatter it will be a string or a function
    if (typeof(aOptionalFormatter) == "object") {
      aDOMAttrBindings = aOptionalFormatter;
      aOptionalFormatter = undefined;
    }
    return new WmsyStructMarker("computed", aDOMAttrBindings, aImplFuncName,
                                {formatter: aOptionalFormatter});
  },

  /**
   * Static string bind helper; for when you need to provide a non-localizable
   *  string to something that is expecting a binding.  (Without this, your
   *  string will be intepreted as an attribute to look up on the bound object.)
   *
   * @return [StaticStrDescriptor]
   */
  staticString: function(aStr) {
    return new WmsyStructMarker("staticString", null, aStr);
  },

  /**
   * Pull the data off of a field on our widget's `impl`.
   *
   * @return[ImplDataDescriptor]
   */
  implData: function(aFieldName) {
    return new WmsyStructMarker("implData", null, aFieldName);
  },

  /**
   * Decorate the given binding with logic to convert an object into a list
   *  populated by the values of the object.  The keys are ignored.
   *
   * @args[
   *   @param[aBindAttr]{
   *     Anything that's a legal bind spec.
   *   }
   * ]
   *
   * @return[DictAsListDescriptor]
   */
  dictAsList: function(aBindAttr) {
    return new WmsyStructMarker("dictAsList", null, aBindAttr);
  },

  /**
   * Decorate the given binding with logic to convert an object into a list
   *  whose elements are objects with 'key' and 'value' attributes corresponding
   *  to the keys and matching values of the object.
   *
   * @args[
   *   @param[aBindAttr]{
   *     Anything that's a legal bind spec.
   *   }
   * ]
   *
   * @return[DictAsListDescriptor]
   */
  dictAsKeyValueObjs: function(aBindAttr) {
    return new WmsyStructMarker("dictAsKeyValueObjs", null, aBindAttr);
  },

  /**
   * Decorate the given binding with logic to normalize the contents of the
   *  stream so that whitespace is inserted if needed, but is not injected
   *  when it is not.  This does assume that all the widget bindings will not
   *  include horizontal margins of their own that would obviate the need for
   *  the whitespace.
   */
  normalizedWhitespaceStream: function(aBindAttr) {
    return new WmsyStructMarker("normalizedStream", null, aBindAttr);
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
   * @args[
   *   @param[aKeyName String]{
   *     The name of the attribute in the constraint basis whose value we should
   *     extract.
   *   }
   *   @param[aProcFunc #:optional]{
   *     An optional function to process the attribute name.  If this function
   *     is omitted, we simply lookup the attribute name on the object.  If
   *     provided, the function is invoked with the attribute name as the first
   *     argument and the object as the second argument.  The function should
   *     return whatever it wants to be treated as the value of the binding.
   *   }
   * ]
   * @return[ConstraintValueDescriptor]
   */
  fromConstraint: function(aKeyName, aProcFunc) {
    return new WmsyStructMarker("fromConstraint", aProcFunc, aKeyName);
  },

  //////////////////////////////////////////////////////////////////////////////
  // Proper HTML

  /**
   * If we want actual browser hyperlink behavior, it makes sense to mark a
   *  thing that acts like a link as an actual link.
   *
   * @args[
   *   @param[aHyperlinkObj WmsyObjDef]{}
   *   @param[aAattrs WmsyObjAttrDict]{}
   * ]
   * @return[WmsyObjDecorator]{}
   */
  hyperlink: function(aHyperlinkObj, aAttrs) {
    // wrap everything but nested objects in an anonymous list.
    return new WmsyObjDecorator("hyperlink", aHyperlinkObj, aAttrs);
  },

  //////////////////////////////////////////////////////////////////////////////
  // Simple widget types

  /**
   * Creates an image tag.
   */
  bindImage: function(aSrcBinding, aDOMAttrBindings) {
    if (!aDOMAttrBindings)
      aDOMAttrBindings = {};
    if (aSrcBinding !== this.NONE)
      aDOMAttrBindings["src"] = aSrcBinding;
    return new WmsyStructMarker("bindImage", aDOMAttrBindings);
  },

  /**
   * Create a button. XXX need to normalize this with other form input
   *  mechanisms.
   * XXX more focus unification required
   */
  button: function(aButtonLabel, aDOMAttrBindings) {
    return new WmsyStructMarker("button", aDOMAttrBindings, aButtonLabel);
  },

  /**
   * One-way checkbox binding.
   * XXX focus issues as with all other form widgets
   * XXX one-way binding perhaps sucky
   */
  checkbox: function(aLabel, aCheckedBinding, aJSAttrBindings,
                     aStaticBindings) {
    if (!aJSAttrBindings)
      aJSAttrBindings = {};
    if (!aStaticBindings)
      aStaticBindings = {};
    if (aCheckedBinding !== this.NONE)
      aJSAttrBindings["checked"] = aCheckedBinding;
    return new WmsyStructMarker("checkbox", aJSAttrBindings, aLabel,
                                aStaticBindings);
  },

  /**
   * Text input-box; supports binding.
   */
  text: function(aValueBinding, aDOMAttrBindings, aStaticBindings) {
    if (aValueBinding) {
      if (!aDOMAttrBindings)
        aDOMAttrBindings = {};
      // we could also use a JS binding instead of setting the DOM attr "value"
      aDOMAttrBindings.value = aValueBinding;
    }
    return new WmsyStructMarker("text", aDOMAttrBindings, null,
                                aStaticBindings);
  },

  /**
   * Password input-box; XXX currently input-only right now because it's not
   *  clear that it's a good idea to actually reflect the password into the
   *  DOM.  Probably better to use a sentinel marker/etc.
   *
   * (We definitely want to use a JS binding instead of the DOM attr for this
   *  one if we do hook it up!)
   */
  password: function(aValueBinding, aDOMAttrBindings, aStaticBindings) {
    return new WmsyStructMarker("password", aDOMAttrBindings, aValueBinding,
                                aStaticBindings);
  },

  /**
   * Textarea input-box; supports binding.
   */
  textarea: function(aValueBinding, aDOMAttrBindings, aStaticBindings) {
    return new WmsyStructMarker("textarea", aDOMAttrBindings, aValueBinding,
                                aStaticBindings);
  },

  //////////////////////////////////////////////////////////////////////////////
  // View Slices

  /**
   * @docsplice[DecoratingInterposingViewSlice]
   *
   * @args[
   *   @param[aDef @argref[DecoratingInterposingViewSlice.aDef]]
   * ]
   * @return[@func[
   *   @args[
   *     @param[aInterposedConstraint Constraint]
   *     @param[aNormalConstraint Constraint]
   *   ]
   *   @return[ViewSliceDecorator]
   * ]]
   */
  defineInterposingViewSlice: function(aDef) {
    var maker = aDef.maker;
    var mutatedDef = {
      classifier: aDef.classifier,
      // Decorate the maker's result with a sentinel type/value that the
      //  fab process can use to detect interposed values so that it can
      //  switch to the alternate constraint for evaluation (and unbox).
      maker: function() {
        var result = maker.apply(this, arguments);
        if (result === undefined)
          return undefined;
        return {
          // This is an arbitrary object reference; using it because it's
          //  sufficiently publicly accessible that others can use it.  No
          //  guarantee on this being the one we use forever, of course.
          _synthetic: WmsyStructMarker,
          obj: result,
        };
      },
      makeFirst: aDef.makeFirst,
      makeLast: aDef.makeLast,
    };
    return function(aInterposedConstraint, aNormalConstraint) {
      return new WmsyStructMarker("viewSliceDecorator", {
        kind: "interposing",
        synthConstraint: aInterposedConstraint,
        normalConstraint: aNormalConstraint,
        sliceDef: mutatedDef,
      });
    };
  },

  //////////////////////////////////////////////////////////////////////////////
  // Object Identity

  /**
   * Define a new identity space that maps objects to characteristic
   *  identifiers.
   */
  defineIdSpace: function(spaceName, idExtractor) {
    this.domain.defineIdSpace(spaceName, idExtractor);
  },

  //////////////////////////////////////////////////////////////////////////////
  // Localization

  /**
   * Localizable string bind helper; for when you need to provide a localizable
   *  string to something that is expecting a binding.  (Without this, your
   *  string will be intepreted as an attribute to look up on the bound object.)
   *
   * You do not need to use this helper outside of things expecting bindings;
   *  all bare strings for presentation are assumed to be localizable.
   *
   * @return [LocalizedStrDescriptor]
   */
  localizableString: function(aStr) {
    return new WmsyStructMarker("localizable", null, aStr);
  },

  /**
   * Define a localizable map.
   */
  defineLocalizedMap: function(name, map, defaultThing) {
    var mapper = {
      lookup: function(key) {
        if (key in map)
          return map[key];
        if (defaultThing)
          return defaultThing.replace("#0", key.toString());
        return "LocalizedMap has no answer!";
      }
    };
    return mapper;
  },

  //////////////////////////////////////////////////////////////////////////////
  // Styling

  /**
   * Define some CSS to be exposed to the less.js parser for use in widget
   *  styling.
   */
  defineStyleBase: function(name, lessCssBlob) {
    return this.domain.defineStyleBase(name, lessCssBlob);
  },

  /**
   * Define a raw CSS block to be inserted into the document when widgets from
   *  this domain are bound.  The block is not processed.  You would use this
   *  if you are working with an external stylesheet that you want available
   *  when the widget is bound.
   *
   * A good option is to use the RequireJS "text" plugin with this
   *  functionality.
   */
  defineRawCss: function(name, block) {
    return this.domain.defineRawCss(this.qname, name, block);
  },

  /**
   * XXX very preliminary and speculative support for external stylesheets.
   *  This wass added for the jstut syntax highlighted display which creates
   *  styled nodes that are not wmsy widgets but needs styling, but it has now
   *  transitioned to use RequireJS' "text" plugin and defineRawCss.
   */
  referenceExternalStylesheet: function(path) {
    this.domain.referenceExternalStylesheet(this.qname, path);
  },

  /**
   * @deprecated Mix-in logic for CSS from the pre-less-css world.
   */
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

  /**
   * XXX Temporary mechanism to convey relative path to prepend to all
   *  CSS urls we are provided.
   */
  setPackageBaseRelPath: function(relPath) {
    this.domain.setPackageBaseRelPath(relPath);
  },

  //////////////////////////////////////////////////////////////////////////////
  // Focus

  focus: {
    domain: {
      horizontal: FocusCurrier("domain", false),
      vertical: FocusCurrier("domain", true),
    },
    container: {
      horizontal: FocusCurrier("container", false),
      vertical: FocusCurrier("container", true),
      parameterized: FocusCurrier("container", null),
    },
    nestedItem: {
      horizontal: FocusCurrier("nested", false),
      vertical: FocusCurrier("nested", true),
    },
    item: new WmsyFocusMarker("item", null, null),
  },

  //////////////////////////////////////////////////////////////////////////////
  // Widget Instantiation

  wrapElement: function(aDomElem) {
    aDomElem.wmsyTop = true;
    return new WmsyWrappedElement(this.domain, aDomElem);
  },

  //////////////////////////////////////////////////////////////////////////////

};
exports.WmsyExportDomain = WmsyExportDomain;


/**
 * Wrapped DOM node exposed to a jetpack sandbox for convenient widget creation.
 * This should likely be secured by a change to a lexically constructed object
 *  so that internals aren't accessible.
 */
function WmsyWrappedElement(aDomain, aDomElem) {
  this.domain = aDomain;
  this.domElem = aDomElem;

  this.domain.bindEventsOnRoot(this.domElem);
}
WmsyWrappedElement.prototype = {
  bind: function(aConstraintWithObj, aExtra) {
    return this.domain.bindObjectIntoNode(aConstraintWithObj, this.domElem,
                                          aExtra);
  },

  remove: function(aBinding) {
    aBinding.destroy();
    var domNode = aBinding.domNode;
    domNode.parentNode.removeChild(domNode);
  },

  /**
   * @return[IdSpaceDocRegistry]
   */
  get idSpace() {
    var doc = this.domElem.ownerDocument;
    if (!("wmsyIdSpaceDomains" in doc) ||
        !(this.domain.name in doc.wmsyIdSpaceDomains))
      throw new Error("no id space is bound into the document for us yet");
    return doc.wmsyIdSpaceDomains[this.domain.name];
  },
};
// deprecated name binding
WmsyWrappedElement.prototype.emit = WmsyWrappedElement.prototype.bind;

}); // end define
