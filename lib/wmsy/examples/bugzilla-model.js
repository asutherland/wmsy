/**
 * Pre-database bugzilla and related metadata representation.  This will ideally
 *  inform a gloda(ng) style implementation.
 */

var dateFromISO8601 = require("wmsy/examples/date-utils").dateFromISO8601;

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
  role: {
    dev: {
      label: "Dev",
      desc: "developer",
    },
    driver: {
      label: "Driver",
      desc: "release driver/triager",
    },
    qa: {
      label: "QA",
      desc: "QA"
    },
    pro: {
      label: "Pro",
      desc: "Expert User"
    },
    user: {
      label: "User",
      desc: "Non-expert User",
      default: true,
    },
    sad: {
      label: ":(",
      desc: "Non-helpful contributions"
    }
  },

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
  }
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
      for (var valName in tagGroup) {
        var meta = tagGroup[valName];
        if (("default" in meta) && (meta.default))
          this.defaultTags[groupName] = valName;
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

  this.id = parseInt(this.raw.id);

  this.activePatches = [];
  this.mootedPatches = [];
  this.activeAttachments = [];
  this.mootedAttachments = [];

  this.events = [];

  this._chewAttachments(this.raw.attachments);
  this._chewCommentsAndChanges(this.raw.comments, this.raw.changes);

  this.assignee = BugPeeps.fromUserJson(this.raw.assigned_to);
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
      targetList.push(new Attachment(rawAtt));
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
      nextComment = aRawComments[iCommment];
      tsComment = dateFromISO8601(nextComment.creation_time);
    }
    if (aChangeSets.length) {
      nextChangeSet = aChangeSets[iChangeSet];
      tsChangeSet = dateFromISO8601(nextChangeSet.change_time);
    }

    /**
     * Create a new event using the given mixture and updating all state
     *  variables as appropriate.
     */
    function pushIt(useComment, useChangeSet) {
      events.push(new BugEvent(useComment ? nextComment : null,
                               useChangeSet ? nextChangeSet : null));
      if (useComment) {
        if (++iComment < aRawComments.length) {
          nextComment = aRawComments[iCommment];
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
        if (tsComment == tsChangeSet)
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
  get summary() {
    return this.raw.summary;
  },
};
exports.Bug = Bug;

/**
 * The fusion of comments and history changesets.
 */
function BugEvent(aRawComment, aRawChangeSet) {

}
BugEvent.prototype = {
  /**
   * cc changes without comments are boring.
   */
  get isBoring() {

  }
};

function Attachment(aRawAtt) {
  this.raw = aRawAtt;

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
