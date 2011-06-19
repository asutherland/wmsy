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

define("wmsy/wmsy-style",
  [
    "wmsy/opc/less",
    "exports"
  ],
  function(
    $less,
    exports
  ) {

var Ruleset = $less.tree.Ruleset, Rule = $less.tree.Rule,
    Definition = $less.tree.mixin.Definition,
    Directive = $less.tree.Directive, Comment = $less.tree.Comment,
    Selector = $less.tree.Selector, Element = $less.tree.Element,
    Combinator = $less.tree.Combinator;
var RE_NEWLINE = /\n/g;

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

  /**
   * Map export domains to accumulated CSS for those export domains.  We add to
   *  the CSS with each styleChew.
   *
   * The expectation is that export domains are like compilation units and will
   *  not have anything added to them after that initial evaluation.  This means
   *  we can safely operate at a greater granularity than widgets for the time
   *  being.  (Up until we support dynamic re-definition and what not for
   *  realtime experimentation.)
   */
  this.exportDomainCssBlocks = {};
  this.legacyCssBlocksNewWay = {};

  /**
   * Map export domains to list of external CSS files required by the export
   *  domains.
   */
  this.exportDomainCssDeps = {};

  this.packageBaseRelPath = "";
}
WmsyStyleBundle.prototype = {
  /**
   * Parse the CSS blob, then traverse its parse tree to perform our name
   *  mangling, then trigger css-ification.
   */
  newExportDomainWithCSS: function(domainName, exportName, lessCssBlob) {
    if (!this._lessParser) {
      this._lessParser = new ($less.Parser)();
    }

    lessCssBlob = this.__applyStandardsTransforms(lessCssBlob);

    var out = null, moot = false;
    function explodingCb(err, tree) {
      if (moot)
        return;

      if (err)
        throw new Error("less parser error: " + err);

      var env = {compress: false}, context = [];

      var combChild = new Combinator(">");
      var combConstraint = new Combinator("");

      var legalInputCombinators = / ?/;

      /**
       * Create a wmsy-normalized copy of the input ruleset; we do not mutate
       *  in place because mix-ins can end up reusing pieces of the tree
       *  verbatim and if the mix-in gets reused more than once, this obviously
       *  turns out poorly.
       *
       * Transformations performed:
       * - Convert all #id's into fully qualified class names, as they must be.
       *    Namely: ".DOMAIN--EXPORTDOMAIN--WIDGETNAME--ID", where we are
       *    given ".DOMAIN--EXPORTDOMAIN--WIDGETNAME--" as `triplePrefix`.
       * - Convert all magic selectors into appropriate attribute accesses.
       *    Namely, :focused-active/:focused-inactive/:focused turn into
       *    wmsy-prefixed attribute selectors.)
       */
      function normifyRuleset(ruleset, triplePrefix, depth) {
        var selectors = ruleset.selectors;
        var clonedSelectors = [];
        for (var iSel = 0; iSel < selectors.length; iSel++) {
          var elements = selectors[iSel].elements;
          var clonedElements = [];
          for (var iElem = 0; iElem < elements.length; iElem++) {
            var elem = elements[iElem],
                elemValue = elem.value,
                // use a constraint ("") combinator unless we change it to a
                //  child combinator below
                elemComb = combConstraint;

            // - combinators
            // Get angry if they were trying to use a combinator we don't
            //  allow.
            if (!legalInputCombinators.test(elem.combinator.value))
              console.warn("Illegal combinator '" + elem.combinator.value + "'",
                           "used in ruleset", ruleset);

            // - element prefixing, combinatoring
            if (elemValue[0] == "#") {
              elemValue = triplePrefix + elemValue.substring(1);
              // If we are not a top-level thing, then we want to use a
              //  child combinator.
              if (depth)
                elemComb = combChild;
            }

            // - transform magic selectors
            // it turns out lesscss does not further subdivide the selector
            //  bits for us, so do ugly replacement...
            if (elemValue.indexOf(":") != -1) {
              elemValue = elemValue.replace(":focused-active",
                                            "[wmsy-focused-active]")
                                   .replace(":focused-inactive",
                                            "[wmsy-focused-inactive")
                                   .replace(":focused",
                                            "[wmsy-focused]");
            }
            clonedElements.push(new Element(elemComb, elemValue));
          }

          clonedSelectors.push(new Selector(clonedElements));
        }

        var rules = ruleset.rules;
        var clonedRules = [];
        for (var iRule = 0; iRule < rules.length; iRule++) {
          var kidrule = rules[iRule];
          if (kidrule instanceof Ruleset)
            kidrule = normifyRuleset(kidrule, triplePrefix, depth + 1);
          clonedRules.push(kidrule);
        }

        // We are fighting the selector constructor here which forces
        //  combinators to be ' ' if they are ''.
        combConstraint.value = '';
        return new Ruleset(clonedSelectors, clonedRules);
      }

      // The secondary level should consist of rulesets where the first
      //  element of every selector is a "#structureNodeName".  These
      //  rulesets may in turn (because of things like :hover) have
      //  additional "#structureNodeName" references inside them somewhere.
      // We also support complex mix-ins, which should accordingly look like
      //  classes (".name").  We splice in clones of those because our name
      //  mangling mutates the rep it is handed.
      function walkWidgetKids(triplePrefix, rules) {
        var cssBits = [], i, kidrule;
        // - validation / mangling pass
        for (i = 0; i < rules.length; i++) {
          kidrule = rules[i];
          if (kidrule instanceof Definition ||
              kidrule instanceof Rule ||
              kidrule instanceof Comment)
            continue;
          if (!(kidrule instanceof Ruleset) ||
              kidrule.selectors[0].elements[0].value[0] !== "#") {
            console.error("Unacceptable kid ruleset", kidrule);
          }
          else {
            kidrule = normifyRuleset(kidrule, triplePrefix, 0);
            cssBits.push(kidrule.toCSS(context, env));
          }
        }
        return cssBits.join("\n");
      }

      // The top-level should consist of "#widgetname" things.  Its children
      //  should consist of the names of nodes in the structure tree in id
      //  form which should be rewritten to wmsy fully-qualified CSS names.
      function walkWidgets(doublePrefix, rules) {
        var cssBits = [];

        for (var i = 0; i < rules.length; i++) {
          var kidrule = rules[i];
          // - Skip definitions of mix-ins, they don't get output.
          // - Eat comments too (don't output them)
          if (kidrule instanceof Definition ||
              kidrule instanceof Comment)
            continue;
          // - Allow variable declarations, but no other top-level rules.
          if (kidrule instanceof Rule) {
            if (kidrule.name[0] != "@")
              console.error("Unacceptable top-level widget ruleset", kidrule);
            continue;
          }
          // - Media queries
          // media queries appear as tree.Directives, and, as CSS goes, are
          //  atypicaly allowed to be nested-ish things, so we just want to
          //  perform recursive normalization like it was a top-level, but
          //  wrapped.
          if (kidrule instanceof Directive) {
            cssBits.push(kidrule.name + "{\n" +
                         walkWidgets(doublePrefix, kidrule.ruleset.rules) +
                         "\n}\n");
            continue;
          }
          else if (!(kidrule instanceof Ruleset)) {
            console.error("Unacceptable top-level widget ruleset", kidrule);
            continue;
          }
          // -- Rulesets => either widgets or mix-ins
          for (var iSel = 0; iSel < kidrule.selectors.length; iSel++) {
            if (kidrule instanceof Ruleset &&
                kidrule.selectors[iSel].elements[0].value[0] == ".") {
              // (do nothing for this case)
            }
            // XXX for the elements check, we really need to be looking for
            //  the element itself being complex; it doesn't split them further
            //  :(
            else if (kidrule.selectors[iSel].elements.length != 1 ||
                     kidrule.selectors[iSel].elements[0].value[0] != "#") {
            }
            else {
              var myName =
                kidrule.selectors[iSel].elements[0].value.substring(1);
              cssBits.push(
                walkWidgetKids(doublePrefix + myName + "--", kidrule.rules));
            }
          }
        }

        return cssBits.join("\n\n");
      }

      var evaledTree = tree.eval( {frames: []} );
      //console.log("lesscss tree", exportName, evaledTree);
      out = walkWidgets("." + domainName + "--" + exportName + "--",
                        evaledTree.rules);
    }

    this._lessParser.parse(lessCssBlob, explodingCb);

    if (out === null) {
      moot = true;
      throw new Error("less parser went async; not cool.");
    }

    var exportDomainQName = domainName + "-" + exportName;
    var cssBlock = out;
    if (!(exportDomainQName in this.exportDomainCssBlocks))
      this.exportDomainCssBlocks[exportDomainQName] = cssBlock;
    else
      this.exportDomainCssBlocks[exportDomainQName] += "\n" + cssBlock;

    //console.log("chewed css\n", out);
  },

  //@documentedOn[WmsyExportDomain]
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

    // normalize standardsy stuff.
    lessCssBlob = this.__applyStandardsTransforms(lessCssBlob);

    this.styleBases[name] = lessCssBlob;
    this.styleAccumulated =
      (this.styleAccumulated ? (this.styleAccumulated + "\n") : "") +
      lessCssBlob;
  },

  //@documentedOn[WmsyExportDomain]
  defineRawCss: function(aExportDomainQName, name, cssBlock) {
    if (Array.isArray(cssBlock))
      cssBlock = cssBlock.join("\n");
    if (!(aExportDomainQName in this.exportDomainCssBlocks))
      this.exportDomainCssBlocks[aExportDomainQName] = cssBlock;
    else
      this.exportDomainCssBlocks[aExportDomainQName] += "\n" + cssBlock;
  },

  //@documentedOn[WmsyExportDomain]
  referenceExternalStylesheet: function(exportDomainQName, path) {
    if (!(exportDomainQName in this.exportDomainCssDeps))
      this.exportDomainCssDeps[exportDomainQName] = [];
    this.exportDomainCssDeps[exportDomainQName].push(path);
  },

  //@documentedOn[WmsyExportDomain]
  setPackageBaseRelPath: function(relPath) {
    this.packageBaseRelPath = relPath;
  },

  /** Delimiter for use by lessParse that is unlikely to occur in content. */
  _HACK_DELIM: "/*hAcKyDeLimeTer#!#!@_#_*/",

  /**
   * Run some text through the less CSS parser and return the result.
   *
   * The less parser exposes an async API but we definitely don't want that
   *  happening right now, so we throw exceptions if anything tries to go
   *  async.
   *
   * @args[
   *   @param[context String]{
   *     less-css to evaluate to provide mix-ins and variables, but which should
   *     not show up in the output.
   *   }
   *   @param[lessCssBlock String]{
   *     less-css to evaluate and return the output of evaluation.
   *   }
   * ]
   * @return[String]{
   *   The less-css processed CSS; the output should be totes legal CSS.
   * }
   */
  lessParse: function(context, lessCssBlock) {
    var out = null, moot = false, HACK_DELIM = this._HACK_DELIM;
    function explodingCb(err, tree) {
      if (moot)
        return;

      if (err)
        throw new Error("less parser error: " + err);

      out = tree.toCSS();
      // Eat the context output that we don't care about.
      out = out.substring(out.indexOf(HACK_DELIM) + HACK_DELIM.length);
    }

    // use _HACK_DELIM to separate the stuff we don't want to return from the
    //  stuff we do want to return.
    this._lessParser.parse(context + HACK_DELIM + lessCssBlock,
                           explodingCb);

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
     "display: -moz-box; display: -webkit-box; display: -o-box; display: box;"],
    [/box-(.+) *: *(.+);/g,
     "-moz-box-$1: $2; -webkit-box-$1: $2; -o-box-$1: $2; box-$1: $2;"],
    [/^ *border-radius *: *(.+);/g,
     "-moz-border-radius: $1; -webkit-border-radius: $1; border-radius: $1;"],
    // - transition property mappings; needs to happen before transition regex
    // transform, but not any of its variations
    [/(transition-property:.+)transform( *[,;].+)/,
     "$1-moz-transform,-webkit-transform,-o-transform$2"],
    // not a standard, do not generate unscoped transitions!
    [/transition-(.+) *: *(.+);/g,
     "-moz-transition-$1: $2; -webkit-transition-$1: $2; -o-transition-$1: $2;"],
    // not a standard, do not generate unscoped transforms!
    [/transform(-.+)? *: *(.+);/g,
     "-moz-transform$1: $2; -webkit-transform$1: $2; -o-transform$1: $2;"],
  ],

  __applyStandardsTransforms: function(value) {
    var pendingStandards = this.__pendingStandardTransforms;
    for (var iStd = 0; iStd < pendingStandards.length; iStd++) {
      value = value.replace(pendingStandards[iStd][0],
                            pendingStandards[iStd][1]);
    }
    return value;
  },

  __whitespaceCleanupRE: /\n */g,
  __styleChewLevel: function(aCssStrings, aStyleLevelDef,
                             aActiveSelector, aCssClassBaseName,
                             aLastNuevoSelector, aNuevoStrings, aIndent) {
    var deferredUp = null;
    for (var key in aStyleLevelDef) {
      var value = aStyleLevelDef[key];

      // lists of strings
      if (Array.isArray(value))
        value = value.join("\n");
      var rawvalue = value;
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
        aNuevoStrings.push(aIndent +
                           rawvalue.replace(RE_NEWLINE,
                                            "\n" + aIndent) +
                           aIndent + "\n");
      }
      else {
        var nuevokey, deferUp = false, nuevoPushTo, useIndent, useOutterDent;
        switch (key[0]) {
          case ":":
          case "[":
            nuevokey = aLastNuevoSelector + key;
            deferUp = true;
            if (!deferredUp)
              deferredUp = [];
            nuevoPushTo = deferredUp;
            useIndent = aIndent.substring(2);
            useOutterDent = aIndent.substring(4);
            break;
          default:
            nuevokey = "#" + key;
            nuevoPushTo = aNuevoStrings;
            useIndent = aIndent + "  ";
            useOutterDent = aIndent;
            break;
        }
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
          nextSelector += (nextSelector ? " > ." : ".") +
                            aCssClassBaseName + key;

        if (typeof(value) == "string") {
          aCssStrings.push(nextSelector + " {\n  " +
                           value.trim().replace(this.__whitespaceCleanupRE,
                                                "\n  ") +
                           "\n}\n");
          nuevoPushTo.push(useOutterDent + nuevokey + " {");
          nuevoPushTo.push(useIndent +
                           rawvalue.replace(RE_NEWLINE,
                                            "\n" + useIndent));
          nuevoPushTo.push(useOutterDent + "}");
        }
        else {
          nuevoPushTo.push(useOutterDent + nuevokey + " {");
          var kidses = this.__styleChewLevel(aCssStrings, value, nextSelector,
                                aCssClassBaseName,
                                nuevokey, nuevoPushTo, useIndent + "  ");
          nuevoPushTo.push(useOutterDent + "}");
          if (kidses)
            nuevoPushTo.push.apply(nuevoPushTo, kidses);
        }
      }
    }
    return deferredUp;
  },

  /**
   * Process the legacy 'style' definition of a widget; this should now come
   *  from a slurped lesscss file instead.
   *
   * @return[String]{
   *   A CSS string containing all of our compiled styles.
   * }
   */
  styleChew: function(aWidgetName,
                      aStyleDef, aCssClassBaseName, aExportDomainQName) {
    var cssStrings = [];
    if (aStyleDef) {
      var nuevoStrings = ["#" + aWidgetName + " {"];
      this.__styleChewLevel(cssStrings, aStyleDef, "", aCssClassBaseName,
                            "", nuevoStrings, "  ");
      nuevoStrings.push("}");
      var nuevoBlock = nuevoStrings.join("\n");

      if (!(aExportDomainQName in this.legacyCssBlocksNewWay)) {
        this.legacyCssBlocksNewWay[aExportDomainQName] =
          this.styleAccumulated || "";
      }
      this.legacyCssBlocksNewWay[aExportDomainQName] += "\n\n" + nuevoBlock;
    }

    var cssBlock = cssStrings.join("\n");
    // we only need to pass things through the less parser if it exists
    if (this._lessParser && this.styleAccumulated)
      // XXX we really want the less parser to internalize the accumulated
      //  style and not have to have it re-parse it every time.
      cssBlock = this.lessParse(this.styleAccumulated, cssBlock);

    if (!(aExportDomainQName in this.exportDomainCssBlocks))
      this.exportDomainCssBlocks[aExportDomainQName] = cssBlock;
    else
      this.exportDomainCssBlocks[aExportDomainQName] += "\n" + cssBlock;

    return cssBlock;
  },

  /**
   * Inject all required style stuff into the given document for the given
   *  export domain.
   */
  bindIntoDocument: function(exportDomainQName, doc) {
    // - inject inline style
    var styleElem = doc.createElement("style");
    styleElem.setAttribute("type", "text/css");
    // provide some useful debugging info
    styleElem.setAttribute("exportDomain", exportDomainQName);
    // transform URLs
    var cssBlock = this.exportDomainCssBlocks[exportDomainQName];
    cssBlock = cssBlock.replace(/url\(/g, "url(" + this.packageBaseRelPath);
    styleElem.textContent = cssBlock;
    var headTags = doc.getElementsByTagName("head");
    if (headTags.length == 0) {
      var headTag = doc.createElement("head");
      doc.documentElement.insertBefore(headTag,
                                       doc.documentElement.firstChild);
      headTags = [headTag];
    }
    headTags[0].appendChild(styleElem);

    if (exportDomainQName in this.legacyCssBlocksNewWay) {
      console.warn("You are using wmsy 'style' definitions on the widget " +
                   "for " + exportDomainQName + ", stop it.  Put the " +
                   "following in a CSS file and then load it using a 'text!' " +
                   "dependency:");
      console.log(this.legacyCssBlocksNewWay[exportDomainQName]);
    }

    // - inject any external css dep references...
    if (exportDomainQName in this.exportDomainCssDeps) {
      var deps = this.exportDomainCssDeps[exportDomainQName];
      for (var i = 0; i < deps.length; i++) {
        styleElem = doc.createElement("link");
        styleElem.setAttribute("rel", "stylesheet");
        styleElem.setAttribute("type", "text/css");
        styleElem.setAttribute("href", this.packageBaseRelPath + deps[i]);
        headTags[0].appendChild(styleElem);
      }
    }
  },
};
exports.WmsyStyleBundle = WmsyStyleBundle;

}); // end define
