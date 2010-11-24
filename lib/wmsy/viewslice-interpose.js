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

require.def("wmsy/viewslice-interpose",
  [
    "exports",
  ],
  function(
    exports
  ) {

/**
 * The bookkeeping object for interposed objects.  We need to know where in
 *  the list the object is located, the classification values that led to its
 *  calculation, and the actual generated object to be interposed.
 */
function InterposedEntry(aIndex, aPreClassifiedVal, aPostClassifiedVal,
                         aGeneratedObj) {
  this.index = aIndex;
  this.preClassVal = aPreClassifiedVal;
  this.postClassVal = aPostClassifiedVal;
  this.obj = aGeneratedObj;
}
InterposedEntry.prototype = {
  /**
   * The public number of this interposed entry.  It displaces (upwards) the
   *  item with the same index in the raw, pre-interposition list.  This number
   *  is unaffected by the public numbers of all other interposed entries.
   *  You can think of these entries as naming the entries in the raw list which
   *  should have something placed in front of them.
   *
   * In the canonical example of letter prefixes on ["Aa", "Ab", "Ba", "Bb",
   *  "Ca"], the index values would be [0, 2, 4].  Of course, the displacement
   *  is cumulative so the offsets of the interposed entries in the public
   *  list would be [0, 3, 6].
   *
   * When `makeLast` is true, this index could be one more than the highest
   *  index number in the raw list since the point is to come after all of the
   *  actual raw items.
   */
  index: null,
  /**
   * The classification value corresponding to the object preceding the
   *  interposed entry.  This can be undefined, representing no classification
   *  value, if `makeFirst` was true and this is displacing the first item.
   */
  preClassVal: null,
  /**
   * The classification value corresponding to the object following/displaced by
   *  the interposed entry.  This can be undefined, representing no
   *  classification value, if `makeLast` was true and this is occuring after
   *  the last item.
   */
  postClassVal: null,
  /**
   * The interposed object created for us by the `maker` function.
   */
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
 *
 * Synthetic items are regenerated if either of the adjacent items is updated
 *  or they are displaced or deleted.
 *
 * You would use this functionality for things like:
 * @itemize[
 *   @item{
 *     Putting giant letters in an address book to segment the address book by
 *     name.
 *   }
 *   @item{
 *     Inserting things like "2 weeks pass..." between messages in a
 *     conversation.
 *   }
 * ]
 *
 * In subset view slices (cases where we do not see the true start and end of
 *  the view slice at once), the first and last elements that we are aware of
 *  (unless they are the true start/end) are only considered on their
 *  "inward facing side", as it were.  (No synthetic interpositions using
 *  undefined occur.)
 *
 * @args[
 *   @param[aWrappedSlice ViewSlice]{
 *     The view slice that we are decorating.
 *   }
 *   @param[aDef @dict[
 *     @key["classifier" @func[
 *       @args[
 *         @param["obj"]{
 *           The object to be classified.
 *         }
 *       ]
 *       @returns[Object]{
 *         The classification result; this should be usefully comparable to
 *         other classification results using !=.
 *       }
 *     ]]
 *     @key["maker" @func[
 *       @args[
 *         @param["prevObj" @oneof[Object undefined]]{
 *           The object that precedes the synthetic object we are having you
 *           create, or undefined if we are creating a sentinel first object.
 *         }
 *         @param["nextObj" @oneof[Object undefined]]{
 *           The object that will come after the synthetic object we are having
 *           you create, or undefined if we are creating a sentinel last object.
 *         }
 *       ]
 *     ]]
 *     @key["makeFirst" #:optional @default[true] Boolean]{
 *       Should we compel the insertion of a synthetic object as the very first
 *       item?
 *     }
 *     @key["makeLast" #:optional @default[false] Boolean]{
 *       Should we compel the insertion of a synthetic object as the very last
 *       item?
 *     }
 *   ]]
 *   @param[aData]
 * ]
 */
function DecoratingInterposingViewSlice(aWrappedSlice,
                                        aDef, aData) {
  /**
   * The view slice that we are wrapping.
   */
  this._wrapped = aWrappedSlice;
  // steal the listener off of the wrapped slice; we are decorating after all.
  this._listener = this._wrapped._listener;
  this._wrapped._listener = this;
  /**
   * Our classification function.
   */
  this._classifier = aDef.classifier;
  /**
   * Our maker function.
   */
  this._generator = aDef.maker;
  /**
   * Opaque data for use by our consumer provided by our creator.
   */
  this.data = aData;
  /**
   * Should we run the maker function for the first entry?
   */
  this._synthFirst = ("makeFirst" in aDef) ? aDef.makeFirst : true;
  /**
   * Should we run the maker function for the last entry?
   */
  this._synthLast = ("makeLast" in aDef) ? aDef.makeLast : false;

  this._interposed = [];
  this._privBase = 0;

  this._lowKey = undefined;
  this._highKey = undefined;
}
DecoratingInterposingViewSlice.prototype = {
  __proto__: wrappingProto,

  /**
   * @listof["entry" InterposedEntry]
   */
  _interposed: null,

  /**
   * Given a list of items,
   *
   * @args[
   *   @param[aStartIndex]
   *   @param[aItems]
   *   @param[aLowClassKey]{
   *     The effective classificiation key just "below" the first item being
   *     classified.  This means that if the first item being classified has the
   *     same classification key, we will not inject a synthetic object.
   *     undefined has a special value and indicates that the first item being
   *     classified is really the first item in the entire conceptual list.
   *   }
   *   @param[aHighClassKey]{
   *     Like `aLowClassKey` but just "above" the last item.
   *   }
   * ]
   * @return[@dict[
   *   @key[lowKey]{
   *     The effective low key after having classified the list.  If
   *     `aLowClassKey` was undefined, then this is the classification key of
   *     the first item in the list, otherwise it is the same value that was
   *     originally passed in.
   *   }
   *   @key[highKey]{
   *     The effective high keey after having classified the list, analogous
   *     to `lowKey` but using `aHighClassKey` and the last item in the list.
   *   }
   *   @key[interposed @listof[InterposedEntry]]{
   *     The InterposedEntry descriptors for all of the newly interposed objects
   *     created during this classification pass.
   *   }
   *   @key[pub @listof[Object]]{
   *     The resulting public list of intermixed interposed objects and actual
   *     content objects from the wrapped view slice.  The interposed objects
   *     are the values of the "obj" attributes of the `InterposeEntry`
   *     instances, not the entries themselves.  This is what should be surfaced
   *     as the product of this view slice.
   *   }
   * ]]
   */
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

  grow: function(aDirMagnitude) {
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

  seek: function(aSeekSpot, aBefore, aAfter) {
    this._wrapped.seek(aSeekSpot, aBefore, aAfter);
  },

  /**
   * Interposed objects always have the same ordering key as the element they
   *  displace, with the exception of synthetic last entries which use the
   *  ordering key of the item that precedes them.
   */
  translateIndex: function(aIndex) {
  },

  //////////////////////////////////////////////////////////////////////////////
  // Updates from the underlying viewslice

  /**
   * A strict splice; no negative indices or undefined howmanys.  We assume this
   *  call is always coming to us
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

  requestedPiece: function() {
  },

  //////////////////////////////////////////////////////////////////////////////
};
exports.DecoratingInterposingViewSlice = DecoratingInterposingViewSlice;

}); // end require.def
