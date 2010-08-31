
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
function StaticViewSlice(aList, aListener, aData, aKeyFetcher, aKeyComparator) {
  this._list = aList;
  this._listener = aListener;
  this.data = aData;
  this._keyFetcher = aKeyFetcher;
  this._keyComparator = aKeyComparator;
  this.bufLow = this.bufHigh = null;
}
StaticViewSlice.prototype = {
  //////////////////////////////////////////////////////////////////////////////
  // Interface exposure to our listener / consumer

  requestKnown: function(aDirMagnitude) {
    if (aDirMagnitude < 0) {
      var prevLow = this.bufLow;
      this.bufLow += aDirMagnitude;
      this.availLow = this.bufLow;
      return this._list.slice(this.bufLow, prevLow);
    }
    else {
      var prevHigh = this.bufHigh;
      this.bufHigh += aDirMagnitude;
      this.availHigh = this._list.length - this.bufHigh;
      return this._list.slice(prevHigh, this.bufHigh);
    }
  },

  requestUnknown: function(aDirMagnitude) {
    return false;
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

  searchKnown: function(aSeekVal) {
    if (this._keyFetcher)
      return this._bsearchKeys(aSeekVal, this.bufLow, this.bufHigh - 1);
    return aSeekVal;
  },

  seek: function(aSeekSpot, aBefore, aAfter) {
    // if we have a key fetcher, do a binary search to find the index of the
    //  closest value equal to/less than the seek value.
    if (this._keyFetcher)
      aSeekSpot = this._bsearchKeys(aSeekSpot);

    if (aSeekSpot < 0)
      aSeekSpot += this._list.length;
    if (aBefore >= 0)
      this.bufLow = Math.max(0, aSeekSpot - aBefore);
    else
      this.bufLow = 0;
    if (aAfter >= 0)
      this.bufHigh = Math.min(this._list.length, aSeekSpot + aAfter + 1);
    else
      this.bufHigh = this._list.length;

    this.availLow = this.bufLow;
    this.availHigh = this._list.length - this.bufHigh;

    this._listener.didSeek(this.bufLow,
                           this._list.slice(this.bufLow, this.bufHigh),
                           this);
  },

  translateIndex: function(aIndex) {
    if (this._keyFetcher)
      return this._keyFetcher(this._list[aIndex]);

    // identity transform; the indices are our keyspace.  (sadly, that makes
    //  them not totally stable, but you're not really supposed to be trying
    //  to use them like that if you don't define a keyspace with your
    //  functions.)
    return aIndex;
  },

  //////////////////////////////////////////////////////////////////////////////
  // Updates about the underlying list
  //
  // Since we are a data-origin view slice, this interface is exposed to the
  //  user-code that owns the list.

  splice: function(aIndex, aHowMany, aItems, aSlice) {
    this._listener.splice(aIndex, aHowMany, aItems, aSlice);
  },

  didSeek: function() {
    throw new Error("Data-origin view slices .");
  },
};
exports.StaticViewSlice = StaticViewSlice;

/**
 * View slice whose items are just the result of a generative function invoked
 *  on demand (and constrained to some range of input values).
 */
function GenerativeViewSlice(aFunc, aMinVal, aMaxVal, aListener) {

}
GenerativeViewSlice.prototype = {

};
exports.GenerativeViewSlice = GenerativeViewSlice;
