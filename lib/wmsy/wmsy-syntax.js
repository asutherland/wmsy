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

function FocusCurrier(aKind, aVertical) {
  return function _curried_focus() {
    new WmsyFocusMarker(aKing, aVertical, arguments);
  };
}

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

  // wmsy-core will clobber this with a function.
  useDomain: null,

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
   * Mark that the contents should be spans instead of divs.
   */
  flow: function(aFlowObjs, aAttrs) {
    return new WmsyObjDecorator("flow", aFlowObjs, aAttrs);
  },

  /**
   * Same as default semantics but allows you to pass an attribute dictionary
   *  like bind takes to set DOM attributes on the element automatically.
   */
  block: function(aObjDef, aAttrs) {
    return new WmsyObjDecorator("block", aObjDef, aAttrs);
  },

  /**
   * Bind a widget to a div tag.
   *
   * @param aPartialConstraint The guaranteed constraints on what will be
   *     provided to this widget.
   */
  widget: function(aPartialConstraint, aBindAttr, aOpts) {
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
    return new WmsyStructMarker("subwidget", aAdditionalConstraints, undefined,
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
    return new WmsyStructMarker("widgetlist", aPartialConstraint, aBindAttr,
                                aOpts);
  },

  vertList: function(aPartialConstraint, aBindAttr, aOpts) {
    if (aOpts)
      aOpts.vertical = 1;
    else
      aOpts = {vertical: 1};
    return new WmsyStructMarker("widgetlist", aPartialConstraint, aBindAttr,
                                aOpts);
  },
  horizList: function(aPartialConstraint, aBindAttr, aOpts) {
    if (aOpts)
      aOpts.vertical = 0;
    else
      aOpts = {vertical: 0};
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
    domain: {
      horizontal: FocusCurrier("domain", 0),
      vertical: FocusCurrier("domain", 1),
    },
    container: {
      horizontal: FocusCurrier("container", 0),
      vertical: FocusCurrier("container", 1),
    },
    nestedItem: {
      horizontal: FocusCurrier("nested", 0),
      vertical: FocusCurrier("nested", 1),
    },
    item: new WmsyFocusMarker("item", null, null),
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
exports.WmsyExportDomain = WmsyExportDomain;


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
