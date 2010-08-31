/***************************** BEGIN LICENSE BLOCK *****************************
* Version: MPL 1.1/GPL 2.0/LGPL 2.1
*
* The contents of this file are subject to the Mozilla Public License Version
* 1.1 (the "License"); you may not use this file except in compliance with the
* License. You may obtain a copy of the License at http://www.mozilla.org/MPL/
*
* Software distributed under the License is distributed on an "AS IS" basis,
* WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License for
* the specific language governing rights and limitations under the License.
*
* The Original Code is Thunderbird Jetpack Functionality.
*
* The Initial Developer of the Original Code is the Mozilla Foundation.
* Portions created by the Initial Developer are Copyright (C) 2010 the Initial
* Developer. All Rights Reserved.
*
* Contributor(s):
*  Andrew Sutherland <asutherland@asutherland.org> (Original Author)
*
* Alternatively, the contents of this file may be used under the terms of either
* the GNU General Public License Version 2 or later (the "GPL"), or the GNU
* Lesser General Public License Version 2.1 or later (the "LGPL"), in which case
* the provisions of the GPL or the LGPL are applicable instead of those above.
* If you wish to allow use of your version of this file only under the terms of
* either the GPL or the LGPL, and not to allow others to use your version of
* this file under the terms of the MPL, indicate your decision by deleting the
* provisions above and replace them with the notice and other provisions
* required by the GPL or the LGPL. If you do not delete the provisions above, a
* recipient may use your version of this file under the terms of any one of the
* MPL, the GPL or the LGPL.
*
****************************** END LICENSE BLOCK ******************************/

/**
 *
 */
function InterposedEntry(aIndex, aClassifiedVal, aGeneratedObj) {
  this.index = aIndex;
  this.classVal = aClassifiedVal;
  this.obj = aGeneratedObj;
}
InterposedEntry.prototype = {
  /**
   * The public number of this interposed entry.  It displaces
   */
  index: null,
  classVal: null,
  obj: null,
};

var wrappingProto = {
  // proxy seek calls through to the wrapped view slice
  seek: function() {
    this._wrapped.seek.apply(this._wrapped, arguments);
  },
};

/**
 * Lets you insert synthetic phantom objects into a view slice.  You provide
 *  a simple classification function that is invoked on every item relevant to
 *  the visible range that distills a single integer or string result.  If
 *  the returned value is not equivalent for adjacent items, another routine
 *  you provide is invoked with the adjacent items in order to provide a new
 *  synthetic item.
 * Synthetic items are regenerated if either of the adjacent items is updated
 *  or they are displaced or deleted.
 *
 * You would use this functionality for things like:
 * - Putting giant letters in an address book to segment the address book by
 *    name.
 * - Inserting things like "2 weeks pass..." between messages in a
 *    conversation.
 */
function DecoratingInterposingViewSlice(aWrappedSlice, aListener,
                                        aDef, aData,
                                        aSynthFirst, aSynthLast) {
  this._wrapped = aWrappedSlice;
  this._wrapped._listener = this;
  this._listener = aListener;
  this._classifier = aDef.classifier;
  this._generator = aDef.maker;
  this.data = aData;
  this._synthFirst = (aSynthFirst === undefined) ? true : aSynthFirst;
  this._synthLast = (aSynthLast === undefined) ? false : aSynthLast;

  this._interposed = [];
  this._privBase = 0;

  this._lowKey = undefined;
  this._highKey = undefined;

  //this._pubList = [];
  //this._pubBase = 0;
}
DecoratingInterposingViewSlice.prototype = {
  __proto__: wrappingProto,

  /**
   * @listof{InterposedEntry}
   */
  _interposed: null,

  _classifyDudes: function(aStartIndex, aItems, aLowKey, aHighKey) {
    var effIndex = aStartIndex, lastKey = aLowKey, key = null, generated;
    var interps = [];
    var pub = [];
    var lastItem;
    for (var i = 0; i < aItems.length; i++, effIndex++) {
      var item = aItems[i];
      key = this._classifier(item);
      if (((lastKey === undefined) && this._synthFirst) ||
          (lastKey != key)) {
        generated = this._generator(lastItem, item);
        interps.push(new InterposedEntry(effIndex++, key, generated));
        pub.push(generated);
      }
      if (aLowKey === undefined)
        aLowKey = key;
      pub.push(item);
      lastKey = key;
      lastItem = item;
    }
    if ((key !== null) && (key != aHighKey) && this._synthLast) {
      generated = this._generator(item);
      interps.push(new InterposedEntry(effIndex++, key, generated));
      pub.push(generated);
    }
    if (aHighKey === undefined)
      aHighKey = key;

    return {
      lowKey: aLowKey,
      highKey: aHighKey,
      interposed: interps,
      pub: pub,
    };
  },

  //////////////////////////////////////////////////////////////////////////////
  // Interface exposure to our listener / consumer

  noteRanges: function(aBufLow, aVisLow, aVisHigh, aBufHigh) {

  },

  requestKnown: function(aDirMagnitude) {
    // (the contract guarantees they will not ask more of us than we claimed
    //  we could deliver. let's also assume they won't ask for things we
    //  already have delivered.)
    // (assume we won't interpose anything so we don't need to ask again later)
    var items = this._wrapped.requestMore(aDirMagnitude);
    var i, end, dir, lastKey;
    if (aDirMagnitude > 0) {
      i = 0;
      dir = 1;
      end = items.length;
      lastKey = this._highKey;
    }
    else {
      i = items.length - 1;
      dir = -1;
      end = -1;
      lastKey = this._lowKey;
    }
    for (; i != end; i += dir) {

    }
  },

  requestUnknown: function(aDirMagnitude) {

  },

  seek: function(aSeekSpot, aBefore, aAfter) {
  },

  //////////////////////////////////////////////////////////////////////////////
  // Updates from the underlying viewslice

  /**
   * (strict splice; no negative indices or undefined howmanys)
   */
  splice: function(aIndex, aHowMany, aItems, aSlice) {
    // -- delete
    // find any interposed items inside/adjacent to the deletion range and then
    //  check if the newly adjacent items have a discontinuity
    if (aHowMany) {

    }

    // -- add
    if (aItems) {

    }
  },

  didSeek: function(aBaseIndex, aItems, aSlice) {
    this._privBase = aBaseIndex;
    this._lowKey = this._highKey = undefined;

    var classed = this._classifyDudes(aBaseIndex, aItems, undefined, undefined);
    this._lowKey = classed.lowKey;
    this._highKey = classed.highKey;
    this._interposed = classed.interposed;
    this._listener.didSeek(aBaseIndex, classed.pub, this);
  },
};
exports.DecoratingInterposingViewSlice = DecoratingInterposingViewSlice;
