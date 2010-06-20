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
  this.active = false;
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
    this.ponderUpNavigation(activeFocused, aVertical, aDir, []);
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
   */
  ponderUpNavigation: function(aOriginBinding, aVertical, aDir, aStack,
                               aFocusDomain) {
    var globalCssClassToStructInfo = this.globalCssClassToStructInfo;

    var parentWidget, curNode = aOriginBinding.domNode;
    // keep track of the last binding we saw so we can track where we came from
    var lastBinding = aOriginBinding;

    // -- Climb
    while ((curNode = curNode.parentNode) && !("wmsyTop" in curNode)) {
      if (!("binding" in curNode))
        continue;

      var binding = curNode.binding;

      // figure out which child we came out of
      var parentChildClass =
        lastBinding.domNode.getAttribute("class").split(" ")[1];
      var childStruct = globalCssClassToStructInfo[parentChildClass];

      // see if the child is listy and oriented in the direction we need
      if (childStruct.listy && childStruct.listVertical == aVertical) {
        // Since it is, see if it has anything more to offer.
        // (We need to ask it in case there is virtual list stuff going on
        //  involving unfulfilled asynchronous requests.  Although exact
        //  specifics are being punted on for now... XXX)
        var dis = this;
        function kidCheck(aChildBinding) {
          return dis.ponderDownNavigation();
        }
        if (binding[childStruct.name + "_iterWalk"](lastBinding, aDir,
                                                    kidCheck)) {
          return;
        }
      }
      // not listy or has nothing more to offer, see if there's any navigation
      //  possible within this widget...
      if (("navVertical" in childStruct) &&
          childStruct.navVertical == aVertical) {
        var linkAttr = (aDir < 0) ? "prevFocusable" : "nextFocusable";
        while (childStruct[linkAttr]) {
          childStruct = childStruct[linkAttr];

          if (this.ponderDownNavigation())
            return true;
        }

      }


      lastBinding = binding;
    }
  },

  /**
   * Attempt to transfer focus into the given binding in the (entry) direction
   *  given by aVertical and aDir.
   */
  ponderDownNavigation: function(aBinding, aVertical, aDir, aStack) {
    // If this is a focusable item, just focus it.
    if ("focused" in aBinding) {
      this.focusBinding(aBinding);
      return true;
    }

    // If this is not focusable and not a container, then bail.
      return false;
    var rootStruct = aBinding._structMap.root;
    if (!("navVertical" in rootStruct))
      return false;


    // We must be some form of container...

    var childStruct, linkAttr;
    if (aDir < 0) {
      childStruct = rootStruct.lastFocusable;
      linkAttr = "prevFocusable";
    }
    else {
      childStruct = rootStruct.firstFocusable;
      linkAttr = "nextFocusable";
    }


  },

  focusBinding: function(aBinding, aFocusDomain) {
    if (!aFocusDomain)
      aFocusDomain = this.findFocusDomainForBinding(aBinding);

    // unfocus any existing focused binding
    if (aFocusDomain.focusedBinding) {
      var oldBinding = aFocusDomain.focusedBinding;
      oldBinding.domNode.removeAttribute("wmsy-focused");
    }

    aFocusDomain.focusedBinding = aBinding;
    aBinding.domNode.setAttribute("wmsy-focused", "");
  },

  focusedBindingBeingDestroyed: function(aBinding) {

  },

  pushPopup: null,
  popPopup: null,
};
exports.FocusManager = FocusManager;
