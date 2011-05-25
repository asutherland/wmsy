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
* Portions created by the Initial Developer are Copyright (C) 2009 the Initial
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

define("wmsy/examples/messages-simple",
  [
    "wmsy/wmsy",
    "text!./messages-simple.css",
    "exports"
  ],
  function(
    wmsy,
    $_css,
    exports
  ) {

var wy = new wmsy.WmsyDomain({id: "messages-simple",
                              domain: "messages-simple",
                              css: $_css});

function Identity(aName, aEmail, aInAddressBook) {
  this.name = aName;
  this.email = aEmail;
  this.inAddressBook = aInAddressBook;
}

function EmailMessage(aFrom, aTo, aSubject, aBody) {
  this.from = aFrom;
  this.to = aTo;
  this.subject = aSubject;
  this.body = aBody;
}
EmailMessage.prototype = {
  messageType: "rfc822",
};

function Tweet(aFrom, aBody, aDirectedTo) {
  this.from = aFrom;
  this.to = [];
  this.body = aBody;
  this.directedTo = aDirectedTo;
}
Tweet.prototype = {
  messageType: "tweet",
};

var alice = new Identity("Alice", "alice@example.com", true);
var bob = new Identity("Bob", "bob@example.com", false);
var chuck = new Identity("Charles Carmichael", "chuck@example.com", false);
var userIdentity = new Identity("You!", "you@example.com", true);

var messages = [
  new EmailMessage(bob, [alice, chuck], "What's the word?",
                   "My dear compatriots, how are you doing? \
I write you from outer space. \
It is nice here."),
  new Tweet(bob, "I just sent an email!"),
  // for the directed, we're pretending we processed a "@bob" and removed it
  new Tweet(alice, "yes, yes you did.", bob),
];

/**
 * General identity representation.
 */
wy.defineWidget({
  name: "identity-default",
  constraint: {
    type: "identity",
  },
  structure: wy.flow({
    name: wy.bind("name"),
    star: wy.bind(wy.NONE, {starred: "inAddressBook"})
  }),
});

/**
 * General message display widget.
 */
wy.defineWidget({
  name: "message-default",
  constraint: {
    type: "message",
  },
  focus: wy.focus.item,
  structure: {
    fromBlock: wy.flow({
      from: wy.widget({type: "identity"}, "from"),
      saysLabel: " says ",
      subject: wy.bind("subject"),
    }),
    toBlock: wy.flow({
      toLabel: "to: ",
      to: wy.widgetFlow({type: "identity"}, "to", {separator: ", "}),
    }),
    bodyBlock: {
      body: wy.bind("body")
    }
  },
});

/**
 * Tweet-specialized display.
 */
wy.defineWidget({
  name: "message-tweet",
  constraint: {
    type: "message",
    obj: {
      messageType: "tweet"
    }
  },
  focus: wy.focus.item,
  structure: wy.flow({
    author: wy.widget({type: "identity"}, "from"),
    body: wy.bind("body"),
  }),
});

wy.defineWidget({
  name: "compose",
  doc: "Verrrry simple composition widget",
  constraint: {
    type: "compose",
  },
  focus: wy.focus.container.horizontal("contents", "send", "addFooter"),
  emit: ["addMessage"],
  structure: {
    contents: wy.text(wy.NONE, null, {placeholder: "Enter your message..."}),
    send: wy.button("Send"),
    addFooter: wy.checkbox("Add signature", "addSignature"),
  },
  impl: {
  },
  events: {
    root: {
      command: function() {
        // do not send empty messages
        if (this.contents_element.value == "")
          return;

        var body = this.contents_element.value;
        if (this.obj.addSignature)
          body += " -- Sent from my wmsy.";

        this.emit_addMessage(new Tweet(userIdentity, body));
        this.contents_element.value = "";
      }
    },
    addFooter: {
      command: function() {
        this.obj.addSignature = this.addFooter_element.checked;
      }
    },
  },
});

wy.defineWidget({
  name: "root",
  doc: "Root display widget; everything hangs off this.",
  focus: wy.focus.domain.vertical("messages", "compose"),
  constraint: {
    type: "root",
  },
  structure: {
    messages: wy.vertList({type: "message"}, "messages"),
    compose: wy.subWidget({type: "compose"}),
  },
  receive: {
    addMessage: function(message) {
      this.obj.messages.push(message);
      this.update();
      this.FOCUS.updateFocusRing();
    }
  }
});

exports.main = function main(baseRelPath, doc) {
  // need to know where to find our star!
  wy.setPackageBaseRelPath(baseRelPath);

  console.log("starting to show stuff");
  var emitter = wy.wrapElement(doc.getElementById("content"));

  var rootObj = {
    messages: messages,
    addSignature: false,
  };

  emitter.emit({type: "root", obj: rootObj});
};

}); // end define
