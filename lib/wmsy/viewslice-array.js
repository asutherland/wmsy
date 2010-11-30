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

require.def("wmsy/viewslice-array",
  [
    "exports",
  ],
  function(
    exports
  ) {

/**
 * Implements the ViewSlice contract for dumb JavaScript arrays.  It is allowed
 *  for the underlying array to be updated, but we assume that we will
 *  immediately be notified about the updates after they occur.
 *
 * @args[
 *   @param[aList Array]
 *   @param[aListener ViewSliceListener]
 *   @param[aData]
 *   @param[aKeyFetcher #:optional @func[
 *     @args[
 *       @param["index" Integer]
 *     ]
 *     @returns[Object]
 *   ]]{
 *     A function to retrieve the key that is used to order this list.  If your
 *     list is not well ordered, do not pass this function and we will just use
 *     the index of the objects as the (potentially constantly changing) key
 *     space.
 *   }
 *   @param[aKeyComparator #:topional @func[
 *     @args[
 *     ]
 *   ]]{
 *     A comparator function for your key space.
 *   }
 * ]
 */
function ArrayViewSlice(aList, aListener, aData, aKeyFetcher, aKeyComparator) {
  this._list = aList;
  this._lastLength = this._list.length;
  this._listener = aListener;
  this.data = aData;

  this._keyFetcher = aKeyFetcher;
  this._keyComparator = aKeyComparator;

  this._exposeBaseIndex = this._exposeExclusiveIndex = null;

  this.liveList = null;
  this.atFirst = this.atLast = false;
}
ArrayViewSlice.prototype = {
  //////////////////////////////////////////////////////////////////////////////
  // Interface exposure to our listener / consumer

  noteRanges: function(aUsingLow, aVisibleLow, aVisibleHighEx, aUsingHighEx) {
    if (aUsingLow < 0)
      throw new Error("No trying to expand your coverage with negative vals");
    if (aUsingHighEx > this.liveList.length)
      throw new Error("No trying to expand your coverage by growing highex!");
    if (aUsingHighEx < aUsingLow)
      throw new Error("Illegal range; high must be >= low!");

    // -- handle a high cut
    // (high before low to make the index changes more palatable to my brain)
    if (aUsingHighEx < this.liveList.length) {
      var highChopCount = this.liveList.length - aUsingHighEx;
      this._exposeExclusiveIndex -= highChopCount;

      this.liveList = this._list.slice(this._exposeBaseIndex,
                                       this._exposeExclusiveIndex);
      this.atLast = false; // any reduction implies we are not at the last.

      this._listener.didSplice(aUsingHighEx, highChopCount, null,
                               true, false, this);
    }

    // -- handle a low cut
    if (aUsingLow) {
      this._exposeBaseIndex += aUsingLow;

      this.liveList = this._list.slice(this._exposeBaseIndex,
                                       this._exposeExclusiveIndex);
      this.atFirst = false; // any reduction implies we are not the first.

      this._listener.didSplice(0, aUsingLow, null,
                               true, false, this);
    }
  },

  grow: function(aDirMagnitude) {
    var newSlice;
    if (aDirMagnitude < 0) {
      var prevLow = this._exposeBaseIndex;
      this._exposeBaseIndex = Math.max(0,
                                       this._exposeBaseIndex + aDirMagnitude);
      this.liveList = this._list.slice(this._exposeBaseIndex,
                                       this._exposeExclusiveIndex);
      newSlice = this._list.slice(this._exposeBaseIndex, prevLow);
      this.atFirst = this._exposeBaseIndex === 0;
      this._listener.didSplice(0, 0, newSlice, true, false, this);
    }
    else {
      var prevHigh = this._exposeExclusiveIndex;
      // the high exclusive index can't be higher than the list length
      this._exposeExclusiveIndex =
        Math.min(this._list.length,
                 this._exposeExclusiveIndex + aDirMagnitude);
      this.liveList = this._list.slice(this._exposeBaseIndex,
                                       this._exposeExclusiveIndex);
      newSlice = this._list.slice(prevHigh, this._exposeExclusiveIndex);
      this.atLast = this._exposeExclusiveIndex === this._list.length;
      this._listener.didSplice(prevHigh - this._exposeBaseIndex, 0, newSlice,
                               true, false, this);
    }
  },

  _bsearchKeys: function(aSeekVal, aLow, aHigh) {
    var cmpfunc = this._keyComparator, list = this._list;
    var low  = ((aLow === undefined)  ? 0                 : aLow),
        high = ((aHigh === undefined) ? (list.length - 1) : aHigh),
        mid, cmpval;
    while (low <= high) {
      mid = low + Math.floor((high - low) / 2);
      cmpval = cmpfunc(aSeekVal, list[mid]);
      if (cmpval < 0)
        high = mid - 1;
      else if (cmpval > 0)
        low = mid + 1;
      else
        break;
    }
    // (mid is either the index now or the dude one less than)
    return (cmpval < 0) ?
      Math.max(aLow === undefined ? 0 : aLow, (mid - 1)) :
      mid;
  },

  seek: function(aSeekSpot, aBefore, aAfter) {
    // if we have a key fetcher, do a binary search to find the index of the
    //  closest value equal to/less than the seek value.
    if (this._keyFetcher)
      aSeekSpot = this._bsearchKeys(aSeekSpot);

    if (aSeekSpot < 0)
      aSeekSpot += this._list.length;
    // note: undefined OP number is always false, so the magic undefined
    //  cases always fall into the else case, which is as we desire.
    if (aBefore >= 0)
      this._exposeBaseIndex = Math.max(0, aSeekSpot - aBefore);
    else
      this._exposeBaseIndex = 0;
    if (aAfter >= 0)
      this._exposeExclusiveIndex = Math.min(this._list.length,
                                            aSeekSpot + aAfter + 1);
    else
      this._exposeExclusiveIndex = this._list.length;

    this.liveList = this._list.slice(this._exposeBaseIndex,
                                     this._exposeExclusiveIndex);
    this.atFirst = this._exposeBaseIndex === 0;
    this.atLast = this._exposeExclusiveIndex === this._list.length;

    this._listener.didSeek(this.liveList, false, this);
  },

  translateIndex: function(aIndex) {
    if (this._keyFetcher)
      return this._keyFetcher(this._list[this._exposeBaseIndex + aIndex]);

    // identity transform; the indices are our keyspace.  (sadly, that makes
    //  them not totally stable, but you're not really supposed to be trying
    //  to use them like that if you don't define a keyspace with your
    //  functions.)
    return this._exposeBaseIndex + aIndex;
  },

  //////////////////////////////////////////////////////////////////////////////
  // Exploding slice listener interface

  splice: function() {
    throw new Error("array view slices are terminuses and do not obey the " +
                    "slice listener interface; use mutateSplice.");
  },

  didSeek: function() {
    throw new Error("unpossible! array view slices do not trigger seeks.");
  },

  //////////////////////////////////////////////////////////////////////////////
  // User manipulation support

  /**
   * Perform a splice on the wrapped list with the exact same semantics as
   *  Array.splice.
   */
  mutateSplice: function(aIndex, aHowMany) {
    var preLength = this._list.length;
    // we need to normalize the arguments, and we need to do it using the last
    //  known length since we receive after-the-fact notifications.

    // allow use of undefined to imply appending... (magic!)
    if (aIndex === undefined)
      aIndex = preLength;
    // allow slice-style negative access
    if (aIndex < 0)
      aIndex += preLength;
    // allow spidermonkey style deletion of everything
    if (aHowMany === undefined)
      aHowMany = preLength - aIndex;

    var added = [];
    for (var i = 2; i < arguments.length; i++) {
      added.push(arguments[i]);
    }
    this._list.splice.apply(this._list, [aIndex, aHowMany].concat(added));

    this.postSplice(aIndex, aHowMany);
  },

  postSplice: function(aIndex, aHowMany) {
    // we need to normalize the arguments, and we need to do it using the last
    //  known length since we receive after-the-fact notifications.
    if (aIndex < 0)
      aIndex += this._lastLength;
    if (aHowMany === undefined)
      aHowMany = this._lastLength - aIndex;

    // the number added is the net increase plus the number deleted
    var deducedAdded = this._list.length - this._lastLength + aHowMany;
    var added = (deducedAdded <= 0) ? []
                                    : this._list.slice(aIndex,
                                                       aIndex + deducedAdded);

    // - we ignore things below our range but must update our indices...
    if (aIndex < this._exposeBaseIndex) {
      this._exposeBaseIndex += deducedAdded - aHowMany;
      this._exposeExclusiveIndex += deducedAdded - aHowMany;
      // our liveList does not change as we do not see the change!
    }
    // - we generate events and see things inside our range;
    // We DO expand the range for things at the upper bound being appended when
    //  we are atLast.
    // We DO NOT shrink the range for things at the upper bound being removed!
    // (The latter follows from the former automatically because of the atLast
    //  check; you can't remove something at the length if we are not atTop.)
    else if (aIndex < this._exposeExclusiveIndex ||
             (aIndex === this._exposeExclusiveIndex && this.atLast)) {
      this._exposeExclusiveIndex += deducedAdded - aHowMany;

      this.liveList = this._list.slice(this._exposeBaseIndex,
                                       this._exposeExclusiveIndex);

      // we are the data-origin, so aSlice === this
      this._listener.didSplice(aIndex - this._exposeBaseIndex, aHowMany, added,
                               false, false, this);
    }

    // update the length so that next time we splice we have it available (when
    //  it may have changed)
    this._lastLength = this._list.length;
  },

};
exports.ArrayViewSlice = ArrayViewSlice;

/**
 * View slice whose items are just the result of a generative function invoked
 *  on demand (and constrained to some range of input values).  Like the
 *  @xref{ArrayViewSlice} its entire potential range is 'known' at all times
 *  (although it should never be entirely buffered).
 *
 * If you want to expose a totally ordered key space, you can provide functions
 *  that map from an ordered key value to the input range values and back again.
 *
 * @args[
 *   @param[aFunc]
 *   @param[aMinInclusive]
 *   @param[aMaxExclusive]
 *   @param[aListener]
 *   @param[aOrderedKeyToInputValFunc #:optional @func[
 *     @args[
 *       @param["key space" Object]
 *     ]
 *     @return["value space" Number]
 *   ]]{
 *     This function must accept any valid key space value and transform it into
 *      an integer value in the value space universe.  We will clamp the value
 *      to the provided min/max range for you.
 *   }
 *   @param[aInputValToOrderedKeyFunc #:optional @func[
 *     @args[
 *     ]
 *     @return[]
 *   ]]
 * ]
 */
function GenerativeViewSlice(aFunc, aMinInclusive, aMaxExclusive, aListener,
                             aKeyToValFunc, aValToKeyFunc) {
  this._func = aFunc;
  this._minVal = aMinInclusive;
  this._maxVal = aMaxExclusive;
  this._listener = aListener;
  this._keyToValFunc = aKeyToValFunc;
  this._valToKeyFunc = aValToKeyFunc;
}
GenerativeViewSlice.prototype = {
  _gen: function(aLow, aBeyond) {
    var results = [], func = this._func;
    for (var i = aLow; i < aBeyond; i++) {
      results.push(func(i));
    }
    return results;
  },

  grow: function(aDirMagnitude) {
    if (aDirMagnitude < 0) {
      var prevLow = this.bufLow;
      this.bufLow += aDirMagnitude;
      this.availLow = this.bufLow - this._minVal;
      return this._gen(this.bufLow, prevLow);
    }
    else {
      var prevHigh = this.bufHigh;
      this.bufHigh += aDirMagnitude;
      this.availHigh = this._maxVal - this.bufHigh;
      return this._gen(prevHigh, this.bufHigh);
    }
  },

  seek: function(aSeekSpot, aBefore, aAfter) {
    if (this._keyToValFunc)
      aSeekSpot = this._keyToValFunc(aSeekSpot);

    this.bufLow = Math.max(this._minVal, aSeekSpot - aBefore);
    this.bufHigh = Math.min(this._maxVal, aSeekSpot + aAfter + 1);

    this.availLow = this.bufLow - this._minVal;
    this.availHigh = this._maxVal - this.bufHigh;

    this._listener.didSeek(this._gen(this.bufLow, this.bufHigh), false,
                           this);
  },

  translateIndex: function(aIndex) {
    if (this._valToKeyFunc)
      return this._valToKeyFunc(aIndex);
    return aIndex;
  },

  splice: function() {
    // well, we don't have to be, but then things would get much more complex
    //  and this guy really only exists for demo and specialized test purposes.
    throw new Error("generative view slices are immutable");
  },

  didSeek: function() {
    throw new Error("unpossible! generative view slices do not trigger seeks");
  },
};
exports.GenerativeViewSlice = GenerativeViewSlice;

}); // end require.def