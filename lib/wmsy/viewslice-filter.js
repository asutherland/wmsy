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
 *  mechanism when already using an array viewslice or as a filtering post-pass
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
  /**
   * The view slice that we are wrapping.
   */
  this._wrapped = aWrappedSlice;
  // steal the listener off of the wrapped slice; we are decorating after all.
  this._listener = this._wrapped._listener;
  this._wrapped._listener = this;

  this._filterer = aDef.filter;

  /**
   * Opaque data for use by our consumer provided by our creator.
   */
  this.data = aData;

  /**
   * @listof[Boolean]{
   *   Each entry corresponds to whether the upstream entry is visible or not.
   * }
   */
  this._visible = null;

  this.liveList = null;
  this.atFirst = this.atLast = false;
}
DecoratingFilteringViewSlice.prototype = {
  _publicIndexToUpstreamIndex: function(pubIndex) {
    var visible = this._visible;
    // 0 @ [true] => 0
    // 0 @ [false, true] => 1
    // 1 @ [false, true, false, true] = 3
    for (var i = 0; i < visible.length; i++) {
      if (visible[i]) {
        if (pubIndex-- === 0)
          return i;
      }
    }
    return 0;
  },

  _upstreamIndexToPublicIndex: function(internalIndex) {
    // 0 @ [*] => 0
    // 1 @ [true, *] => 1
    // 1 @ [false, *] => 0
    return this._countTrues(this._visible.slice(0, internalIndex));
  },

  /**
   * @return[Number]{
   *   The number of 'true' values in the array, which translates to the number
   *    of visible entries.
   * }
   */
  _countTrues: function(arr) {
    var tally = 0;
    for (var i = 0; i < arr.length; i++) {
      if (arr[i])
        tally++;
    }
    return tally;
  },

  //////////////////////////////////////////////////////////////////////////////
  // Interface exposure to our listener / consumer

  noteRanges: function(aUsingLow, aVisibleLow, aVisibleHighEx, aUsingHighEx) {
    this._wrapped.noteRanges(
      this._publicIndexToUpstreamIndex(aUsingLow),
      this._publicIndexToUpstreamIndex(aVisibleLow),
      this._publicIndexToUpstreamIndex(aVisibleHighEx),
      this._publicIndexToUpstreamIndex(aUsingHighEx));
  },

  grow: function(aDirMagnitude) {
    this._wrapped.grow(aDirMagnitude);
  },

  seek: function(aSeekSpot, aBefore, aAfter) {
    this._wrapped.seek(aSeekSpot, aBefore, aAfter);
  },

  /**
   * Interposed objects always have the same ordering key as the element they
   *  displace, with the exception of synthetic last entries which use the
   *  ordering key of the item that precedes them.
   */
  translateIndex: function(aIndex) {
    return this._wrapped.translateIndex(
             this._publicIndexToUpstreamIndex(aIndex));
  },

  unlink: function() {
    this._wrapped.unlink();
    // The meaningful unlink happens on the wrapped guy, but we can at least
    //  null out our references to help out GC and encourage explosions for
    //  illegal accesses.
    this._wrapped = null;
    this._listener = null;
    this.data = null;
  },

  //////////////////////////////////////////////////////////////////////////////
  // Updates from the underlying viewslice

  _internalSplice: function(aIndex, aHowMany, aItems) {
    this.atLast = this._wrapped.atLast;
    this.atFirst = this._wrapped.atFirst;

    var publicIndex = this._upstreamIndexToPublicIndex(aIndex);

    // -- delete
    var visibleDelCount = 0;
    if (aHowMany) {
      var visibleSlice = this._visible.splice(aIndex, aIndex + aHowMany);
      visibleDelCount = this._countTrues(visibleSlice);
      this.liveList.splice(publicIndex, visibleDelCount);
    }

    // -- add
    var visibleAdds;
    if (aItems && aItems.length) {
      visibleAdds = [];
      var effPubIndex = publicIndex, effIntIndex = aIndex;

      for (var i = 0; i < aItems.length; i++) {
        var item = aItems[i];
        // - visible
        if (this._filterer(item)) {
          visibleAdds.push(item);
          this._visible.splice(effIntIndex++, 0, true);
          this.liveList.splice(effPubIndex++, 0, item);
        }
        // - hide
        else {
          this._visible.splice(effIntIndex++, 0, false);
        }
      }
    }

    return {
      publicIndex: publicIndex,
      visibleDelCount: visibleDelCount,
      visibleAdds: visibleAdds,
    };
  },

  didSplice: function vs_interpose_didSplice(aIndex, aHowMany, aItems,
                                             aRequested, aMoreExpected,
                                             aSlice) {
    var res = this._internalSplice(aIndex, aHowMany, aItems);

    // XXX consider filtering out the notification if filtering means this is
    //  a 0-delete, 0-add kind of thing.  The reason we're not doing that right
    //  now is the requested/more-expected flags may have invariants we need
    //  to deal with better in that case.
    this._listener.didSplice(res.publicIndex, res.visibleDelCount,
                             res.visibleAdds, aRequested, aMoreExpected, this);
  },

  didSeek: function(aItems, aMoreExpected, aSlice, aSeekFocusIndex) {
    this.liveList = [];
    this._visible = [];

    this._internalSplice(0, 0, aItems);

    var pubFocusIndex = this._upstreamIndexToPublicIndex(aSeekFocusIndex);
    this._listener.didSeek(this.liveList, aMoreExpected, this, pubFocusIndex);
  },
  //////////////////////////////////////////////////////////////////////////////
};
exports.DecoratingFilteringViewSlice = DecoratingFilteringViewSlice;

}); // end define
