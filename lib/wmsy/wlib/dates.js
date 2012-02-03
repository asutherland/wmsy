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
 * Provide basic date formatting widgets.
 **/

define(
  [
    "wmsy/wmsy-core",
    "exports"
  ],
  function(
    $wmsy,
    exports
  ) {

var wy = new $wmsy.WmsyDomain({id: "dates", domain: "wlib", css: ""});

wy.defineWidget({
  name: "relative-date",
  doc: "Display a date relative to now (in broad strokes).",
  constraint: {
    type: "relative-date",
  },
  structure: wy.flow(""),
  impl: {
    postInitUpdate: function() {
      var date = this.obj;
      if (!date)
        return;
      var now = new Date(Date.now());

      var timeBit = date.toTimeString().substring(0, 5);

      var dateStr;
      if (now.getFullYear() == date.getFullYear() &&
          now.getMonth() == date.getMonth()) {
        var dayDelta = now.getDate() - date.getDate();
        if (dayDelta == 0) {
          dateStr = "today, " + timeBit;
        }
        else if (dayDelta == 1) {
          dateStr = "yesterday, " + timeBit;
        }
        else {
          dateStr = date.toDateString() + " " + timeBit;
        }
      }
      else {
        dateStr = date.toDateString() + " " + timeBit;
      }

      this.domNode.textContent = dateStr;
    },
  },
});

});
