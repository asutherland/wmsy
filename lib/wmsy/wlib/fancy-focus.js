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
 * Portions created by the Initial Developer are Copyright (C) 2010
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
 * Implements a fancy focus ring
 **/

define("wmsy/wlib/fancy-focus",
  [
    "wmsy/wmsy-core",
    "wmsy/dom-geom",
    "wmsy/platfo",
    "exports"
  ],
  function(
    $wmsy,
    $domGeom,
    $platfo,
    exports
  ) {

var wy = new $wmsy.WmsyDomain({id: "fancy-focus", domain: "wlib"});

wy.defineWidget({
  name: "fancy-focus",
  doc: "animated focus ring",
  constraint: {
    type: "focus-ring",
  },
  structure: {
  },
  impl: {
    postInit: function() {
    },
    focusOnBinding: function(binding) {
      var targetNode = binding.domNode;
      var bounds = targetNode.getBoundingClientRect();
      var win = targetNode.ownerDocument.defaultView;

      var domNode = this.domNode;
      // hide if they don't want the focus ring, but keep our position
      //  up-to-date so we can fly to the next target if it wants us.
      domNode.style.display = binding.__focusRing ? "block" : "none";
      domNode.style.top = (bounds.top + win.scrollY) + "px";
      domNode.style.left = (bounds.left + win.scrollX) + "px";
      domNode.style.height = (bounds.height) + "px";
      domNode.style.width = (bounds.width) + "px";

      // Set our border-radius based on the effective border radius of the
      //  binding.
      // XXX we are assuming symmetric borders.
      var cstyle = win.getComputedStyle(targetNode);
      var radius = cstyle.getPropertyValue("border-top-left-radius");
      domNode.style.setProperty($platfo.borderRadius, radius, null);
    },
    focusLost: function() {
      this.domNode.style.display = "none";
    }
  },
  style: {
    root: [
      // this causes us to not eat clicks! vitally important!
      "pointer-events: none;",
      "box-shadow: 0 0 6px 3px orange;",
      "position: absolute;",
      "z-index: 1000;",
      "transition-property: left, top, width, height;",
      "transition-duration: 0.2s;",
      "left: -10; top: -10; height: 5px; width; 5px;",
    ],
  },
});

}); // end define
