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
 * Id spaces are used to name the objects that are bound to wmsy objects in
 *  specific contexts.  The origin of this need is to be able to update wmsy
 *  objects when the backing model tells us that the object has changed without
 *  needing to have every widget manually handle registration and updates.
 **/

define("wmsy/wmsy-idspace",
  [
    "exports"
  ],
  function(
    exports
  ) {

/**
 * Defines an id-space
 */
function IdSpaceDefinition(name, func) {
  this.name = name;
  this.extractor = func;
}
IdSpaceDefinition.prototype = {
};
exports.IdSpaceDefinition = IdSpaceDefinition;

/**
 * The per-document per-wmsy domain registry which can contain multiple
 *  instantiated id spaces.
 */
function IdSpaceDocRegistry(spaceDefs) {
  this.watching = false;
  this.watchers = [];
  this.spaceDefs = spaceDefs;
  var spaces = this.spaces = {};
  for (var spaceName in spaceDefs) {
    spaces[spaceName] = {};
  }
}
IdSpaceDocRegistry.prototype = {
  /**
   * Register a binding in a given space.  This is assumed to happen using
   *  built-in bindings whose implementations are beyond reproach, so we don't
   *  really sanity check arguments.  Be safe!
   */
  registerBinding: function(spaceName, binding, forbidKeepDom) {
    var id = this.spaceDefs[spaceName].extractor(binding.obj);
    var space = this.spaces[spaceName];
    // if it's not there, stick it in direct
    if (!(id in space)) {
      space[id] = binding;
    }
    // if it's in there, we may need to promote it to a list
    else {
      if (!Array.isArray(space[id]))
        space[id] = [space[id], binding];
      else
        space[id].push(binding);
    }

    var retval;
    if (this.watching) {
      for (var i = 0; i < this.watchers.length; i++) {
        var watcher = this.watchers[i];
        if (watcher.space !== spaceName)
          continue;
        if (id in watcher.added)
          watcher.added[id].push(binding);
        else
          watcher.added[id] = [binding];
        if (watcher.registerHook)
          watcher.registerHook(retval, forbidKeepDom);
      }
    }
    return retval;
  },

  getBindingExtractor: function(spaceName) {
    return this.spaceDefs[spaceName].extractor;
  },

  /**
   * Unregister a binding from the id space (because it is getting destroyed).
   *  As with `registerBinding`, we aren't paranoid so don't screw up.
   */
  unregisterBinding: function(spaceName, binding, forbidKeepDom) {
    var id = this.spaceDefs[spaceName].extractor(binding.obj);
    var space = this.spaces[spaceName];

    var maybeBindingList = space[id];
    if (Array.isArray(maybeBindingList)) {
      if (maybeBindingList.length === 1) {
        delete space[id];
      }
      else {
        maybeBindingList.splice(maybeBindingList.indexOf(binding), 1);
      }
    }
    else {
      delete space[id];
    }

    var retval;
    if (this.watching) {
      for (var i = 0; i < this.watchers.length; i++) {
        var watcher = this.watchers[i];
        if (watcher.space !== spaceName)
          continue;
        if (id in watcher.removed)
          watcher.removed[id].push(binding);
        else
          watcher.removed[id] = [binding];
        if (watcher.unregisterHook)
          retval = watcher.unregisterHook(id, binding, retval, forbidKeepDom);
      }
    }
    return retval;
  },

  /**
   * Return a list of the bindings associated with the id that the given object
   *  maps to in the given space.  The use of the nebulous 'associated' is that
   *  you could have a space where many objects map onto a single id, like
   *  messages in a conversation could have both a message space (1:1) and a
   *  conversation space (many:1).
   */
  findBindingsUsingObject: function(spaceName, obj) {
    var id = this.spaceDefs[spaceName].extractor(obj);
    var space = this.spaces[spaceName];
    if (!(id in space))
      return [];
    var maybeBindingList = space[id];
    if (Array.isArray(maybeBindingList))
      return maybeBindingList;
    else
      return [maybeBindingList];
  },

  /**
   * Return a list of the bindings representing the object(s) synonymous with
   *  the given id in the given space.
   */
  findBindingsUsingId: function(spaceName, id) {
    var space = this.spaces[spaceName];
    if (!(id in space))
      return [];
    var maybeBindingList = space[id];
    if (Array.isArray(maybeBindingList))
      return maybeBindingList;
    else
      return [maybeBindingList];
  },

  /**
   * Update all widget bindings associated with this object in the given id
   *  space.
   */
  updateUsingObject: function(spaceName, obj) {
    var bindings = this.findBindingsUsingObject(spaceName, obj);
    for (var i = 0; i < bindings.length; i++) {
      bindings[i].update();
    }
  },

  /**
   * Look up all widgets associated with the provided id and cause them to
   *  update.
   */
  updateUsingId: function(spaceName, id) {
    var bindings = this.findBindingsUsingId(spaceName, id);
    for (var i = 0; i < bindings.length; i++) {
      bindings[i].update();
    }
  },

  /**
   * Update all of the objects registered in the given space.
   */
  updateAllObjectsInSpace: function(spaceName) {
    var space = this.spaces[spaceName];
    for (var key in space) {
      var maybeList = space[key];
      if (Array.isArray(maybeList)) {
        for (var i = 0; i < maybeList.length; i++) {
          maybeList[i].update();
        }
      }
      else {
        maybeList.update();
      }
    }
  },

  /**
   * Request that we start logging what goes on in the given id space.
   *
   * @args[
   *   @param[who String]{
   *     A sufficiently unique identifier to distinguish who is doing the
   *     watching from potential other watchers for the same space.  You can
   *     watch multiple spaces with the same name.
   *   }
   *   @param[spaceName String]{
   *     The name of the id space to watch.
   *   }
   * ]
   */
  startWatching: function(who, spaceName, registerHook, unregisterHook) {
    this.watching = true;
    this.watchers.push({who: who, space: spaceName,
                        registerHook: registerHook,
                        unregisterHook: unregisterHook,
                        added: {}, removed: {}});
  },

  /**
   * Stop logging what goes on in the given id space and return the list of
   *  additions and removals observed.
   *
   * @args[
   *   @param[who String]{
   *     The same value you used to `startWatching`.
   *   }
   *   @param[spaceName String]{
   *     The same value you used to `startWatching`.
   *   }
   * ]
   * @return[@dict[
   *   @key[who String]{
   *     The unique identifier you had passed us.
   *   }
   *   @key[space String]{
   *     The name of the space you were listening on.
   *   }
   *   @key[added @dictof[
   *     @key["object id" String]{
   *       The unique identifier for the underying object represented by the
   *       binding(s) that were added.  You can use this id in calls to
   *       `findBindingsUsingId` or `updateUsingId`.
   *     }
   *     @value["bindings" @listof[WidgetBinding]]{
   *       The bindings corresponding to the given object that were added.
   *     }
   *   ]]
   *   @key[removed @dictof[
   *     @key["object id" String]{
   *       The unique identifier for the underying object represented by the
   *       binding(s) that were removed.
   *     }
   *     @value["bindings" @listof[WidgetBinding]]{
   *       The bindings corresponding to the given object that were removed.
   *     }
   *   ]]
   * ]]
   */
  finishWatching: function(who, spaceName) {
    var results;
    for (var i = 0; i < this.watchers.length; i++) {
      if (this.watchers[i].who === who &&
          this.watchers[i].space === spaceName) {
        results = this.watchers[i];
        this.watchers.splice(i, 1);
        if (this.watchers.length === 0)
          this.watching = false;
        return results;
      }
    }

    throw new Error("request to finish watching without a startWatching!");
  },
};
exports.IdSpaceDocRegistry = IdSpaceDocRegistry;

}); // end define
