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

require.def("wmsy/viewslice-filter",
  [
    "exports",
  ],
  function(
    exports
  ) {

/**
 * Implements a filtering view slice.  You provide a function that tests objects
 *  and we filter what our wrapped view slice reports to us and report only
 *  the satisfying subset to our own consumer.  We support changing the
 *  filtering function at runtime be it by replacing the actual function or just
 *  indicating that the function's behaviour has changed.
 *
 * You would most likely want to use this as part of an in-memory filtering
 *  mechanism when already using a static viewslice or as a filtering post-pass
 *  on a true asynchronous view slice.
 *
 * @args[
 *   @param[aDef @dict[
 *     @key[filter @func[
 *       @args[
 *         @param[considerObj Object]{
 *           The object to consider for filtering.
 *         }
 *       ]
 *       @return[Boolean @oneof[
 *         @case[true]{
 *           Show the object; it will be present in our exposed slice.
 *         }
 *         @case[false]{
 *           Hide the object; it will not be present in our exposed slice.
 *         }
 *       ]]
 *     ]]{
 *       The output of this function should be consistent between calls to
 *       `refresh` on the filtering slice.
 *     }
 *     @key[expectedYield #:optional @default[1.0] Number]{
 *       The percentage of items that are expected to pass the filter.  This
 *       is used to assist in accurately inflating requests to the wrapped view
 *       slice so that avoidable asynchronous overhead costs can be minimized.
 *       For example, if each asynchronous request involves network latency and
 *       only 50% (0.5) of the items are expected to pass the filter, it is
 *       helpful for us to double our request size to the wrapped view slice.
 *     }
 *   ]]
 * ]
 */
function DecoratingFilteringViewSlice(aWrappedSlice, aDef, aData) {
}
DecoratingFilteringViewSlice.prototype = {

};
exports.DecoratingFilteringViewSlice = DecoratingFilteringViewSlice;

}); // end require.def
