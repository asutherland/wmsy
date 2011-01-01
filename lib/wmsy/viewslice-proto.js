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
 * Defines the viewslice protocol in a codey fashion and provides a no-op
 *  listener.
 **/

define("wmsy/viewslice-proto", ["exports"], function(exports) {

function ViewSlice() {
}
ViewSlice.prototype = {
  /**
   * The current list of items comprising the slice as exposed to our consumer
   *  at this instant.
   *
   * Previous drafts did not provide for this value and allowed relative index
   *  ranges to float off into the ether.  But this way makes it much easier
   *  to test, debug, and invariant check.
   */
  liveList: null,

  atTop: null,
  atBottom: null,

  /**
   * Report what portions of the liveList we are actually using while also
   *  providing debug/performance hinting on the set that is actually actively
   *  visible/being used.  Without this method view slices would only increase
   *  in size (apart from removals from the upstream view slice).
   *
   * This method will trigger `didSplice` notifications if the provided
   *  information has any net effect.  The didSplice notifications may operate
   *  at a slightly different granularity than the request.  Specifically,
   *  decorating view slices that inject synthetic elements may opt to cut
   *  less than the required amount because otherwise they would need to cut
   *  more than was requested to satisfy their invariants.
   *
   * Because didSplice can only convey a single cut and this method allows
   *  for two cuts to occur, up to two `didSplice` notifications may occur.
   *  The order in which they occur is up to the implementation.
   *
   * @args[
   *   @param[aUsingLow Number]{
   *     The index of the first entry in the view slice's `liveList` that the
   *     consumer is actually using.
   *   }
   *   @param[aVisibleLow Number]{
   *     A hint as to the first entry in the view slice that is being displayed.
   *     This will definitely be used for debugging/understanding support, but
   *     might also be used for pre-fetch logic depending on where it is least
   *     complex/most sane to implement.
   *   }
   *   @param[aVisibleHighEx Number]{
   *     A hint as to the first entry beyond the last entry in the view slice
   *     that is being displayed.  In other words, the exclusive upper bound
   *     of the visible range.
   *   }
   *   @param[aUsingHighEx Number]{
   *     The first entry beyond the last entry in the view slice that the
   *     consumer is actually using.  In other words, the exclusive upper bound
   *     of the used range.
   *   }
   * ]
   * @return[]
   */
  noteRanges: function(aUsingLow, aVisibleLow, aVisibleHighEx, aUsingHighEx) {

  },

  /**
   * Request growth of the view slice either above or below the current slice
   *  span.  Results will be provided in `didSplice` notifications in one
   *  or more invocations.
   *
   * The requested number of items may not be the exact number provided by
   *  didSplice once the request has been fulfilled; decorating view slices
   *  may adjust the request to deal with yield problems or synthesize new items
   *  based on the data returned.  For simplicity and efficiency reasons, the
   *  decorating view slices do not attempt to internally hide extra results,
   *  or eliminate them via calls to noteRange.  Likewise, if fewer items end
   *  up being provided than requested, the decorating slices do not take it
   *  upon themselves to issue new requests.
   *
   * @args[
   *   @param[aDirMagnitude Number]{
   *     The magnitude expresses the number of additional items requested, the
   *     sign whether the request is at the start (negative) or end (positive)
   *     of the current range exposed by the view slice.
   *   }
   * ]
   * @return[]
   */
  grow: function(aDirMagnitude) {

  },

  /**
   * Seek to a position in the ordered keyspace, requesting some number of
   *  entries before and after the seeked location.  Results will be provided
   *  by a `didSeek` invocation.  If
   *
   * As with `grow` requests, the exact number of items around may vary and
   *  no guarantees are made.
   *
   * @args[
   *   @param[aSeekKey Number]{
   *     A value from the ordering key-space.  If the value does not exactly
   *     correspond to a single item it is up to the view slice to disambiguate.
   *   }
   *   @param[aBefore Number]{
   *     The number of items to try and provide prior to the item that is
   *     deemed the focus of the seek.
   *   }
   *   @param[aAfter Number]{
   *     The number
   *   }
   * ]
   */
  seek: function(aSeekKey, aBefore, aAfter) {

  },

  /**
   * Translate the given index value into a value from the ordering keyspace.
   *  Translations must be consistent between calls to `didSplice`/`didSeek`.
   *  Translations can change when those calls are invoked, but the ordering
   *  property must always be maintained.  Since `didSeek` notifications
   *  obliterate all known items, they can flip the direction of the ordering
   *  space too.
   */
  translateIndex: function(aIndex) {

  },

  /**
   * Tell this viewslice to forget about its listener.  If the implementation
   *  is asynchronous and there are outstanding asynchronous requests, it is
   *  fine/desirable to cancel them if possible.
   */
  unlink: function() {
  },
};

var ViewSliceListener = {
  /**
   * Reports changes to the `liveList` as a result of requests to the view
   *  slice.
   *
   * @args[
   *   @param[aIndex]{
   *     The index at which the insertion and/or deletion occurred.
   *   }
   *   @param[aHowMany]{
   *     The number of items deleted at `aIndex`.
   *   }
   *   @param[aItems]{
   *     The list of new items inserted at `aIndex` subsequent to any removals.
   *   }
   *   @param[aRequested Boolean]{
   *     Is this modification a result of a request made of us by our consumer
   *     via a call to `grow`?
   *   }
   *   @param[aMoreExpected Boolean]
   *   @param[aSlice ViewSlice]
   * ]
   */
  didSplice: function(aIndex, aHowMany, aItems,
                      aRequested, aMoreExpected,
                      aSlice) {

  },

  /**
   * @args[
   *   @param[aItems]{
   *     The data being provided with this seek.  This will be identical
   *     to the contents of `liveList` at the time of this call.
   *   }
   *   @param[aMoreExpected Boolean]{
   *     Indicates whether this seek has all of the requested data or whether
   *     you should expect one or more follow-up calls to `didSplice`.  In
   *     that case each invocation of `didSeek` will set aRequested to true
   *     and the last call will set aMoreExpected to false.
   *   }
   *   @param[aSlice ViewSlice]
   *   @param[aSeekFocusIndex Number]{
   *     The index of what we are treating as the seek focus in `aItems`.
   *   }
   * ]
   */
  didSeek: function(aItems, aMoreExpected, aSlice, aSeekFocusIndex) {
  },
};
exports.NoopListener = ViewSliceListener;

}); // end define
