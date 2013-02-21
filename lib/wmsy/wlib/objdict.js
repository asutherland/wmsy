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
    labelConstraint: wy.PARAM,
    labelTransformer: wy.PARAM,
    valueConstraint: wy.PARAM,
    valueTransformer: wy.PARAM,
    // automatically filled in by libWidget:
    domain: wy.PARAM,
  },
  structure: {
  },
  protoConstructor: function(aConstraint, aGenesisDomNode) {
    this._labelPartial = aConstraint.labelConstraint ?
      aConstraint.domain.dtree.partialEvaluate(aConstraint.labelConstraint) : null;
    this._labelConstraint = aConstraint.labelConstraint;

    this._labelTransformer = aConstraint.labelTransformer;

    this._valuePartial =
      aConstraint.domain.dtree.partialEvaluate(aConstraint.valueConstraint);
    this._valueConstraint = aConstraint.valueConstraint;

    this._valueTransformer = aConstraint.valueTransformer;
  },
  impl: {
    preInit: function() {
      this._liveBindings = [];
    },
    update: function() {
      this.__update();

      var domNode = this.domNode, doc = domNode.ownerDocument,
          labelPartial = this._labelPartial,
          // clone the constraint so we don't break oddly on self-recursion
          labelConstraint = $wmsy.deepSimpleClone(this._labelConstraint),
          labelTransformer = this._labelTransformer,
          valuePartial = this._valuePartial,
          // clone the constraint so we don't break oddly on self-recursion
          valueConstraint = $wmsy.deepSimpleClone(this._valueConstraint),
          liveBindings = this._liveBindings,
          valueTransformer = this._valueTransformer;
      var cssBaseName = this.__cssClassBaseName;
      var clsTable = cssBaseName + "table",
          clsRow = cssBaseName + "row",
          clsKeyCell = cssBaseName + "keyCell",
          clsValueCell = cssBaseName + "valueCell";
      while (liveBindings.length)
        liveBindings.pop().destroy();
      while (domNode.lastChild)
        domNode.removeChild(domNode.lastChild);

      var self = this;
      function tablify(obj) {
        var tableNode = doc.createElement("table");
        tableNode.setAttribute("class", clsTable);
        domNode.appendChild(tableNode);

        // worth considering using a fragment...
        for (var key in obj) {
          var val = obj[key];

          var rowNode = doc.createElement("tr");
          tableNode.appendChild(rowNode);
          rowNode.setAttribute("class", clsRow);

          // - key
          var keyNode = doc.createElement("td");
          keyNode.setAttribute("class", clsKeyCell);
          var label;
          if (labelTransformer) {
            label = labelTransformer.call(self, key, null);
            if (label === undefined)
              label = key;
          }
          else {
            label = key;
          }

          if (labelPartial && label != null && typeof(label) === "object") {
            labelConstraint.obj = label;
            var widgetFab = labelPartial.evaluate(labelConstraint);
            var binding = widgetFab.appendChild(labelConstraint, keyNode);
            liveBindings.push(binding);
          }
          else {
            // append lengths for strings and arrays
            if (typeof(val) === "string" || Array.isArray(val))
              label += " (" + val.length + ")";
            keyNode.textContent = label;
          }
          rowNode.appendChild(keyNode);

          // - value
          var valNode = doc.createElement("td");
          valNode.setAttribute("class", clsValueCell);
          rowNode.appendChild(valNode);
          if (valueTransformer) {
            var newVal = valueTransformer.call(self, val, key);
            if (newVal !== undefined)
              val = newVal;
          }
          // bind primitives directly via textContent
          if (val == null || typeof(val) !== "object") {
            valNode.textContent = val + "";
          }
          // otherwise evaluate the partial for a widget and cram it in.
          else {
            valueConstraint.obj = val;
            var widgetFab = valuePartial.evaluate(valueConstraint);
            var binding = widgetFab.appendChild(valueConstraint, valNode);
            liveBindings.push(binding);
          }
        }
      }

      tablify(this.obj);
    },
    destroy: function(keepDom, forbidKeepDom) {
      var liveBindings = this._liveBindings;
      while (liveBindings.length)
        liveBindings.pop().destroy(keepDom, forbidKeepDom);

      return this.__destroy(keepDom, forbidKeepDom);
    },
  },
});

}); // end define
