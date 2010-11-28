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
function InterposedEntry(aIndex, aGeneratedObj) {
  this.index = aIndex;
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
 *  or they are displaced or deleted.  This allows synthetic items to have
 *  their state depend on the specific objects rather than just the
 *  classification keys.  For example, when displaying a list of messages,
 *  you might quantize to the day as a classification key, but could still
 *  explicitly call out the exact time delta between two messages from different
 *  days.
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

  /**
   * @listof[InterposedEntry]
   */
  this._interposed = [];

  this.liveList = null;
  this.atFirst = this.atLast = false;
}
DecoratingInterposingViewSlice.prototype = {
  __proto__: wrappingProto,

  /**
   * Classify between the provided (inclusive) points of the upstream/raw list.
   *  Point in the emacs sense; if we are classifying point 1 then we are
   *  running a classifier against the objects at indices 0 and 1 and generating
   *  an interposed entry displacing the object at index 1 if they do not match.
   *  Point 0 and the point at the length of the upstream livelist are special
   *  and only do anything if we are `atFirst`/`atLast` and `_synthFirst`/
   *  `synthLast`.
   *
   * This method manipulates our output `liveList` and `_interposed` lists and
   *  will trigger a didSplice notification if any changes are made or if a
   *  non-zero `aDelCount` is passed in.
   *
   * @args[
   *   @param[aLowPoint Number]{
   *     Inclusive lower point bound for classification consideration in the
   *     upstream liveList.
   *   }
   *   @param[aHighPoint Number]{
   *     Inclusive upper point bound for classification consideration in the
   *     upstream liveList.  Together with aLowPoint this also describes the
   *     sublist of new items that should be spliced into `liveList`.
   *   }
   *   @param[aDelCount Number]{
   *     The number of deletions that occurred at point, strictly for
   *     didSplice notification purposes; this method does not care how
   *     many things were deleted.
   *   }
   * ]
   */
  _classifyPoints: function(aLowPoint, aHighPoint, aDelCount,
                            aRequested, aMoreExpected, aSuppressSplice) {
    var point = aLowPoint, items = this._wrapped.liveList;

    var newEntries = [], newPub = [], generated;

    // -- classify
    // - top
    if (point === 0) {
      if (this._wrapped.atFirst && this._synthFirst) {
        generated = this._generator(undefined, items[point]);
        newEntries.push(new InterposedEntry(aLowPoint, generated));
        newPub.push(generated);
      }
      if (point < aHighPoint)
        newPub.push(items[point]);
      point++;
    }

    // - middle
    var lastItem = items[point - 1], lastKey = this._classifier(lastItem);
    for(; point <= aHighPoint && point < items.length; point++) {
      var curItem = items[point];
      var curKey = this._classifier(curItem);
      if (lastKey !== curKey) {
        generated = this._generator(lastItem, curItem);
        newEntries.push(new InterposedEntry(point, generated));
        newPub.push(generated);
      }
      // don't append the pub for the rightmost point
      if (point < aHighPoint)
        newPub.push(curItem);
      lastKey = curKey;
      lastItem = curItem;
    }

    // - bottom
    if (point <= aHighPoint && point === items.length) {
      if (this._wrapped.atLast && this._synthLast) {
        generated = this._generator(items[point - 1], undefined);
        newEntries.push(new InterposedEntry(point, generated));
        newPub.push(generated);
      }
    }

    // -- apply state changes
    // find out the insertion point
    var mutateTrans = this._upstreamIndexToInternalIndices(aLowPoint);

    // - entries; splice in and upshift existing entries by raw increase
    if (newEntries.length) {
      var delta = aHighPoint - aLowPoint, entries = this._interposed;
      // upshift by delta
      for (var ei = mutateTrans.entryIndex; ei < entries.length; ei++) {
        entries[ei].index += delta;
      }
      // splice in using apply; perhaps should slice and concat instead?
      entries.splice.apply(entries,
                           [mutateTrans.entryIndex, 0].concat(newEntries));
    }

    // - pub
    if (newPub.length) {
      this.liveList.splice.apply(this.liveList,
                                 [mutateTrans.pubIndex, 0].concat(newPub));
    }

    // -- notify
    if (!aSuppressSplice && (newPub.length || aDelCount))
      this._listener.didSplice(mutateTrans.pubIndex, aDelCount, newPub,
                               aRequested, aMoreExpected, this);
  },

  /**
   * Translate an index in our exposed `liveList` to the interposed entry/index
   *  (if any) that it corresponds to and/or the underlying raw entry/index that
   *  it corresponds to.  This does not touch the upstream object list, so this
   *  method can be used when dealing with post-splice update cases as long as
   *  you keep in mind all results from this are effectively pre-splice.
   *
   * This could easily be precomputed or accelerated, but is not; deferred until
   *  profiling proves us problematic.  (It should be a while given the whole
   *  point of view slices is to keep the 'active set' that we see small.)
   *
   * @args[
   *   @param[aIndex Number]{
   *     The index
   *   }
   * ]
   * @return[@dict[
   *   @key[entry InterposedEntry]{
   *     If `aIndex` references an interposed entry, this is it, otherwise null.
   *   }
   *   @key[entryIndex Number]{
   *     If `entry` is non-null, this is its index.  Otherwise, this is the
   *     index of the first entry after `aIndex` in the `liveList`.
   *   }
   *   @key[rawIndex Number]{
   *     If `entry` is non-null, this is the index of the object that is
   *     displaced (which is also available on the `entry` itself.)  If `entry`
   *     is null, then this is just the index of the upstream object.  In the
   *     event of a synthetic last entry, this will be the length of the
   *     upstream object list (and not a valid index to access.)
   *   }
   *   @key[pubIndex Number]{
   *     The public index implied.
   *   }
   * ]]
   */
  _publicIndexToInternalIndices: function(aIndex) {
    if (aIndex < 0 || aIndex >= this.liveList.length)
      throw new Error("Invalid (public) index supplied: " + aIndex);

    // entry index, upstream/raw index,
    var ei = 0, ui = 0, entries = this._interposed, entry = null;

    if (entries.length && entries[0].index === 0)
      entry = entries[0];
    // rd: requested index distance remaining
    for (var rd = aIndex; rd > 0; rd--) {
      // if we were just on a synthetic entry, we must now be on an upstream
      //  value.
      if (entry) {
        entry = null;
        ei++;
      }
      // we were not on a synthetic entry; advance the upstream index,
      //  potentially encountering a displacing entry node.
      else {
        ui++;
        if (ei < entries.length && entries[ei].index === ui)
          entry = entries[ei];
      }
    }

    return {
      entry: entry,
      entryIndex: ei,
      rawIndex: ui,
      pubIndex: aIndex,
    };
  },

  /**
   * Translate an upstream index to a translated rep as returned by
   *  `_publicIndexToInternalIndices`.
   */
  _upstreamIndexToInternalIndices: function(aIndex) {
    var entries = this._interposed, i, pubIndex = aIndex;
    for (i = 0; i < entries.length; i++) {
      // we are done if the entry displaces something higher than our index
      if (entries[i].index > aIndex)
        break;
      // each interposed entry bumps the item up in the liveList by one.
      pubIndex++;
    };

    return {
      // an upstream index can never refer to an interposed entry
      entry: null,
      entryIndex: i,
      rawIndex: aIndex,
      pubIndex: pubIndex,
    };
  },

  /**
   * Perform a range deletion on the (internal) range.  This can result in the
   *  need to generate a new interposed entry because of the new touching edges
   *  or a need to regenerate an existing entry because of changes in the
   *  raw item that precedes it.  However, since this is only possible in the
   *  variant where we are called by didSplice and an insertion will invalidate
   *  anything we create, we just leave it up to didSplice to handle.
   *
   * Unless used in a `noteRanges` mode of operation, we will generate
   *  `didSplice` notifications.  Because of the potential for a new/revised
   *  interposed entry, this can result in simultaneous removal and addition.
   *
   * @args[
   *   @param[aLowTrans]{
   *     Inclusive lower bound to excise, as returned by
   *     `_publicIndexToInternalIndices`.
   *   }
   *   @param[aHighTransEx]{
   *     Exclusive upper bound to excise, as returned by
   *     `_publicIndexToInternalIndices`.
   *   }
   * ]
   * @return[]
   */
  _exciseRange: function(aLowTrans, aHighTransEx) {
    // -- potentially expand to include an adjacency affected entry
    // (It is our documented behaviour that all interposed entries are
    //  recalculated when entries on either side change.)
    // Since the high transaction is already computed, we just need to see if
    //  it is exactly located on an entry, and if so, bump the exclusion range
    //  up off of it.
    if (aHighTransEx.entry) {
      aHighTransEx.entry = null;
      aHighTransEx.entryIndex++;
      aHighTransEx.pubIndex++;
    }

    // figure out the position of the deletion range
    //  (top/middle/bottom) => (-1/0/1)
    var pos = (aLowTrans.rawIndex === 0) ? -1 :
                (aHighTransEx.pubIndex === this.liveList.length ? 1 : 0);

    // -- update all displacements for entries above the range
    // (not needed for entries below the range)
    var entries = this._interposed;
    // The displacement amount is exactly the number of raw items removed since
    //  entry indices are in raw item (index) space.
    var delta = aLowTrans.rawIndex - aHighTransEx.rawIndex;
    for (var ei = aHighTransEx.entryIndex; ei < entries.length; ei++) {
      entries[ei].index += delta;
    }

    // -- remove excised interposed entries
    if (aLowTrans.entryIndex != aHighTransEx.entryIndex) {
      this._interposed.splice(aLowTrans.entryIndex,
                              aHighTransEx.entryIndex - aLowTrans.entryIndex);
    }

    // -- splice delete from the liveList
    var pubDelCount = aHighTransEx.pubIndex - aLowTrans.pubIndex;
    this.liveList.splice(aLowTrans.pubIndex, pubDelCount);

    // -- generate the splice notification!
    this._listener.didSplice(aLowTrans.pubIndex, pubDelCount, null,
                             false, false, this);
  },

  //////////////////////////////////////////////////////////////////////////////
  // Interface exposure to our listener / consumer

  noteRanges: function(aUsingLow, aVisibleLow, aVisibleHighEx, aUsingHighEx) {
    var lowTrans = this._publicIndexToInternalIndices(aUsingLow);
    var outLow = lowTrans.rawIndex;
    // we can mutate the visibility values in place; we won't need them again
    aVisibleLow = this._publicIndexToInternalIndices(aVisibleLow).rawIndex;
    aVisibleHighEx =
      this._publicIndexToInternalIndices(aVisibleHighEx).rawIndex;
    var highTrans = this._publicIndexToInternalIndices(aUsingHighEx);
    var outHighEx = highTrans.rawIndex;

    this._wrapped.noteRanges(outLow, aVisibleLow, aVisibleHighEx, outHighEx);

    // perform local excisions
    if (aUsingHighEx < this.liveList.length)
      this._exciseRange(
        highTrans,
        this._publicIndexToInternalIndices(this.liveList.length));
    if (aUsingLow)
      this._exciseRange(this._publicIndexToInternalIndices(0),
                        lowTrans);

    this.atLast = this._wrapped.atLast;
    this.atFirst = this._wrapped.atFirst;
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
    var trans = this._publicIndexToInternalIndices(aIndex);
    // rawIndex can point just beyond the list for synthetic last; bump down
    if (trans.rawIndex == this._wrapped.liveList.length)
      trans.rawIndex--;
    // and of course, only the wrapped view slice knows the ordering key
    return this._wrapped.translateIndex(trans.rawIndex);
  },

  //////////////////////////////////////////////////////////////////////////////
  // Updates from the underlying viewslice

  didSplice: function vs_interpose_didSplice(aIndex, aHowMany, aItems,
                                             aRequested, aMoreExpected,
                                             aSlice) {
    this.atLast = this._wrapped.atLast;
    this.atFirst = this._wrapped.atFirst;

    // -- delete
    if (aHowMany) {
      this._exciseRange(
        this._upstreamIndexToInternalIndices(aIndex),
        this._upstreamIndexToInternalIndices(aIndex + aHowMany));
      // (all state is coherent at this point; nothing is left undone!)
    }

    // -- add
    if (aItems && aItems.length) {
      var delCount = aHowMany;

      // - Compulsory invalidation of an entry immediately after the insertion.
      // (since we have not yet processed the inserted items yet, though, we
      //  check at the index of insertion...)
      var invCheck = this._upstreamIndexToInternalIndices(aIndex);
      if (invCheck.entry) {
        // splice it out of our entry list
        this._interposed.splice(invCheck.entryIndex, 1);
        // and out of the liveList
        this.liveList.splice(invCheck.pubIndex, 1);
        // we will need to tell the listener about the deletion...
        delCount++;
        // (this does not impact the index attributes of the other entries;
        //  no manipulations of the other entries are required.)
      }

      // - Processing of the new dudes.
      this._classifyPoints(aIndex, aIndex + aItems.length, delCount,
                           aRequested, aMoreExpected);
    }
    // -- delete case deferred classification
    // If we deleted anything, we may have invalidated something.
    else if (aHowMany) {
      this._classifyPoints(aIndex, aIndex, aHowMany, aRequested, aMoreExpected);
    }
  },

  didSeek: function(aItems, aMoreExpected, aSlice) {
    this.liveList = [];
    this._classifyPoints(0, aItems.length, 0, true, aMoreExpected, true);

    this.atLast = this._wrapped.atLast;
    this.atFirst = this._wrapped.atFirst;
    this._listener.didSeek(this.liveList, aMoreExpected, this);
  },

  //////////////////////////////////////////////////////////////////////////////
};
exports.DecoratingInterposingViewSlice = DecoratingInterposingViewSlice;

}); // end require.def
