
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
    throw new Error("unpossible! static view slices do not trigger seeks.");
  },
};
exports.StaticViewSlice = StaticViewSlice;

/**
 * View slice whose items are just the result of a generative function invoked
 *  on demand (and constrained to some range of input values).  Like the
 *  @xref{StaticViewSlice} its entire potential range is 'known' at all times
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

  requestKnown: function(aDirMagnitude) {
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

  requestUnknown: function() {
    // all is known to the mighty generative view slice!
    // (everything can be generated synchronously)
    return false;
  },

  searchKnown: function(aSeekVal) {
    var index;
    if (this._keyToValFunc)
      index = this._keyToValFunc(aSeekVal);
    else
      index = aSeekVal;

    // clamp to buffered range...
    if (index < this.bufLow)
      index = this.bufLow;
    else if (index >= this.bufHigh)
      index = this.bufHigh - 1;

    return index;
  },

  seek: function(aSeekSpot, aBefore, aAfter) {
    if (this._keyToValFunc)
      aSeekSpot = this._keyToValFunc(aSeekSpot);

    this.bufLow = Math.max(this._minVal, aSeekSpot - aBefore);
    this.bufHigh = Math.min(this._maxVal, aSeekSpot + aAfter + 1);

    this.availLow = this.bufLow - this._minVal;
    this.availHigh = this._maxVal - this.bufHigh;

    this._listener.didSeek(this.bufLow,
                           this._gen(this.bufLow, this.bufHigh),
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
