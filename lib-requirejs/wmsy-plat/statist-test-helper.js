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

define(
  [
    "jstut/esther/statist",
    "./dom-test-helper",
    "./page-test-helper",
    "exports"
  ],
  function(
    $statist,
    $dth,
    $pth,
    exports
  ) {

exports.wrapTest = function wrapTest(testHandle, testMeta) {
  return new WmsyStatistExposure(testHandle, testMeta);
};

function identity(x) {
  return x;
};

function WmsyStatistExposure(testHandle, testMeta) {
  $statist.StatistExposure.call(this, testHandle, testMeta);

  this._contextRoot = null;
}
WmsyStatistExposure.prototype = {
  __proto__: $statist.StatistExposure.prototype,

  //////////////////////////////////////////////////////////////////////////////
  // Setup : DOMish

  inPage: function(pageFunc) {
    var test = this.test;
    test.waitUntilDone();
    function wrapper(doc, win) {
      try {
        pageFunc(doc, win);
      }
      catch(ex) {
        test.exception(ex);
      }
      test.done();
    }

    $pth.makeTestPage(this.test, wrapper);
  },

  //////////////////////////////////////////////////////////////////////////////
  // Setup : Wmsy-Specific

  /**
   * Define a specific wmsy binding as the hierarchical context.
   */
  wmsyBindingAsHierarchy: function(binding, widgetDelim) {
    this._contextRoot = binding;
    this._NodeType = binding.domNode.ownerDocument.defaultView.Node;

    this._widgetDelim = widgetDelim;
  },

  /**
   * Traverse the context binding to access sub-widgets and also name them
   *  for display purposes.
   */
  getSubWidgetAndNameIt: function(traversal) {
    var binding = this._traverseWidget(traversal, false);
    var name = Array.isArray(traversal) ? traversal.join(this._widgetDelim)
                                        : traversal;
    this._namedObjects.push({name: name, obj: binding});
    return binding;
  },

  //////////////////////////////////////////////////////////////////////////////
  // Internal Helpers : Wmsy-Specific

  /**
   * Traverse from the context root trying to net either a widget or a dom node.
   */
  _traverseWidget: function(subject, wantDomNode) {
    if (!Array.isArray(subject))
      subject = [subject];

    var curBinding = this._contextRoot, curSubj, nextSubj, elemAttrName;
    // every step but the last step must yield a binding
    for (var i = 0; i < subject.length - 1; i++) {
      curSubj = subject[i];
      nextSubj = subject[i + 1];
      // If the next subject term is a number, then they want a specific
      //  child of this (presumably) listy thing.
      if (typeof(nextSubj) === "number") {
        var iterWalkerName = curSubj + "_iterWalk";
        var curChild = null;
        // We need to call iterWalk once for each traversal.
        while (nextSubj-- >= 0) {
          // the identity func nets us children without skipping.
          curChild = curBinding[iterWalkerName](curChild, 1, identity);
        }
        curBinding = curChild;
        // we consumed the nextSubj...
        i++;
      }
      else {
        elemAttrName = (subject[i] === "root") ? "domNode"
                                               : (subject[i] + "_element");
        curBinding = curBinding[elemAttrName].binding;
      }
    }
    // any more steps to go?
    if (i === subject.length - 1) {
      elemAttrName = (subject[i] === "root") ? "domNode"
                                             : (subject[i] + "_element");
      if (wantDomNode)
        return curBinding[elemAttrName];
      return curBinding[elemAttrName].binding;
    }
    // (we must have done a child traversal)
    if (wantDomNode)
      return curBinding.domNode;
    return curBinding;
  },

  //////////////////////////////////////////////////////////////////////////////
  // Execution : DOMish

  click: function wse_click(subject) {
    var domNode = this._traverseWidget(subject, true);
    // we should rejigger dom-test-helper so it can infer its own window
    var win = domNode.ownerDocument.defaultView;
    $dth.sendMouseEvent({type: "click"}, domNode, win);

    return this;
  },

  //////////////////////////////////////////////////////////////////////////////
  // Execution : Wmsy-Specific

  //////////////////////////////////////////////////////////////////////////////
};
exports.WmsyStatistExposure = WmsyStatistExposure;

}); // end define
