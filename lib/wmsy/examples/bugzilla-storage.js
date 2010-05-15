/**
 * Store stuff in localStorage.  This is not meant to be generic.  That comes
 *  later.
 */

var OUR_NAME = "bug-bug-goose";

/**
 * Grab data requiring a revision number of aRev.  We return null if there is
 *  no data stored or its revision tag was wrong.
 */
exports.gimmie = function(aRev) {
  var whatwhat = window.localStorage.getItem(OUR_NAME);
  if (!whatwhat)
    return whatwhat;
  whatwhat = JSON.parse(whatwhat);
  if (whatwhat.rev != aRev)
    return null;
  return whatwhat.data;
};

exports.reverseGimmie = function(aRev, aWhatWhat) {
  // atul's bugzilla thing says the iPad sucks and we need to do this, although
  //  that was for sessionStorage.  Can't hurt.
  window.localStorage.removeItem(OUR_NAME);

  var persist = {
    rev: aRev,
    data: aWhatWhat,
  };
  window.localStorage.setItem(OUR_NAME, json.stringify(persist));
};
