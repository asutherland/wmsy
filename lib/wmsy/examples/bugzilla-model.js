/**
 * Pre-database bugzilla and related metadata representation.  This will ideally
 *  inform a gloda(ng) style implementation.
 */

var dateFromISO8601 = require("wmsy/examples/date-utils").dateFromISO8601;
var md5 = require("md5");

/**
 * Eat paired parens / brackets
 */
function unwrapStr(aStr) {
  var len = aStr.length;
  if ((aStr[0] == "(" && aStr[len - 1] == ")") ||
      (aStr[0] == "[" && aStr[len - 1] == "]"))
    return aStr.substring(1, len - 1);
  return aStr;
}

var TRIM_REGEX = /^\s*|\s*$/g;
function trim(aStr) {
  return aStr.replace(TRIM_REGEX, "");
}

var PeopleDefaultTagGroups = {
  // Hat label possibilities:
  // wizard hat, top hat, hard hat, aviator glasses, beanie, jester hat,
  // beer hat, baseball cap, colonial era/magistrate wig, tri-corner hat...
  role: [
    {
      id: "dev",
      label: "Dev",
      desc: "developer",
    },
    {
      id: "driver",
      label: "Driver",
      desc: "release driver/triager",
    },
    {
      id: "qa",
      label: "QA",
      desc: "QA"
    },
    {
      id: "pro",
      label: "Pro",
      desc: "Expert User"
    },
    {
      id: "user",
      label: "User",
      desc: "Non-expert User",
      isDefault: true,
    },
    {
      id: "sad",
      label: ":(",
      desc: "Non-helpful contributions"
    }
  ],

/*
  moods: {
    happy: {
      icon: "happy",
      desc: "This person makes you happy!",
      score: 1
    },
    sad: {
      icon: "sad",
      desc: "This person makes you sad. :( :( :(",
      score: -1
    }
  }
*/
};

function BugPerson(aEmail, aTags) {
  this.email = this.name = this.handle = aEmail;
  this.raw = null;
  this.tags = aTags;
}
BugPerson.prototype = {
  _chewRaw: function BugPerson__chewRaw(aRawUser) {
    // nothing to do if there is no real name...
    if (!("real_name" in aRawUser))
      return;
    this.raw = aRawUser;

    var name = this.raw.real_name;
    var nick = null;
    // XXX a careful regex would be much more straightforward...
    // if there are parens, try and find the nick in there first...
    var idxFirstParen = name.indexOf("("), idxColon, idxNickStop;
    var idxFirstBracket = name.indexOf("[");
    if (idxFirstParen >= 0) {
      var idxCloseParen;
      if (idxFirstBracket >= 0 && idxFirstBracket < idxFirstParen) {
        idxFirstParen = idxFirstBracket;
        idxCloseParen = name.indexOf("]", idxFirstParen);
      }
      else {
        idxCloseParen = name.indexOf(")", idxFirstParen);
      }
      var parenBits = name.substring(idxFirstParen + 1,
                                     (idxCloseParen >= 0) ?
                                       idxCloseParen : undefined);
      name = trim(name.substring(0, idxFirstParen));

      idxColon = parenBits.indexOf(":");
      if (idxColon >= 0) {
        idxNickStop = parenBits.indexOf(" ", idxColon);
        if (idxNickStop == -1)
          idxNickStop = parenBits.length;
        nick = parenBits.substring(idxColon + 1, idxNickStop);
      }
    }
    // If we didn't find the IRC nick in the parens, we may have a
    // "David :Bienvenu" on our hands which we want to normalize into a name of
    // "David Bienvenu" and a nick of "bienvenu"
    if (!nick) {
      idxColon = name.indexOf(":");
      if (idxColon >= 0) {
        idxNickStop = name.indexOf(" ", idxColon);
        if (idxNickStop == -1)
          idxNickStop = name.length;
        nick = name.substring(idxColon + 1, idxNickStop);
        name = name.replace(":", "");
      }
    }

    this.name = name;
    this.handle = nick ? nick : name;
  },

  /**
   * Return the URL for a 24x24 avatar icon.  This should probably be a purely
   *  presentation layer thing.
   */
  get avatar24() {
    return "http://www.gravatar.com/avatar/" + md5.hex_md5(this.email) +
      ".jpg?d=wavatar&s=24";
  },
};

/**
 * Clearing-house for user information processing / extraction / transformation.
 *
 * Supports primitive all-or-nothing persistence.
 */
var BugPeeps = {
  _emailToPerson: {},
  tagGroups: PeopleDefaultTagGroups,
  defaultTags: {
    role: "user",
  },

  /**
   * Convert an e-mail address to a BugPerson; suitable for flag requestee
   *  enrichment.
   */
  fromEmail: function BugPeeps_fromEmail(aEmail) {
    if (aEmail in this._emailToPerson)
      return this._emailToPerson[aEmail];

    var tags = {};
    for (var key in this.defaultTags) {
      tags[key] = this.defaultTags[key];
    }

    var person = new BugPerson(aEmail, tags);
    this._emailToPerson[aEmail] = person;
    return person;
  },

  /**
   * Convert a BZ REST API User structure into a BugPerson.
   */
  fromUserJson: function BugPeeps_fromUser(aUser) {
    var person = this.fromEmail(aUser.name);

    if (!person.raw || (!("real_name" in person.raw)))
      person._chewRaw(aUser);

    return person;
  },

  /**
   * Get force-fed our state from an object we previously returned via
   *  |_persistToObj|, clobbering our state.
   */
  _loadFromObj: function BugPeeps__loadFromObj(aObj) {
    this._emailToPerson = aObj.peeps;
    this.tagGroups = aObj.tagGroups;

    this.defaultTags = {};
    // we need to rebuild our default map
    for (var groupName in this.tagGroups) {
      var tagGroup = this.tagGroups[groupName];
      for (var i = 0; i < tagGroup.length; i++) {
        var meta = tagGroup[i];
        if (("isDefault" in meta) && (meta.isDefault))
          this.defaultTags[groupName] = meta.id;
      }
    }
  },

  /**
   * Return our current state for persistence.
   */
  _persistToObj: function BugPeeps__persistToObj() {
    return {
      peeps: this._emailToPerson,
      tagGroups: this.tagGroups,
    };
  },
};
exports.BugPeeps = BugPeeps;

function chewBugs(aRawBugs) {
  var bugs = [];
  for (var i = 0; i < aRawBugs.length; i++) {
    bugs.push(new Bug(aRawBugs[i]));
  }
  return bugs;
}
exports.chewBugs = chewBugs;

function Bug(aRawBug) {
  this.raw = aRawBug;

  // things requiring conversion
  this.id = parseInt(this.raw.id);
  this.creationDate = dateFromISO8601(this.raw.creation_time);

  // peoples
  this.reporter = BugPeeps.fromUserJson(this.raw.reporter);
  this.assignee = BugPeeps.fromUserJson(this.raw.assigned_to);


  this.activePatches = [];
  this.mootedPatches = [];
  this.activeAttachments = [];
  this.mootedAttachments = [];

  this.attachmentMap = {};

  this.events = [];

  this._chewAttachments(this.raw.attachments);
  this._chewCommentsAndChanges(this.raw.comments, this.raw.history);

}
Bug.prototype = {
  _chewAttachments: function Bug__chewAttachments(aRawAttachments) {
    for (var iAtt = 0; iAtt < aRawAttachments.length; iAtt++) {
      var rawAtt = aRawAttachments[iAtt];

      // the next rev of the bugzilla API will give actual bools/ints
      var is_obsolete = parseInt(rawAtt.is_obsolete);
      var targetList = parseInt(rawAtt.is_patch) ?
                         (is_obsolete ? this.mootedPatches
                                      : this.activePatches) :
                         (is_obsolete ? this.mootedAttachments
                                      : this.activeAttachments);
      var att = new Attachment(rawAtt);
      targetList.push(att);
      this.attachmentMap[att.id] = att;
    }
  },
  /**
   * Reintegrate history and comments.  Traverse the lists taking the earliest
   *  from each and when they are the same time (and user), merge them into
   *  a single BugEvent.
   */
  _chewCommentsAndChanges: function Bug__chewComments(aRawComments,
                                                      aChangeSets) {
    var iComment = 0, iChangeSet = 0, tsComment = null, tsChangeSet = null,
        nextComment = null, nextChangeSet = null;
    var events = this.events;
    if (aRawComments.length) {
      nextComment = aRawComments[iComment];
      tsComment = dateFromISO8601(nextComment.creation_time);
    }
    if (aChangeSets.length) {
      nextChangeSet = aChangeSets[iChangeSet];
      tsChangeSet = dateFromISO8601(nextChangeSet.change_time);
    }

    var dis = this;
    /**
     * Create a new event using the given mixture and updating all state
     *  variables as appropriate.
     */
    function pushIt(useComment, useChangeSet) {
      // number the comments, they don't come numbered
      if (useComment)
        nextComment.num = iComment + 1;
      events.push(new BugEvent(dis,
                               useComment ? tsComment : tsChangeSet,
                               useComment ? nextComment : null,
                               useChangeSet ? nextChangeSet : null));
      if (useComment) {
        if (++iComment < aRawComments.length) {
          nextComment = aRawComments[iComment];
          tsComment = dateFromISO8601(nextComment.creation_time);
        }
        else {
          nextComment = tsComment = null;
        }
      }
      if (useChangeSet) {
        if (++iChangeSet < aChangeSets.length) {
          nextChangeSet = aChangeSets[iChangeSet];
          tsChangeSet = dateFromISO8601(nextChangeSet.change_time);
        }
        else {
          nextChangeSet = tsChangeSet = null;
        }
      }
    }

    // we're done when we've consumed them all
    while (nextComment || nextChangeSet) {
      if (nextComment && nextChangeSet) {
        if (tsComment.valueOf() == tsChangeSet.valueOf())
          pushIt(true, true);
        else if (tsComment < tsChangeSet)
          pushIt(true, false);
        else
          pushIt(false, true);
      }
      else if (nextComment) {
        pushIt(true, false);
      }
      else {
        pushIt(false, true);
      }
    }
  },

  get status() {
    return this.raw.status;
  },
  get summary() {
    return this.raw.summary;
  },
};
exports.Bug = Bug;

/**
 * So, we can map these via the global configuration and get better display
 *  info, but since things are so predictable and the configuration is
 *  expensive, let's run without it now.
 *
 * Examples:
 * - cf_blocking193: no product name (platform/toolkit implied)
 * - cf_blocking_thunderbird31: product name and version
 * - cf_status_thunderbird31: product name and version
 * - cf_blocking_fennec: no version
 */
var CF_REGEX = /cf_(blocking|status)_([a-zA-Z]+)?(\d+)?/;
/**
 * Attachment flag changes may have payloads.  This regex has the following:
 * 1) flag name
 * 2) +/?/-
 * 3) payload (optional)
 */
var ATTACHMENT_FLAG_CHANGE_REGEX = /^(.+)([-+?])(?:\(([^\)]+)\))?$/;
var FLAG_SPLIT = /[, ]+/g;

/**
 * The fusion of comments and history changesets.
 */
function BugEvent(aOwner, aTimestamp, aRawComment, aRawChangeSet) {
  this.bug = aOwner;

  this.date = aTimestamp;
  this.rawComment = aRawComment;
  this.rawChangeSet = aRawChangeSet;

  this.author = BugPeeps.fromUserJson(aRawComment ? aRawComment.author
                                                  : aRawChangeSet.changer);
  this.attachmentChanges = [];
  this.bugChanges = [];

  if (aRawChangeSet)
    this._chewChangeSet(aRawChangeSet);

}
BugEvent.prototype = {
  _chewChangeSet: function BugEvent__chewChangeSet(aChangeSet) {
    // boring until proven interesting
    var boring = true, match, att_map = {}, invert;

    var changes = aChangeSet.changes;
    for (var i = 0; i < changes.length; i++) {
      var change = changes[i];

      // -- Attachment!
      // For attachment changes, just show the new state.
      if ("attachment_id" in change) {
        boring = false;
        var attachment_id = parseInt(change.attachment_id), attachDelta;

        if (attachment_id in att_map) {
          attachDelta = att_map[attachment_id];
        }
        else {
          attachDelta = {
            attachment: this.bug.attachmentMap[attachment_id],
            flagChanges: [],
          };
          att_map[attachment_id] = attachDelta;
          this.attachmentChanges.push(attachDelta);
        }

        // - flag
        if (change.field_name == "flag") {
          // flags can be added and removed in the same go, so this needs to
          //  live in a function
          function gobbleFlags(flagStrs, invert) {
            // and this is a comma-delimited list
            var flagBits = flagStrs.split(FLAG_SPLIT);
            for (var i = 0; i < flagBits.length; i++) {
              var match = ATTACHMENT_FLAG_CHANGE_REGEX.exec(flagBits[i]);
              // generate a synthetic raw state...
              var rawPatchFlag = {
                name: match[1],
                status: match[2],
                setter: aChangeSet.changer,
                invert: invert,
              };
              if (match[3])
                rawPatchFlag.requestee = {name: match[3]};
              var patchFlag = new PatchFlag(rawPatchFlag);

              attachDelta.flagChanges.push(patchFlag);
            }
          }

          if (change.added)
            gobbleFlags(change.added, false);
          if (change.removed)
            gobbleFlags(change.removed, true);
        }
        // - non-flag
        else {

        }
      }
      // -- The Bug!
      else {
        if (change.field_name != "cc")
          boring = false;

        // - custom field  (as flag)
        match = CF_REGEX.exec(change.file_name);
        if (match) {

        }
      }
    }

    this.boring = boring;
  },

  get id() {
    return this.rawComment ? this.rawComment.num : " ";
  },

  get comment() {
    return this.rawComment ? this.rawComment.text : "";
  },

  /**
   * cc changes without comments are boring.
   */
  get isBoring() {

  }
};

function Attachment(aRawAtt) {
  this.raw = aRawAtt;
  this.id = parseInt(this.raw.id);

  this.flags = [];

  if ("flags" in this.raw)
    this._chewFlags(this.raw.flags);
}
Attachment.prototype = {
  _chewFlags: function Attachment__chewFlags(aRawFlags) {
    for (var iFlag = 0; iFlag < aRawFlags.length; iFlag++) {
      var rawFlag = aRawFlags[iFlag];
      this.flags.push(new PatchFlag(rawFlag));
    }
  },
  get description() {
    return this.raw.description;
  },
  get isObsolete() {
    return Boolean(this.raw.is_obsolete);
  },
  get isPatch() {
    return Boolean(this.raw.is_patch);
  },
};

var FEEDBACK_FLAG_MAP = {
  review: "r",
  superreview: "sr",
  "ui-review": "ui-r",
  feedback: "f",
};

var APPROVAL_REGEXES = [
  [/^approval-([a-zA-Z]+)([0-9.]+)$/, "a", 1, 2],
  [/^approval([0-9.]+)$/, "a", "platform", 1],
];

function PatchFlag(aRawFlag) {
  this.raw = aRawFlag;

  // requestee doesn't have the real_name.  blech.
  if ("requestee" in this.raw)
    this.requestee = BugPeeps.fromUserJson(this.raw.requestee);
  else
    this.requestee = null;
  this.setter = BugPeeps.fromUserJson(this.raw.setter);
}
PatchFlag.prototype = {
  get status() {
    return this.raw.status;
  },

  /**
   * For patch flag deltas, we want to express that the flag was just entirely
   *  removed.  Invert allows us to express this in a reusable fashion on the
   *  widget, even if it's semantically sketchy.
   */
  get invert() {
    return ("invert" in this.raw) ? this.raw.invert : false;
  },

  get isFeedbackFlag() {
    return this.raw.name in FEEDBACK_FLAG_MAP;
  },

  get feedbackActionRequired() {
    return (this.raw.name in FEEDBACK_FLAG_MAP) &&
           this.raw.status == "?";
  },

  get isApprovalFlag() {
    return this.getApprovalInfo() != null;
  },

  /**
   * @return a tuple of [display prefix, product name, version] if it's an
   *     approval flag, null if it is not an approval flag.
   */
  getApprovalInfo: function Flag_getApprovalInfo() {
    var flagName = this.raw.name;
    for (var iApp = 0; iApp < APPROVAL_REGEXES.length; iApp++) {
      var patInfo = APPROVAL_REGEXES[iApp];
      var match = patInfo[0].exec(flagName);
      if (match) {
        return [
          partInfo[1],
          (typeof(patInfo[2]) == "string") ? patInfo[2] : match[patInfo[2]],
          match[patInfp[3]],
        ];
      }
    }
    return null;
  },

  get approvalActionRequired() {
    return (this.raw.status == "?") && (this.getApprovalInfo() != null);
  },

  get flagDisplay() {
    var flagName = this.raw.name;
    if (flagName in FEEDBACK_FLAG_MAP)
      return FEEDBACK_FLAG_MAP[flagName] + this.raw.status;

    var approvalInfo = this.getApprovalInfo();
    if (approvalInfo)
      return approvalInfo[0] + approvalInfo[2] + this.raw.status;

    // no magic shortening, just pass the flag direct
    return flagName + this.raw.status;
  },

  get who() {
    return this.requestee ? this.requestee.handle : this.setter.handle;
  },

  get flagWhoDisplay() {
    return this.flagDisplay + " " + this.who;
  },
};
