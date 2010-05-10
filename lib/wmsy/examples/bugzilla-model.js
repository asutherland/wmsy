/*
 *
 */

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
  return TRIM_REGEX.replace(aStr, "");
}

function BugPerson(aEmail) {
  this.email = this.name = this.handle = aEmail;
  this.raw = null;
}
BugPerson.prototype = {
  _chewRaw: function BugPerson__chewRaw(aRawUser) {
    this.raw = aRawUser;

    var name = this.raw.real_name;
    var nick = null;
    // if there are parens, try and find the nick in there first...
    var idxFirstParen = name.indexOf("("), idxColon, idxNickStop;
    if (idxFirstParen >= 0) {
      var parenBits = unwrapStr(name.substring(idxFirstParen));
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
    this.handle = nick;
  }
};

/**
 * Clearing-house for user information processing / extraction / transformation.
 */
var BugPeeps = {
  _emailToPerson: {},

  /**
   * Convert an e-mail address to a BugPerson; suitable for flag requestee
   *  enrichment.
   */
  fromEmail: function BugPeeps_fromEmail(aEmail) {
    if (aEmail in this._emailToPerson)
      return this._emailToPerson[aEmail];

    var person = new BugPerson(aEmail);
  },

  /**
   * Convert a BZ REST API User structure into a BugPerson.
   */
  fromUserJson: function BugPeeps_fromUser(aUser) {
    var person = this.fromEmail(aUser.name);

    if (!person.raw)
      person._chewRaw(aUser);

    return person;
  },
};

function Bug(aRawBug) {
  this.raw = aRawBug;

  this.activePatches = [];
  this.mootedPatches = [];
  this.activeAttachments = [];
  this.mootedAttachments = [];
}
Bug.prototype = {
  _chewAttachments: function Bug__chewAttachments(aRawAttachments) {
    for (var iAtt = 0; iAtt < aRawAttachments.length; iAtt++) {
      var rawAtt = aRawAttachments[iAtt];

      var targetList = rawAtt.is_patch ?
                         (rawAtt.is_obsolete ? this.mootedPatches
                                             : this.activePatches) :
                         (rawAtt.is_obsolete ? this.mootedAttachments
                                             : this.activeAttachments);
      targetList.append(new Attachment(rawAtt));
    }
  }
};
exports.Bug = Bug;

function Attachment(aRawAtt) {
  this.raw = aRawAtt;

  this.flags = [];
}
Attachment.prototype = {
  _chewFlags: function Attachment__chewFlags(aRawFlags) {
    for (var iFlag = 0; iFlag < aRawFlags.length; iFlag++) {
      var rawFlag = aRawFlags[iFlag];
      flags.push(new PatchFlag(rawFlag));
    }
  }
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


}
PatchFlag.prototype = {
  get status() {
    return this.raw.status;
  },

  get isFeedbackFlag() {
    return this.raw.flag.name in FEEDBACK_FLAG_MAP;
  },

  get feedbackActionRequired() {
    return (this.raw.flag.name in FEEDBACK_FLAG_MAP) &&
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
    var flagName = this.raw.flag.name;
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

  get displayString() {

  }
};
