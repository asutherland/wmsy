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
 * Provides a view slice whose contents are algorithmically generated, intended
 *  exclusively for testing/demonstration purposes.
 **/

define("wmsy/viewslice-generative",
  [
    "wmsy/viewslice-proto",
    "exports"
  ],
  function(
    $proto,
    exports
  ) {

/**
 * View slice whose items are just the result of a generative function invoked
 *  on demand (and constrained to some range of input values).  Like the
 *  @xref{ArrayViewSlice} its entire potential range is 'known' at all times
 *  (although it should never be entirely buffered).
 *
 * If you want to expose a totally ordered key space, you can provide functions
 *  that map from an ordered key value to the input range values and back again.
 *
 * Operation can be synchronous or asynchronous depending on the behaviour of
 *  the generation function.  If no value/undefined is returned, it is presumed
 *  that the function is asynchronous and will invoke `asyncFulfill` on the
 *  slice once it has the data on hand.
 *
 * @args[
 *   @param[aIndivFunc #:optional @func[
 *     @args[
 *       @param["ordering key" Object]
 *     ]
 *     @return[Object]{
 *       The calculated item value.
 *     }
 *   ]]{
 *     The function to calculate an individual value; this can be omitted if
 *     `aBatchFunc` is provided.
 *   }
 *   @param[aBatchFunc #:optional @func[
 *     @args[
 *       @param[aLowInclusiveOrderingKey Object]
 *       @param[aHighExclusiveOrderingKey Object]
 *     ]
 *     @this[GenerativeViewSlice]
 *     @return[@oneof[undefined @listof[Object]]]{
 *       If this is an asynchronous operation, return undefined and at some
 *       point in the future invoke `asyncFulfill` on the slice.
 *     }
 *   ]]{
 *     The batch function to use to calculate a set of individual result values.
 *     If this is omitted, `aIndivFunc` must be provided and default processing
 *     logic will return the results synchronously.
 *   }
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
function GenerativeViewSlice(aIndivFunc, aBatchFunc,
                             aMinInclusive, aMaxExclusive, aListener,
                             aKeyToValFunc, aValToKeyFunc) {
  this._itemFunc = aIndivFunc;
  this._batchFunc = aBatchFunc || this._defaultBatchFunc;
  this._minVal = aMinInclusive;
  this._maxVal = aMaxExclusive;
  this._listener = aListener;
  this._keyToValFunc = aKeyToValFunc;
  this._valToKeyFunc = aValToKeyFunc;

  this._exposeBaseIndex = this._exposeExclusiveIndex = null;
  this.liveList = null;
  this.atFirst = this.atLast = false;
}
GenerativeViewSlice.prototype = {
  _defaultBatchFunc: function(aLow, aBeyond) {
    var results = [], func = this._itemFunc;
    for (var i = aLow; i < aBeyond; i++) {
      results.push(func(i));
    }
    return results;
  },

  asyncFulfill: function(items, done) {
    var newSlice;
    this.liveList.splice(this._targetBase, 0, items);
    this.atFirst = this._exposeBaseIndex === this._minVal;
    this.atLast = this._exposeExclusiveIndex === this._maxVal;

    if (this._pendingSeek)
      this._listener.didSeek(items);
    else
      this._listener.didSplice(this._targetBase, 0, items, true, false, this);
  },

  _batchRequest: function(isSeek, low, highEx) {
    this._pendingSeek = isSeek;
    var result = this._batchFunc(low, highEx);
    if (result != null)
      this.asyncFulfill(result, true);
  },

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

      this.liveList.splice(aUsingHighEx, highChopCount);
      this.atLast = false; // any reduction implies we are not at the last.

      this._listener.didSplice(aUsingHighEx, highChopCount, null,
                               true, false, this);
    }

    // -- handle a low cut
    if (aUsingLow) {
      this._exposeBaseIndex += aUsingLow;

      this.liveList.splice(0, aUsingLow);
      this.atFirst = false; // any reduction implies we are not the first.

      this._listener.didSplice(0, aUsingLow, null,
                               true, false, this);
    }
  },

  grow: function(aDirMagnitude) {
    if (aDirMagnitude < 0) {
      var prevLow = this._exposeBaseIndex;
      this._exposeBaseIndex = Math.max(0,
                                       this._exposeBaseIndex + aDirMagnitude);

      this._targetBase = 0;
      this._batchRequest(false, this._exposeBaseIndex, prevLow);
    }
    else {
      var prevHigh = this._exposeExclusiveIndex;
      // the high exclusive index can't be higher than the list length
      this._exposeExclusiveIndex =
        Math.min(this._maxVal,
                 this._exposeExclusiveIndex + aDirMagnitude);

      this._targetBase = this.liveList.length;
      this._batchRequest(false, prevHigh, this._exposeExclusiveIndex);
    }
  },

  seek: function(aSeekSpot, aBefore, aAfter) {
    if (this._keyToValFunc)
      aSeekSpot = this._keyToValFunc(aSeekSpot);

    if (aSeekSpot < 0)
      aSeekSpot += this._maxVal;
    // note: undefined OP number is always false, so the magic undefined
    //  cases always fall into the else case, which is as we desire.
    if (aBefore >= 0)
      this._exposeBaseIndex = Math.max(this._minVal, aSeekSpot - aBefore);
    else
      this._exposeBaseIndex = 0;
    if (aAfter >= 0)
      this._exposeExclusiveIndex = Math.min(this._maxVal,
                                            aSeekSpot + aAfter + 1);
    else
      this._exposeExclusiveIndex = this._list.length;

    this.liveList = [];
    this._targetBase = 0;
    this._batchRequest(true, this._exposeBaseIndex, this._exposeExclusiveIndex);
  },

  translateIndex: function(aIndex) {
    if (this._valToKeyFunc)
      return this._valToKeyFunc(this._exposeBaseIndex + aIndex);

    // identity transform; the indices are our keyspace.  (sadly, that makes
    //  them not totally stable, but you're not really supposed to be trying
    //  to use them like that if you don't define a keyspace with your
    //  functions.)
    return this._exposeBaseIndex + aIndex;
  },

  unlink: function() {
    this._listener = $proto.NoopListener;
    this.data = null;
  },

  //////////////////////////////////////////////////////////////////////////////
  // Exploding slice listener interface

  didSplice: function() {
    // well, we don't have to be, but then things would get much more complex
    //  and this guy really only exists for demo and specialized test purposes.
    throw new Error("generative view slices are immutable");
  },

  didSeek: function() {
    throw new Error("unpossible! generative view slices do not trigger seeks");
  },
  //////////////////////////////////////////////////////////////////////////////
};
exports.GenerativeViewSlice = GenerativeViewSlice;

}); // end define
