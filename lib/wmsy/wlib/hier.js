/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at:
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is Mozilla Messaging Code.
 *
 * The Initial Developer of the Original Code is
 *   The Mozilla Foundation
 * Portions created by the Initial Developer are Copyright (C) 2011
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Andrew Sutherland <asutherland@asutherland.org>
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

/**
 * Visualize the contents of an object dictionary.
 **/

define(
  [
    "wmsy/wmsy-core",
    "text!./hier.css",
    "exports"
  ],
  function(
    $wmsy,
    $_css,
    exports
  ) {

var wy = new $wmsy.WmsyDomain({id: "hier", domain: "wlib",
                               css: $_css});

/**
 * Provides a parameterized reusable scaffolding for trees.  This is revealing
 *  non-trivial weaknesses in our otherwise cool parameterization system.
 *
 * For simplicity, the widget is self-recursive; this is tractable because
 *  the leaf nodes are the actual payload constraint type and all the internal
 *  nodes are of our own type.
 */
wy.defineWidget({
  name: "hier",
  doc: "helps you build a recursive hierarchical tree easily via payload",
  constraint: {
    type: "hier",
    constraint: wy.PARAM,
    kidsAttr: wy.PARAM,
    // automatically filled in by libWidget:
    domain: wy.PARAM,
  },
  focus: wy.focus.container.vertical("value", "kids"),
  structure: {
    // XXX we could use built-in mechanisms if not for our inability to get
    //  addWidget/addWidgetList to use our partial and constraint from our
    //  parameters without having to change those methods.  Right now they
    //  close over that stuff.
    // This would likely best be handled during a refactoring to use code
    //  generation since it should be easier to change the bake-in mechanism.
    value: {},
    kids: {},
  },
  _structureMapExtra: {
    kids: {
      listy: true,
      listVertical: true,
      navVertical: true,
      subElementCssClass: "wlib--hier--hier--kids-item",
    },
  },

  protoConstructor: function(aConstraint, aGenesisDomNode) {
    this._partial =
      aConstraint.domain.dtree.partialEvaluate(aConstraint.constraint);
    // we want a safe copy we can manipulate
    this._constraint = JSON.parse(JSON.stringify(aConstraint.constraint));
    this._kidsAttr = aConstraint.kidsAttr;

    this._kidCssClass = this.__structMap.kids.subElementCssClass;
  },
  impl: {
    kids_lastFocused: null,
    postInit: function() {
      this._liveBindings = [];
      // ugly hack to force value into a complex class-name space for our
      //  use of replaceBindOnto.
      this.value_element.className =
        "foo " + this.value_element.className;
    },
    update: function() {
      this.__update();

      var domNode = this.domNode, doc = domNode.ownerDocument,
          partial = this._partial,
          constraint = this._constraint,
          liveBindings = this._liveBindings,
          kidsNode = this.kids_element;
      while (liveBindings.length)
        liveBindings.pop().destroy();
      while (kidsNode.lastChild)
        kidsNode.removeChild(kidsNode.lastChild);

      // - create the value node
      constraint.obj = this.obj;
      var widgetFab = partial.evaluate(constraint);
      var valueBinding =
        widgetFab.replaceBindOnto(constraint, this.value_element);
      liveBindings.push(valueBinding);

      // - create our children
      var selfFactory = this.__factory__,
          selfConstraint = this.__constraint;
      var kidCssClass = this._kidCssClass;
      var kids = this.kids = this.obj[this.__parameter_kidsAttr];
      for (var iKid = 0; iKid < kids.length; iKid++) {
        selfConstraint.obj = kids[iKid];
        liveBindings.push(selfFactory.insertBefore(selfConstraint, null,
                                                   kidsNode,
                                                   null, kidCssClass));
      }
    },
    destroy: function(keepDom, forbidKeepDom) {
      var liveBindings = this._liveBindings;
      while (liveBindings.length)
        liveBindings.pop().destroy();

      return this.__destroy(keepDom, forbidKeepDom);
    },

    // XXX copied and pasted from wmsy-protofab; this is horrible
    kids_iterWalk: function kids_iterWalk(aStart, aDir, aCallback) {
      var linkAttr = (aDir < 0) ? "previousSibling" : "nextSibling";
      var domNode;
      if (aStart == null) {
        if (aDir > 0)
          domNode = this.kids_element.firstChild;
        else
          domNode = this.kids_element.lastChild;
        // we might be empty, return false immediately if so
        if (domNode == null)
          return false;
      }
      else {
        domNode = aStart.domNode[linkAttr];
        if (!domNode)
          return false;
      }

      while (true) {
        // (skip DOM nodes without bindings)
        var rval = ("binding" in domNode) ? aCallback(domNode.binding) : false;
        if (rval)
          return rval;
        domNode = domNode[linkAttr];
        if (!domNode)
          return false;
      }
    },

    // XXX same deal here; copied and pasted, horrible, bad, horrible
    kids_ensureVisible: function kids_ensureVisible(
        aBinding, aOriginBinding) {
      var clientLenAttr = "clientHeight";
      var scrollOffAttr = "scrollTop";
      var offsetOffAttr = "offsetTop";

      var containerNode = this.kids_element;
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
    }
  },
});

}); // end define
