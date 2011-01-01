
define("wmsy/viewslice-asyncify",
  [
    "exports",
  ],
  function(
    exports
  ) {

/**
 * Decorates a synchronous view slice into an asynchronous one for unit testing
 *  or interactive understanding purposes.  You would use this instead of an
 *  inherently asynchronous view slice because you can control when things fire
 *  and what not with this deterministically.
 *
 * Too all the marketers out there, yes, I will name your products for bags of
 *  money.
 */
function AsyncifyingViewSlice(aWrappedSlice, aListener) {
  this._wrapped = aWrappedSlice;
  this._wrapped._listener = this;
  this._listener = aListener;
}
AsyncifyingViewSlice.prototype = {
  //////////////////////////////////////////////////////////////////////////////
  // Interface exposure to our listener / consumer

  requestKnown: function(aDirMagnitude) {
  },

  requestUnknown: function(aDirMagnitude) {
  },

  seek: function(aSeekSpot, aBefore, aAfter) {
  },

  translateIndex: function(aIndex) {
  },


};

}); // end define
