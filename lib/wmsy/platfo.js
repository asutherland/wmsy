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
 * Platform identification logic for the purposes of letting code that uses
 *  pending standards to figure out what name it should use for stuff.  Wmsy
 *  does not have any concept of graceful degradation, so we do not attempt
 *  to detect support for specific features.  Well, we will start figuring out
 *  what has gone standard and not at some point.
 *
 * I am aware that this is one of those "if you are doing it, you are probably
 *  doing it wrong" type things; patches appreciated.
 **/

define("wmsy/platfo", ["exports"], function(exports) {

// are we in a jetpack (sandbox)?
if (!("navigator" in this))
  exports.platform = "moz";
else if (navigator.userAgent.indexOf("WebKit") != -1)
  exports.platform = "webkit";
else if (navigator.userAgent.indexOf("Trident") != -1)
  exports.platform = "ie";
else if (navigator.userAgent.indexOf("Opera") != -1)
  exports.platform = "o";
else
  exports.platform = "moz";

if (exports.platform == "webkit") {
  exports.transitionEnd = "webkitTransitionEnd";
  exports.transitionPropAttr = "-webkit-transition-property";
  exports.transitionDurAttr = "-webkit-transition-duration";

  exports.transformPropAttr = "-webkit-transform";

  exports.borderRadius = "-webkit-border-radius";
}
else if (exports.platform == "o") {
  exports.transitionEnd = "oTransitionEnd";
  // I am making these up; no idea.
  exports.transitionPropAttr = "oTransitionProperty";
  exports.transitionDurAttr = "oTransitionDuration";
  exports.transformPropAttr = "oTransform";
}
else {
  exports.transitionEnd = "transitionend";
  exports.transitionPropAttr = "MozTransitionProperty";
  exports.transitionDurAttr = "MozTransitionDuration";

  exports.transformPropAttr = "MozTransform";

  exports.borderRadius = "-moz-border-radius";
}

}); // end define
