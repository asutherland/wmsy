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
 * Objects that exist purely for the purposes of documentation.
 **/

define("wmsy/wmsy-doc-protocols", [], function() {

var WidgetProto_WidgetBase_DOC = {
  /**
   * A getter that returns the element for the widget.
   */
  $_element: null,

  /**
   * The decision tree Partial for this subwidget.
   */
  $_partial: null,
};

var WidgetProto_Widget_DOC = {
  /**
   * Set/change the object that is being displayed at the given widget point.
   *  This will fast-path out if it turns out the object you are setting is
   *  already what the widget is bound to.  If you want to update the
   *  representation of that object then you should call |update| on the
   *  binding, not call us.
   */
  $_set: function(aVal) {
  },
};

var WidgetProto_WidgetList_DOC = {
  __proto__: WidgetProto_WidgetBase_DOC,

  /**
   * Ensure that the given child binding is visible.  This is only relevant
   *  to this widget list if its scroll length along its designated axis
   *  exceeds its client length (aka scrolling can happen).
   * This is a 'listy' behavior and exists primarily so more complicated widgets
   *  that need to control scrolling can do so.
   */
  $_ensureVisible: function(aBinding, aOriginBinding) {
  },

  /**
   * Iterate over the children of this list calling a callback for each node.
   *  Return once the callback returns non-false or we run out of children.
   *
   * @args[
   *   @param[aStart WidgetBinding]{
   *     The child binding to start from.  If null, we enter the list of
   *     children from the front or back depending on the value of aDir.
   *   }
   *   @param[aStart @oneof[
   *     @case[1]{
   *       Traverse in a down/right-ward direction.  If `aStart` is null, enter
   *       the list of widgets from the front (top/left).
   *     }
   *     @case[-1]{
   *       Traverse in an up/left-ward direction.  If `aStart` is null, enter
   *       the list of widgets from the back (bottom/right).
   *     }
   *   ]]
   *   @param[aCallback @func[
   *     @args[
   *       @param[aBinding WidgetBinding]{
   *         The widget binding the iterator is currently considering.
   *       }
   *     ]
   *     @retval[@oneof[
   *       @case[false]{
   *         Not what we were looking for, keep iterating.
   *       }
   *       @default[Object]{
   *         What we were looking for!  Terminate iteration and return the
   *         current binding to the caller.
   *       }
   *     ]
   *   ]]
   * ]
   */
  $_iterWalk: function(aStart, aDir, aCallback) {
  },

  /**
   * A reference to the last child binding of this list that was focused or had
   *  a descendent focused.  This is only created on instances where a
   *  descendent gets focused but will always exist on the prototype.
   */
  $_lastFocused: null,
};

/**
 * Document what you expect to see on a per-widget prototype (things that vary
 *  per-widget, as opposed to things that are on all widgets and can be found
 *  on the real |WidgetBaseProto| and its documentation.)
 */
var WidgetProto_DOC = {
  /**
   * The string we prefix to the class names we use on the widget DOM nodes.
   *  We also prefix the CSS rules we generate (or things wouldn't work).
   * This will be of the form "DOMAIN-CONTEXT-NAME-" where domain is the
   *  |WmsyDomain|'s name, context identifies the jetpack, and name is the
   *  jetpack's name for the widget.
   */
  __cssClassBaseName: "",

  /**
   * The CSS class name of the root node.  Stashed here because the root is not
   *  part of the document fragment.
   */
  __rootCssClassName: "",
  /**
   * The element type of the root node.  Stashed here because the root is not
   *  part of the document fragment.
   */
  __rootElementType: "",

  /**
   * The string representation of the CSS for the widget.  This gets inserted
   *  into the document by the |WidgetFactory|.
   */
  __flattenedCssString: "",

  /**
   * Provides meta-information about every key seen in the 'structure' widget
   *  definition.
   */
  __structMap: {},

  /**
   * Maps CSS class names back to the structured map info they come from.  This
   *  is used in event handling.
   */
  __cssClassToStructInfo: {},

  /**
   * A list of initialization functions to invoke when initializing the widget.
   *  All functions are invoked prior to calls to preInit and update with 'this'
   *  properly initialized.
   */
  __initers: [],

  /**
   * A list of updater functions to invoke when updating this widget.  Each
   *  bound widget puts something in here.  |__update| calls these with the
   *  proper 'this' context when invoked.  It's regrettable that we have to
   *  resort to this but without better code generation capabilities than eval
   *  this is where we find ourselves.  Hope it JITs!
   */
  __updaters: [],

  /**
   * A list of destructor functions to invoke when destorying this widget.
   *  |__destroy| calls these with the proper 'this' context when invoked.
   */
  __destructors: [],

  /**
   * The WidgetFactory instance associated with this widget type.  This exists
   *  to allow us to detect recursive binding attempts right now.  (In theory,
   *  fromConstraint could allow intentional, harmless, bounded self-recursion,
   *  but that would be a bad idea anyways.)
   */
  __factory__: null,

  /**
   * Update the widget to reflect changes to the underlying object.
   *
   * If the widget implementation does not define an 'update' method, this will
   *  just be an alias to the |__update| automatically created method.  If the
   *  widget implementation does define this method, it should call the
   *  |__update| method before it returns.
   *
   * aRecursive=false: Should all nested widgets be updated as well?
   *     Sub-widgets are always automatically updated.
   */
  update: function(aRecursive) {
  },

  /**
   * Destroy the widget.
   *
   * If the widget implementation does not define a 'destroy' method, this will
   *  just be an alias to the |__destroy| automatically created method.  If the
   *  widget implementation does define this method, it should call the
   *  |__destroy| method before it returns.
   */
  destroy: function() {

  }
};

/**
 * Documents what you expect to see on a widget instance.  This is ideally
 *  practically nothing.
 */
var WidgetInstance_DOC = {
  /**
   * The root dom node that represents us.
   */
  domNode: null,

  /**
   * The JS object we are bound to and visualizing.
   */
  obj: null,
};

}); // end define
