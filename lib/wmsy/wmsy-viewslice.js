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
function DecoratingInterposingViewSlice() {

}
DecoratingInterposingViewSlice.prototype = {
  splice: function(aIndex, aHowMany, aItems) {
    
  }
};
