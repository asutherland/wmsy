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
 * Unified error handling of user-induced failures; be able to do something
 *  friendly and useful when something bad happens rather than throwing a
 *  baroque error message.
 *
 * To simplify control flow analysis and code understanding, all error handling
 *  methods return an error suitable for throwing.  So the idiom is always
 *  "throw $exploders.badSomething(args);".
 *
 * For now, the assumption is that the user is always a developer and the
 *  developer will simply run with break-on-exception active and the
 *  debugger context will be sufficient.  Because the throw happens after we
 *  return, our value add is currently just nice messages logged to the console.
 *
 * In the future we would likely want a few modes of operation:
 *
 * @itemize[
 *   @item{
 *     Productized mode where failures are unexpected and should be contained
 *     so as not to break the whole UI.  The useful thing for the developer is
 *     some kind of debug dump summarizing the problem, potentially with
 *     a level of detail that is unlikely to ever include private detail and
 *     then a more extensive level of detail that could leak data and so
 *     needs user redaction or acknowledgement of acceptance of providing the
 *     data.
 *   }
 *   @item{
 *     Hand-holding developer mode.  Attempt to automatically infer the likely
 *     reasons for the error and suggest fixes, with a "conservative" summary of
 *     the context.  Conservative means we want to avoid accidentally sucking
 *     down the entire object model into the error representation.
 *   }
 *   @item{
 *     Native debugger support, the same as we have now.  Just enable kicking
 *     the developer into the debugger without trying to save them from reality.
 *     Ideally we can then provide debugger plugins or JS console accessible
 *     helpers to make working in this fashion easier and with fewer rote
 *     actions required to figure out what is going on.
 *   }
 * ]
 **/

define("wmsy/exploders",
  [
    "exports"
  ],
  function(
    exports
  ) {

////////////////////////////////////////////////////////////////////////////////
// Widget Definition Explosions

exports.badFormatterSpec = function(aSpec) {
  return new Error("Unacceptable formatter spec: " + aSpec);
};

exports.badComputedBindName = function(aProtoFab, aBindAttr) {
  return new Error("Computed binding references nonexistent function " +
                   "'" + aBindAttr.bindAttr + "' that needs to exist in " +
                   "impl.");
};

exports.badViewSliceDecoratorKind = function(aDecorMaker) {
  return new Error(aDecorMarker.kind + " is not an acceptable view " +
                   "slice decoration type.");
};

exports.badWmsyObjDecoratorKind = function(aObjDecorator) {
  return new Error("Unsupported WmsyObjDecorator kind: " +
                     aObjDecorator.kind);
};

exports.popupNeedsPopupWidget = function(popupDef, popupName) {
  return new Error("Popup " + popupName + " needs a popupWidget!");
};

exports.popupBadPopupWidget = function(popupName) {
  return new Error("Popup " + popupName + " has an illegal value for " +
                   "its popupWidget!");
};

exports.popupNeedsConstraint = function(popupDef, popupName) {
  return new Error("Popup " + popupName + " needs a constraint!");
};

exports.badFocusValue = function(aFocusDef) {
  return new Error("Illegal 'focus' value: " + aFocusDef);
};

exports.focusDefMissingChildren = function(aFocusDef) {
  return new Error("You need to list the container's focusable children " +
                     "in their focus order.");
};

exports.focusDefNoSuchChild = function(aWidgetDef, aFocusDef, aChildName) {
  return new Error("you are claiming " + aWidgetDef.name +
                   " has a focusable child '" + aChildName + "' but" +
                   " that is a lie.");
};

exports.widgetDefMissingConstraint = function(aWidgetDef) {
  return new Error("You need to provide a constraint for '" +
                   aWidgetDef.name + "'!");
};

exports.widgetDefEmptyConstraint = function(aWidgetDef) {
  return new Error("You need to provide a constraint for '" +
                   aWidgetDef.name + "'!");
};

exports.badEventNodeReference = function(nodeName) {
  return new Error("Unknown structure node: " + nodeName +
                   " to bind event to!");
};

////////////////////////////////////////////////////////////////////////////////
// Runtime Explosions

/**
 * Report that we were unable to resolve a constraint to bind a widget into
 *  existence.  We infer binding context from the containing parent node.
 */
exports.failedWidgetResolution = function(aParentDOMNode, aConstraintBasis) {
  console.error(
    "Failed to resolve widget fab from partial evaluation of:",
    aConstraintBasis);
  return new Error("Failure to resolve; see logged error.");
};

/**
 * A widget is trying to bind an instance of its own type with the same object
 *  instance as a child of itself.
 */
exports.selfRecursiveBinding = function(aBinding, aNodeName) {
  return new Error("self-recursive binding detected: " +
                   aBinding.__cssClassBaseName + aNodeName);
};

/**
 * Failure to map a CSS class to a wmsy struct meta (at runtime).
 */
exports.missingStructMeta = function(aDomNode, aCurClass) {
  return new Error("Struct meta does not exist for " + aCurClass);
};

exports.formFieldNoFocusEnable = function(aFakeBinding) {
  return new Error("form fields cannot have individually controllable focus");
};

exports.bindingExplicitPopupLacksPosition = function(aExtraPosition) {
  return new Error("an explicitly bound popup needs a 'position' specified " +
                   "with 'top' and 'left' fields!");
};

////////////////////////////////////////////////////////////////////////////////
// Parameterized Widget (Runtime) Hooks (for everybody!)

/**
 * A parameterized widget (like the virtual list widget), uses this to report
 *  bad parameters.
 *
 * @args[
 *   @param[opts @dict[
 *     @key[name String]{
 *       The (key) name of the parameter that has a bad value.
 *     }
 *     @key[value Object]{
 *       The value that was provided for the parameter.
 *     }
 *     @key[legalValuesInKeys Object]{
 *       A reference to a dictionary object whose keys are the legal values.
 *       The idea is that there might be other variations on this, like
 *       legalValuesInList or such.
 *     }
 *     @key[domNode #:optional DOMNode]{
 *       The DOM node that the parameterized widget is being bound onto.  This
 *       provides us with context since we can then walk up that DOM node to
 *       find the widget that is triggering the binding of the parameterized
 *       widget.
 *     }
 *   ]]
 * ]
 */
exports.badWidgetParameterValue = function(opts) {
  return new Error("Bad parameter value: " + JSON.stringify(opts));
};


////////////////////////////////////////////////////////////////////////////////


}); // end define
