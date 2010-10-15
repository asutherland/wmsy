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
 **/

require.def("wmsy/wmsy-focus",
  [
    "exports",
  ],
  function(
    exports
  ) {

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
function FocusDomainInstance(aRootBinding, aIsPopup) {
  this.rootBinding = aRootBinding;
  this.focusedBinding = null;
  this.isPopup = aIsPopup;
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
  // the set of (non-popup) focus domains
  this.focusDomains = [];
  /**
   * We maintain a separate set of popup focus domains.  We have no concept of
   *  or support for multiple concurrent popups so this is not a failure to
   *  generalize.  (That seems like a horrible bag of complexity that would
   *  lead to weird interfaces.  If you think you need multiple levels of
   *  popups, you probably want to re-think what you are doing or how you are
   *  doing it.  For example, if you have embarked on popup menus and you have
   *  a sub-menu that pops out, it can still live in the same popup.)
   */
  this.popupFocusDomains = null;
  this.prePopupActiveFocusDomain = null;
  this.activePopup = null;
}
FocusManager.prototype = {
  get focusedBinding() {
    if (!this.activeFocusDomain)
      return null;

    return this.activeFocusDomain.focusedBinding;
  },

  /**
   * Create a new focus domain instance rooted on the given binding.  If we
   *  detect the binding lives inside a wmsy popup context, we put the focus
   *  domain on the list of popup focus domains.
   */
  newFocusDomain: function(aRootBinding) {
    // Figure out if it's living inside a popup...
    var isPopup = false;
    for (var curNode = aRootBinding.domNode;
         curNode && !("wmsyTop" in curNode); // the wrapped can't be a domain
         curNode = curNode.parentNode) {
      if (curNode.hasAttribute("wmsy-popup")) {
        isPopup = true;
        break;
      }
    }
    var focusDomain = new FocusDomainInstance(aRootBinding, isPopup);
    if (isPopup)
      this.popupFocusDomains.push(focusDomain);
    else
      this.focusDomains.push(focusDomain);
    return focusDomain;
  },

  /**
   * Destroy the provided focus domain.  Try and make another focus domain
   *  active if possible.
   */
  destroyFocusDomain: function(aFocusDomain) {
    var domainList = aFocusDomain.isPopup ? this.popupFocusDomains
                                          : this.focusDomains;
    var index = domainList.indexOf(aFocusDomain);
    if (index == -1)
      throw new Error("Trying to remove an unknown focus domain!");
    domainList.splice(index, 1);
    // revise the index location in case we need to switch active domains...
    index = Math.max(index, domainList.length - 1);
    if (aFocusDomain == this.activeFocusDomain) {
      if (domainList.length) {
        this.activeFocusDomain = domainList[index];
        this._markBindingActiveFocused(domainList[index].focusedBinding);
      }
      else {
        this.activeFocusDomain = null;
      }
    }
    else if (aFocusDomain == this.prePopupActiveFocusDomain) {
      if (domainList.length) {
        this.prePopupActiveFocusDomain = domainList[index];
        this._markBindingActiveFocused(domainList[index].focusedBinding);
      }
      else {
        this.prePopupActiveFocusDomain = null;
      }
    }
  },

  _markBindingActiveFocused: function(aBinding) {
    if (!aBinding)
      return;
    aBinding.domNode.removeAttribute("wmsy-focused-inactive");
    aBinding.domNode.setAttribute("wmsy-focused-active", "");
    aBinding.ensureVisible();
  },

  _markBindingInactiveFocused: function(aBinding) {
    if (!aBinding)
      return;
    aBinding.domNode.removeAttribute("wmsy-focused-active");
    aBinding.domNode.setAttribute("wmsy-focused-inactive", "");
  },

  /**
   * For use by popup logic to tell us it is creating a popup and that we should
   *  shift into popup mode of operation.
   * This does not preclude changes in the focus domains of non-popups in the
   *  background.  But it won't happen because of user interaction (unless the
   *  popup goes away in the process.)
   * This does not change the active/inactive state of the currently active
   *  focus domain at the current time.
   */
  pushPopup: function() {
    this.prePopupActiveFocusDomain = this.activeFocusDomain;
    this.activeFocusDomain = null;
    this.popupFocusDomains = [];
  },
  popPopup: function() {
    this.activeFocusDomain = this.prePopupActiveFocusDomain;
    this.prePopupActiveFocusDomain = undefined;
    this.popupFocusDomains = null;
    this.activePopup = null;
  },

  /**
   * Cycle among the potentially active focus domains.
   *
   * XXX actually, maybe the tab index stuff should be doing this for us...
   */
  cycleFocusDomain: function cycleFocusDomain(aDir) {
    var domainList = aFocusDomain.isPopup ? this.popupFocusDomains
                                          : this.focusDomains;
    // nothing to do with 0,1 domains
    if (domainList.length <= 1)
      return;
    var index = domainList.indexOf(this.activeFocusDomain);
    index = (index + aDir + domainList.length) % domainList.length;

    this._markBindingInactiveFocused(this.activeFocusDomain.focusedBinding);
    this.activeFocusDomain = domainList[index];
    this._markBindingActiveFocused(this.activeFocusDomain.focusedBinding);
  },

  /**
   * Attempt navigation from the currently focused binding in the active focus
   *  domain.  If there is no focused binding we instead try and perform
   *  initial entry logic again but using the provided direction information.
   */
  navigate: function(aVertical, aDir, aFilterFunc) {
    var activeFocusDomain = this.activeFocusDomain;
    
    // Nested items are a special case wherein it is possible for us to
    //  actually need to try and navigate down.  Everything else is an 'up'
    //  because for everything else all focusable nodes are leaf nodes and so
    //  an 'up' is required.
    // To this end we try and execute a down maneuver if we know we are a
    //  focused nested item, the movement is along the axis of the nesting,
    //  and the movement is positive.  (If we are moving against the axis of
    //  the nested item, we must be leaving the nested item.  Same deal for
    //  negative movement along the axis.)
    if (activeFocusDomain.focusedBinding) {
      var root = activeFocusDomain.focusedBinding.__structMap.root;
      // it needs to be positive navigation otherwise we'll wrap...
      if (root.firstFocusable === root &&
          aVertical === root.navVertical &&
          aDir === 1) {
        // construct a filter that stops the down from selecting this node
        //  outright
        function notAlreadySelected(binding) {
          if (binding === activeFocusDomain.focusedBinding)
            return false;
          if (aFilterFunc)
            return aFilterFunc(binding);
          return true;
        }
        if (this.ponderDownNavigation(activeFocusDomain.focusedBinding,
                                      activeFocusDomain,
                                      aVertical, aDir, [], -1,
                                      notAlreadySelected))
          return;
      }
    }    
    this.ponderUpNavigation(activeFocusDomain.focusedBinding, aVertical, aDir,
                            [], activeFocusDomain, aFilterFunc);
  },

  /**
   * Try and focus something in the provided domain, additionally making the
   *  domain active if there is no yet an active domain.
   */
  ensureDomainFocused: function(aFocusDomain, aSuggestedBinding) {
    // make this the active focus domain if we don't have one
    if (this.popupFocusDomains) {
      if (aFocusDomain.isPopup) {
        if (!this.activeFocusDomain)
          this.activeFocusDomain = aFocusDomain;
      }
      else if (!this.prePopupActiveFocusDomain)
        this.prePopupActiveFocusDomain = aFocusDomain;
    }
    else if (!this.activeFocusDomain)
      this.activeFocusDomain = aFocusDomain;
    // make sure there is something focused in this domain if possible
    if (aFocusDomain.focusedBinding)
      return;
    if (!aSuggestedBinding)
      aSuggestedBinding = aFocusDomain.rootBinding;
    this.ponderDownNavigation(aSuggestedBinding, aFocusDomain,
                              true, 1, []);
  },

  /**
   * Climb upwards from a binding to try and find the focus domain that it
   *  belongs to.  This is intended for invocation only on focusable items
   *  (which implies bindings that are not focus domains).
   */
  findFocusDomainForBinding: function(aBinding) {
    var curNode = aBinding.domNode;
    while ((curNode = curNode.parentNode) && !("wmsyTop" in curNode)) {
      if (!("binding" in curNode))
        continue;
      var curBinding = curNode.binding;
      if ("__focusDomain" in curBinding)
        return curBinding.__focusDomain;
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
                               aFocusDomain, aFilterFunc) {
//console.log("F^ +++ ponder up", aVertical, aDir);
    var globalCssClassToStructInfo = this.globalCssClassToStructInfo;

    var curNode = aOriginBinding.domNode;
    // keep track of the last binding we saw so we can track where we came from
    var lastBinding = aOriginBinding;

    // -- Climb
    while ((curNode = curNode.parentNode) && !("wmsyTop" in curNode)) {
      if (!("binding" in curNode)) {
        continue;
      }

      var binding = curNode.binding;
      if (!aFocusDomain)
        aFocusDomain = this.findFocusDomainForBinding(binding);
//console.log("F^ climbed to binding", binding.__cssClassBaseName);
      // - figure out which child we came out of
      // The binding always ends up with a class attribute of:
      // "class-from-the-specific-binding class-the-parent-pushed-down-onto-us".
      // So we want the latter one.  The only trick is that list widgets have
      //  a specialized css class name, but we deal with that by having put a
      //  special dummy in the struct map.
      var parentClasses = lastBinding.domNode.getAttribute("class").split(" ");
      var parentChildClass = parentClasses[parentClasses.length - 1];
      var childStruct = globalCssClassToStructInfo[parentChildClass];
      // (if this is a listy child, walk up the meta to the parent)
      if (childStruct.listyChild)
        childStruct = childStruct.parentMeta;

      var curStruct = childStruct;
      var linkAttr = (aDir < 0) ? "prevFocusable" : "nextFocusable";

      // This is what we need to do:
      // 1) Base case.  We just walked up a level and popped out of either a
      //    sub-widget or widget list.  In this case, we only want to
      //    re-consider the child we just popped out of if it's listy because
      //    we need to ask it to try and iterate to a subsequent sibling of
      //    what we bailed from.
      // 2) We already did the above and now we are on a compeletely different
      //    child and so it makes sense to consider a non-listy sub-widget for
      //    focus.  We also want to consider listy things for entry from the
      //    initial position.
      // We break this into two separate loops with similar but different code
      //  because the complexity crossed a threshold given the edge cases:
      // Listy edge case! It is possible to have a vertical list in a horizontal
      //  container.  In this case, we do want to process the list-oriented /
      //  counter-container direction for just the list.

      // -- Base case: navigate within the list
      // We only want to do this if:
      // a) it's listy
      // b) it is oriented in the same direction as our requested movement.
      if (curStruct.listy && curStruct.listVertical == aVertical) {
        var dis = this;
        function kidCheck(aChildBinding) {
          if (aFilterFunc && !aFilterFunc(aChildBinding))
            return false;
          return dis.ponderDownNavigation(aChildBinding, aFocusDomain,
                                          aVertical, aDir, aStack, null,
                                          aFilterFunc);
        }
        // only iterate if the list is oriented along this direction!
        if (binding[curStruct.name + "_iterWalk"](lastBinding,
                                                  aDir, kidCheck)) {
          return true;
        }
      }
      curStruct = curStruct[linkAttr];

      if (childStruct.navVertical == aVertical) {
        while (curStruct) {
          // is this a nested item and we just hit the item itself?  if it
          //  passes the probe, we want to just directly focus.
          if (curStruct.name === "root") {
            if (aFilterFunc && !aFilterFunc(binding)) {
            }
            else {
              this.focusBinding(binding, true, aFocusDomain);
              return true;
            }
          }
          else if (curStruct.listy) {
            var dis = this, kidIterDir = aDir;
            // If the list orientation is not the same, then try and just focus
            //  the last focused thing.  If there isn't one, then just enter
            //  from the 'top' for iteration purposes, but we will still
            //  ponder-down using the original direction and what not.
            if (aVertical != curStruct.listVertical)
              kidIterDir = 1;
            function kidCheck(aChildBinding) {
              if (aFilterFunc && !aFilterFunc(aChildBinding))
                return false;
              return dis.ponderDownNavigation(aChildBinding, aFocusDomain,
                                              aVertical, aDir, aStack, null,
                                              aFilterFunc);
            }
            // only iterate if the list is oriented along this direction!
            if (binding[curStruct.name + "_iterWalk"](null, kidIterDir,
                                                      kidCheck)) {
              return true;
            }
          }
          else {
            var subBinding = binding[curStruct.name + "_element"].binding;
            if (aFilterFunc && !aFilterFunc(subBinding)) {
            }
            else if (this.ponderDownNavigation(subBinding, aFocusDomain,
                                               aVertical, aDir, aStack, null,
                                               aFilterFunc))
              return true;
          }

          curStruct = curStruct[linkAttr];
        }
      }

      aStack.push({vertical: childStruct.navVertical, tag: childStruct.name});
      // if he was the source of our current focus domain, we need to dump it
      //  and figure out our new one...
      if ("__focusDomain" in binding)
        aFocusDomain = null;
      lastBinding = binding;
    }
//console.log("F^ --- leaving without finding anything ---");
    return false;
  },

  /**
   * Attempt to transfer focus into the given binding in the (entry) direction
   *  given by aVertical and aDir.
   */
  ponderDownNavigation: function(aBinding, aFocusDomain, aVertical, aDir,
                                 aStack, aStackOffset, aFilterFunc) {
//console.log("F. +++ ponderDownNavigation +++", aBinding.__cssClassBaseName, aStack);
    if (aStackOffset == null && aStack)
      aStackOffset = aStack.length - 1;
    if (aStackOffset < 0)
      aStack = null;

    if ("__focusDomain" in aBinding)
      aFocusDomain = aBinding.__focusDomain;

    // If this is a focusable item (and it passes the filter), just focus it...
    // Unless it's a nested focusable item, in which case the container logic
    //  below should work out.
    var rootStruct = aBinding.__structMap.root;
    if ((rootStruct.firstFocusable != rootStruct) && // not nested
        ("focused" in aBinding) &&
        (!aFilterFunc || aFilterFunc(aBinding))) {
      this.focusBinding(aBinding, true, aFocusDomain);
      return true;
    }

    // If this is (not focusable and) not a container, then bail.
    if (!("navVertical" in rootStruct))
      return false;
    // (We must be some form of container...)

    // If our stack knows something, try and use it
    var childStruct, linkAttr;
    if (aStack) {
      // only use the tag if the orientation differs
      var tagVert = aStack[aStackOffset].vertical;
      var tag = aStack[aStackOffset].tag;
      if (aVertical != tagVert && (tag in aBinding.__structMap)) {
        childStruct = aBinding.__structMap[tag];
        // make sure the tag hint was focusable...
        if (!("prevFocusable" in childStruct))
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
      // Nested case; we've stumbled upon the item itself in a proper
      //  traversal ordering, select it if we can.
      // (Note that we use basically the same logic in the up traversal
      //  too.)
      if (childStruct === rootStruct) {
        if (aFilterFunc && !aFilterFunc(aBinding)) {
        }
        else {
          this.focusBinding(aBinding, true, aFocusDomain);
          return true;
        }
      }
      else if (childStruct.listy) {
        var dis = this, kidIterDir = aDir;
        // If the list orientation is not the same, enter from the 'top' for
        //  iteration purposes, but we will still ponder-down using the original
        //  direction and what not.
        if (aVertical != childStruct.listVertical)
          kidIterDir = 1;
        function kidCheck(aChildBinding) {
          if (aFilterFunc && !aFilterFunc(aChildBinding))
            return false;
          return dis.ponderDownNavigation(aChildBinding, aFocusDomain,
                                          aVertical, aDir,
                                          aStack, aStackOffset,
                                          aFilterFunc);
        }
        if (aBinding[childStruct.name + "_iterWalk"](null, kidIterDir,
                                                     kidCheck)) {
          return true;
        }
      }
      else {
        var subBinding = aBinding[childStruct.name + "_element"].binding;
        if (aFilterFunc && !aFilterFunc(subBinding)) {
        }
        else if (this.ponderDownNavigation(subBinding, aFocusDomain,
                                           aVertical, aDir,
                                           aStack, aStackOffset,
                                           aFilterFunc))
          return true;
      }

      childStruct = childStruct[linkAttr];
    }

//console.log("F. traversal of", aBinding.__cssClassBaseName, "did not focus anything");
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
      if (this.popupFocusDomains && !aFocusDomain.isPopup)
        this.prePopupActiveFocusDomain = aFocusDomain;
      else
        this.activeFocusDomain = aFocusDomain;
      activeAttrName = "wmsy-focused-active";
    }
    else {
      if (this.activeFocusDomain == aFocusDomain ||
          this.prePopupActiveFocusDomain == aFocusDomain)
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

//console.log("F! focused", aBinding.obj, "active domain",
//            this.activeFocusDomain);
//    console.log("active binding",
//            this.activeFocusDomain.focusedBinding.obj);

    aFocusDomain.rootBinding.emit_focusChanged(aBinding,
                                               aFocusDomain.rootBinding);

    aBinding.ensureVisible();
  },

  /**
   * Handle a focused binding disappearing.
   *
   * XXX At some point this may want to trigger some type of navigation to
   *  attempt to fix-up the focus to something adjacent.  We will probably
   *  needs hints from the thing doing the destroying how to handle it,
   *  though.
   */
  focusedBindingBeingDestroyed: function(aBinding) {
    var focusDomain = this.findFocusDomainForBinding(aBinding);
    focusDomain.focusedBinding = null;
    focusDomain.rootBinding.emit_focusChanged(null,
                                              focusDomain.rootBinding);
  },

  pushPopup: null,
  popPopup: null,
};
exports.FocusManager = FocusManager;

}); // end require.def
