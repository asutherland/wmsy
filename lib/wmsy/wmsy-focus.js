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
* Portions created by the Initial Developer are Copyright (C) 2010 the Initial
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


/**
 * Focus domains:
 * - Can be active or inactive; only one focus domain can be active at a time.
 * - Can be cycled through using tab (which changes who is active/inactive).
 * - Always have a focused widget (if the set of focusable widgets is non-nul).
 *
 * Focus domain instances:
 * - Are instantiated on a one-to-one basis with widget bindings that define a
 *   focus domain.
 *
 * Differ from containers:
 * - Containers have no per-widget-binding (instance) data structures because
 *   we expect them to be fairly numerous.
 */
function FocusDomainInstance() {
  this.focusedBinding = null;
}
FocusDomainInstance.prototype = {
};
exports.FocusDomainInstance = FocusDomainInstance;

/**
 * There is one focus manager per HTML document.  We stick it on the document
 *   as an expando named "wmsyFocusManager".
 */
function FocusManager(aGlobalCssClassToStructInfo) {
  this.globalCssClassToStructInfo = aGlobalCssClassToStructInfo;

  this.activeFocusDomain = null;
  this.focusDomains = [];
}
FocusManager.prototype = {
  get focusedBinding() {
    if (!this.activeFocusDomain)
      return null;

    return this.activeFocusDomain.focusedBinding;
  },

  newFocusDomain: function() {
    var focusDomain = new FocusDomainInstance();
    this.focusDomains.push(focusDomain);
    return focusDomain;
  },

  destroyFocusDomain: function(aFocusDomain) {
    var index = this.focusDomains.indexOf(aFocusDomain);
    if (index == -1)
      throw new Error("Trying to remove an unknown focus domain!");
    this.focusDomains.splice(index, 1);
  },

  navigate: function(aVertical, aDir) {
    var activeFocusDomain = this.activeFocusDomain;
    this.ponderUpNavigation(activeFocusDomain.focusedBinding, aVertical, aDir,
                            [], activeFocusDomain);
  },

  performInitialFocus: function(aBinding, aFocusDomain) {
    this.ponderDownNavigation(aBinding, aFocusDomain, true, 1, []);
  },

  findFocusDomainForBinding: function(aBinding) {
    var curNode = aBinding.domNode;
    while ((curNode = curNode.parentNode) && !("wmsyTop" in curNode)) {
      if (!("binding" in curNode))
        continue;
      var curBinding = curNode.binding;
      if ("_focusDomain" in curBinding)
        return curBinding._focusDomain;
    }
    throw new Error("Unable to find focus domain for binding!");
  },

  /**
   * Walk up from a binding, looking to move in the direction provided by
   *  aVertical/aDir.
   *
   * Each time we need to move up a focus-aware binding level, we push an item
   *  on the stack that names the child element that the focus came out of. This
   *  can then be used by ponderDownNavigation to attempt to maintain some
   *  degree of persistence when transferring focus between similarly structured
   *  objects.  (The initial idea was to count the number of times we need to
   *  move in some direction, but that seems both more brittle and less
   *  efficient.)  This could be opt-in featured up by allow specific custom
   *  mappings to be used independent of the actual structuring of a widget.
   *
   */
  ponderUpNavigation: function(aOriginBinding, aVertical, aDir, aStack,
                               aFocusDomain) {
console.log("F^ +++ ponder up", aVertical, aDir);
    var globalCssClassToStructInfo = this.globalCssClassToStructInfo;

    var curNode = aOriginBinding.domNode;
    // keep track of the last binding we saw so we can track where we came from
    var lastBinding = aOriginBinding;

    // -- Climb
    while ((curNode = curNode.parentNode) && !("wmsyTop" in curNode)) {
      if (!("binding" in curNode)) {
console.log("F^ skipping", curNode);
        continue;
      }

      var binding = curNode.binding;
      if (!aFocusDomain)
        aFocusDomain = this.findFocusDomainForBinding(binding);
console.log("F^ climbed to binding", binding.cssClassBaseName);
      // - figure out which child we came out of
      // (In the case of a sub-widget, the last binding's DOM node will have the
      //  class we want on it as the last specific class.  In the case of a list
      //  widget, we will need to climb one node level.)
      var parentClasses = lastBinding.domNode.getAttribute("class").split(" ");
      var parentChildClass;
      if (parentClasses.length == 2) // sub-widget
        parentChildClass = parentClasses[parentClasses.length - 1];
      else // list widget
        parentChildClass = lastBinding.domNode.parentNode.getAttribute("class");
console.log("  parent child class: '" + parentChildClass + "' from",
           lastBinding.domNode.getAttribute("class"));
      var childStruct = globalCssClassToStructInfo[parentChildClass];

      // see if the child is listy and oriented in the direction we need
      if (childStruct.listy && childStruct.listVertical == aVertical) {
console.log("F^ listy check", childStruct.name);
        // Since it is, see if it has anything more to offer.
        // (We need to ask it in case there is virtual list stuff going on
        //  involving unfulfilled asynchronous requests.  Although exact
        //  specifics are being punted on for now... XXX)
        var dis = this;
        function kidCheck(aChildBinding) {
          return dis.ponderDownNavigation(aChildBinding, aFocusDomain,
                                          aVertical, aDir, aStack);
        }
        if (binding[childStruct.name + "_iterWalk"](lastBinding, aDir,
                                                    kidCheck)) {
          return true;
        }
      }
      // not listy or has nothing more to offer, see if there's any navigation
      //  possible within this widget...
      if (("navVertical" in childStruct) &&
          childStruct.navVertical == aVertical) {
console.log("F^ widget nav", childStruct.name);
        var curStruct = childStruct;
        var linkAttr = (aDir < 0) ? "prevFocusable" : "nextFocusable";
        while (curStruct[linkAttr]) {
          curStruct = curStruct[linkAttr];
          var subBinding = binding[curStruct.name + "_element"].binding;
          if (this.ponderDownNavigation(subBinding, aFocusDomain,
                                        aVertical, aDir, aStack))
            return true;
        }

      }

      aStack.push({tag: childStruct.name});
      // if he was the source of our current focus domain, we need to dump it
      //  and figure out our new one...
      if ("_focusDomain" in binding)
        aFocusDomain = null;
      lastBinding = binding;
    }
console.log("F^ --- leaving without finding anything ---");
    return false;
  },

  /**
   * Attempt to transfer focus into the given binding in the (entry) direction
   *  given by aVertical and aDir.
   */
  ponderDownNavigation: function(aBinding, aFocusDomain, aVertical, aDir,
                                 aStack, aStackOffset) {
console.log("F. +++ ponderDownNavigation +++", aBinding.cssClassBaseName);
    if (aStackOffset == null && aStack)
      aStackOffset = aStack.length - 1;
    if (aStackOffset < 0)
      aStack = null;

    if ("_focusDomain" in aBinding)
      aFocusDomain = aBinding._focusDomain;

    // If this is a focusable item, just focus it.
    if ("focused" in aBinding) {
console.log("F. found focusable item!");
      this.focusBinding(aBinding, true, aFocusDomain);
      return true;
    }

    // If this is (not focusable and) not a container, then bail.
    var rootStruct = aBinding._structMap.root;
    if (!("navVertical" in rootStruct))
      return false;
    // (We must be some form of container...)

    // If our stack knows something, try and use it
    var childStruct, linkAttr;
    if (aStack) {
      var tag = aStack[aStackOffset].tag;
      if (tag in aBinding._structMap) {
        childStruct = aBinding._structMap;
        // make sure the tag hint was focusable...
        if ("prevFocusable" in childStruct)
          childStruct = null;
      }
      aStackOffset -= 1;
    }

    // set up directions and perform nominal entry if stack didn't
    // (We are intentionally ignoring the vertical flag here; we need to pick
    //  something to descend into, and up-down/left-to-right have matching
    //  semantics for these purposes when the stack tag fails us.  Obviously,
    //  this may not hold true for RTL locales, but we are not there yet.)
    if (aDir < 0) {
      if (!childStruct)
        childStruct = rootStruct.lastFocusable;
      linkAttr = "prevFocusable";
    }
    else {
      if (!childStruct)
        childStruct = rootStruct.firstFocusable;
      linkAttr = "nextFocusable";
    }

    // iterate over the focusable children, trying to enter/focus...
    while (childStruct) {
      if (childStruct.listy) {
        var dis = this;
        function kidCheck(aChildBinding) {
console.log("    iter", aChildBinding.obj.id);
          return dis.ponderDownNavigation(aChildBinding, aFocusDomain,
                                          aVertical, aDir, aStack, aStackOffset);
        }
console.log("F. iterating over listy widget", childStruct.name);
        if (aBinding[childStruct.name + "_iterWalk"](null, aDir, kidCheck)) {
          return true;
        }
      }
      else {
console.log("F. checking out widget", childStruct.name);
        var subBinding = aBinding[childStruct.name + "_element"].binding;
        if (this.ponderDownNavigation(subBinding, aVertical, aDir, aStack,
                                      aStackOffset))
          return true;
      }

      childStruct = childStruct[linkAttr];
    }

console.log("F. traversal of", aBinding.cssClassBaseName, "did not focus anything");
    return false;
  },

  focusBinding: function(aBinding, aMakeDomainActive, aFocusDomain) {
    if (!aFocusDomain)
      aFocusDomain = this.findFocusDomainForBinding(aBinding);
    if (!this.activeFocusDomain)
      aMakeDomainActive = true;

    var activeAttrName;
    if (aMakeDomainActive) {
      if (this.activeFocusDomain != aFocusDomain && this.activeFocusDomain) {
        var oldDomain = this.activeFocusDomain;
        if (oldDomain.focusedBinding) {
          var oldNode = oldDomain.focusedBinding.domNode;
          oldNode.removeAttribute("wmsy-focused-active");
          oldNode.setAttribute("wmsy-focused-inactive", "");
        }
      }
      this.activeFocusDomain = aFocusDomain;
      activeAttrName = "wmsy-focused-active";
    }
    else {
      if (this.activeFocusDomain == aFocusDomain)
        activeAttrName = "wmsy-focused-active";
      else
        activeAttrName = "wmsy-focused-inactive";
    }

    // unfocus any existing focused binding
    if (aFocusDomain.focusedBinding) {
      var oldBinding = aFocusDomain.focusedBinding;
      oldBinding.domNode.removeAttribute("wmsy-focused");
      oldBinding.domNode.removeAttribute(activeAttrName);
    }

    aFocusDomain.focusedBinding = aBinding;
    aBinding.domNode.setAttribute("wmsy-focused", "");
    aBinding.domNode.setAttribute(activeAttrName, "");

console.log("F! focused", aBinding.obj.id, "active domain",
            this.activeFocusDomain, "active binding",
            this.activeFocusDomain.focusedBinding.obj.id);
  },

  focusedBindingBeingDestroyed: function(aBinding) {
    var focusDomain = this.findFocusDomainForBinding(aBinding);
    focusDomain.focusedBinding = null;
  },

  pushPopup: null,
  popPopup: null,
};
exports.FocusManager = FocusManager;
