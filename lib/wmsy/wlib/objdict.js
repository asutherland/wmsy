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
    "text!./objdict.css",
    "exports"
  ],
  function(
    $wmsy,
    $_css,
    exports
  ) {

var wy = new $wmsy.WmsyDomain({id: "objdict", domain: "wlib",
                               css: $_css});

/**
 * Parameterized widget to display the contents of an object-dictionary where
 *  the values are displayed using the provided constraint passed as a
 *  parameter.
 */
wy.defineWidget({
  name: "objdict",
  doc: "renders the contents of an object as a table as cheaply as possible",
  constraint: {
    type: "objdict",
    valueConstraint: wy.PARAM,
    // automatically filled in by libWidget:
    domain: wy.PARAM,
  },
  structure: {
  },
  protoConstructor: function(aConstraint, aGenesisDomNode) {
    this._valuePartial =
      aConstraint.domain.dtree.partialEvaluate(aConstraint.valueConstraint);
    this._valueConstraint = aConstraint.valueConstraint;
  },
  impl: {
    update: function() {
      this.__update();

      var domNode = this.domNode, doc = domNode.ownerDocument,
          valuePartial = this._valuePartial,
          valueConstraint = this._valueConstraint;
      var cssBaseName = this.__cssClassBaseName;
      var clsTable = cssBaseName + "table",
          clsRow = cssBaseName + "row",
          clsKeyCell = cssBaseName + "keyCell",
          clsValueCell = cssBaseName + "valueCell";
      while (domNode.lastChild)
        domNode.removeChild(domNode.lastChild);

      function tablify(obj) {
        var tableNode = doc.createElement("table");
        tableNode.setAttribute("class", clsTable);

        // worth considering using a fragment...
        for (var key in obj) {
          var rowNode = doc.createElement("tr");
          rowNode.setAttribute("class", clsRow);

          var keyNode = doc.createElement("td");
          keyNode.setAttribute("class", clsKeyCell);
          keyNode.textContent = key;
          rowNode.appendChild(keyNode);

          var valNode = doc.createElement("td");
          valNode.setAttribute("class", clsValueCell);
          var val = obj[key];
          // bind primitives directly via textContent
          if (val == null || typeof(val) != "object") {
            valNode.textContent = val + "";
          }
          // otherwise evaluate the partial for a widget and cram it in.
          else {
            valueConstraint.obj = val;
            var widgetFab = valuePartial.evaluate(valueConstraint);
            widgetFab.appendChild(valueConstraint, valNode);
          }
          rowNode.appendChild(valNode);

          tableNode.appendChild(rowNode);
        }
        return tableNode;
      }

      domNode.appendChild(tablify(this.obj));
    },
  },
});

}); // end define