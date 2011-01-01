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
 * Provide a simple, basic popup.
 **/

define("wmsy/wlib/popup",
  [
    "wmsy/wmsy-core",
    "exports"
  ],
  function(
    $wmsy,
    exports
  ) {

var wy = new $wmsy.WmsyDomain({id: "popup", domain: "wlib"});

/**
 * The popup widget is bound to an object with a resolved widget factory,
 *  the requisite constraint basis, and the object that was used to resolve to
 *  the widget factory.  This all gets passed in so we can re-set the "obj"
 *  attribute of the constraint when we perform the actual binding.  (Normally
 *  this state is maintained during the time between when the factory is
 *  resolved and the binding is instantiated, but we can't guarantee for this
 *  general situation.
 */
wy.defineWidget({
  name: "simple-popup",
  doc: "Simple popup that does not point at or reference the origin widget.",
  constraint: {
    type: "popup",
  },
  structure: {
    contents: {},
  },
  impl: {
    postInitUpdate: function() {
      this.obj.constraint.obj = this.obj.obj;
      this.payloadBinding =
        this.obj.widgetFactory.bindOnto(this.obj.constraint,
                                        this.contents_element);
    },
    destroy: function() {
      this.payloadBinding.destroy.apply(this.payloadBinding, arguments);
      this.__destroy();
    },
    done: function() {
      this.payloadBinding.done();
    },
  },
  style: {
    root: [
      "background-color: rgba(0, 0, 0, 0.6);",
      "border-radius: 4px;",
      "border: 4px solid transparent;",
    ],
    contents: [
      "background-color: white;",
      "border-radius: 4px;",
      "padding: 2px;",
    ],
  },
});

}); // end define
