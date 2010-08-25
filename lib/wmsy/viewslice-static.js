
/**
 * Implements the ViewSlice contract for dumb JavaScript arrays.  It is allowed
 *  for the underlying array to be updated, but we assume that we will
 *  immediately be notified about the updates after they occur.
 */
function StaticViewSlice(aList, aListener, aData) {
  this._list = aList;
  this._listener = aListener;
  this.data = aData;
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

  seek: function(aSeekSpot, aBefore, aAfter) {
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

  //////////////////////////////////////////////////////////////////////////////
  // Updates about the underlying list
  splice: function(aIndex, aHowMany, aItems) {

  },

  didSeek: function() {
    throw new Error("Seeks make no sense for static lists.");
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
