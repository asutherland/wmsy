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
 * Centralize the logic relating to styling and theming.
 **/

require.def("wmsy/wmsy-style",
  [
    "wmsy/opc/less",
    "exports"
  ],
  function(
    $less,
    exports
  ) {

/**
 * Keeps tracks of the styles associated with a wmsy domain.  Responsible for
 *  all transformations, applications of styles to documents, updates when
 *  styling is changed, and the like.
 *
 * We are not responsible for CSS class names; they are assigned by the
 *  WmsyDomain based on its unique-naming heuristics and we use them as-is.
 */
function WmsyStyleBundle() {
  /**
   * Maps names to strings of less-css syntax.  (We normalize everything into
   *  a string before assignment into this dictionary.)
   */
  this.styleBases = {};
  this.styleAccumulated = null;

  /**
   * The less-css parser.  We instantiate this when the first style base is
   *  registered and feed it the style bases as they are defined.  In the event
   *  of a restyling or what not we 'reset' the parser and feed it the active
   *  style bases and then try and fix up the CSS.
   *
   * Note that the semantics for constructing and using the less parser are
   *  somewhat unusual... we don't get an instance of the parser so much as
   *  a dictionary returned by the constructor.  It has a parse method, though,
   *  which is all we really care about.
   */
  this._lessParser = null;
}
WmsyStyleBundle.prototype = {
  defineStyleBase: function(name, lessCssBlob) {
    if (!this._lessParser) {
      this._lessParser = new ($less.Parser)();
    }

    if (typeof(lessCssBlob) !== "string") {
      if (Array.isArray(lessCssBlob))
        lessCssBlob = lessCssBlob.join("\n");
      else
        throw new Error("don't know how to coerce non-strings/non-arrays yet!");
    }

    this.styleBases[name] = lessCssBlob;
    this.styleAccumulated =
      (this.styleAccumulated ? (this.styleAccumulated + "\n") : "") +
      lessCssBlob;
  },

  /**
   * Run some text through the less CSS parser and return the result.
   *
   * The less parser exposes an async API but we definitely don't want that
   *  happening right now, so we throw exceptions if anything tries to go
   *  async.
   */
  lessParse: function(lessCssBlock) {
    var out = null, moot = false;
    function explodingCb(err, tree) {
      if (moot)
        return;

      if (err)
        throw new Error("less parser error: " + err);

      out = tree.toCSS();
    }

    this._lessParser.parse(lessCssBlock, explodingCb);

    if (out === null) {
      moot = true;
      throw new Error("less parser went async; not cool.");
    }
    return out;
  },

  /**
   * Pending CSS standard transform helpers.
   */
  __pendingStandardTransforms: [
    [/display *: *box;/,
     "display: -moz-box; display: -webkit-box; display: box;"],
    [/box-(.+) *: *(.+);/g,
     "-moz-box-$1: $2; -webkit-box-$1: $2; box-$1: $2;"],
    [/border-radius *: *(.+);/g,
     "-moz-border-radius: $1; -webkit-border-radius: $1; border-radius: $1;"],
  ],

  __whitespaceCleanupRE: /\n */g,
  __styleChewLevel: function(aCssStrings, aStyleLevelDef,
                             aActiveSelector, aCssClassBaseName) {
    for (var key in aStyleLevelDef) {
      var value = aStyleLevelDef[key];

      // lists of strings
      if (typeof(value) == "object" && "length" in value)
        value = value.join("\n");
      if (typeof(value) == "string") {
          // normalize certain pending standards...
          var pendingStandards = this.__pendingStandardTransforms;
          for (var iStd = 0; iStd < pendingStandards.length; iStd++) {
            value = value.replace(pendingStandards[iStd][0],
                                  pendingStandards[iStd][1]);
          }
      }

      // _ means this thing applies to the parent without any extra context
      if (key == "_") {
        aCssStrings.push(aActiveSelector + " {\n" +
                         value.replace(this.__whitespaceCleanupRE, "\n  ") +
                         "}\n");
      }
      else {
        if (key == ":focused")
          key = '[wmsy-focused]';
        else if (key == ":focused-active")
          key = '[wmsy-focused-active]';
        else if (key == ":focused-inactive")
          key = '[wmsy-focused-inactive]';

        var nextSelector = aActiveSelector;
        if (key[0] == ":" || key[0] == "[")
          nextSelector += key;
        else
          nextSelector += (nextSelector ? " ." : ".") + aCssClassBaseName + key;

        if (typeof(value) == "string") {
          aCssStrings.push(nextSelector + " {\n  " +
                           value.trim().replace(this.__whitespaceCleanupRE,
                                                "\n  ") +
                           "\n}\n");
        }
        else {
          this.__styleChewLevel(aCssStrings, value, nextSelector,
                                aCssClassBaseName);
        }
      }
    }
  },

  /**
   * Process the 'style' definition of a widget.
   *
   * @return[String]{
   *   A CSS string containing all of our compiled styles.
   * }
   */
  styleChew: function(aStyleDef, aCssClassBaseName) {
    var cssStrings = [];
    if (aStyleDef)
      this.__styleChewLevel(cssStrings, aStyleDef, "", aCssClassBaseName);

    var cssBlock = cssStrings.join("\n");
    // we only need to pass things through the less parser if it exists
    if (this._lessParser)
      // XXX we really want the less parser to internalize the accumulated
      //  style and not have to have it re-parse it every time.
      return this.lessParse(this.styleAccumulated + "\n" + cssBlock);
    else
      return cssBlock;
  },

};
exports.WmsyStyleBundle = WmsyStyleBundle;

}); // end require.def
