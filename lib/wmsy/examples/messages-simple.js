var wmsy = require("wmsy/wmsy");
var wy = new wmsy.WmsyDomain({id: "messages-simple"});

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
    star: wy.bind("", {starred: "inAddressBook"})
  }),
  style: {
    root: [
      "-moz-border-radius: 4px;",
      "-webkit-border-radius: 4px;",
      "background-color: #ddd;",
      "padding: 0px 2px;",
    ],
    star: {
      '[starred="true"]': [
        "display: inline-block;",
        "width: 12px !important;",
        "height: 12px;",
        "background-image: url('star.png');",
      ]
    }
  }
});

/**
 * General message display widget.
 */
wy.defineWidget({
  name: "message-default",
  constraint: {
    type: "message",
  },
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
  style: {
    root: [
      "-moz-border-radius: 4px;",
      "-webkit-border-radius: 4px;",
      "background-color: #729fcf;",
      "padding: 2px;",
      "margin: 4px 0px;",
    ],
    subject: [
      "font-weight: bold;"
    ],
    bodyBlock: [
      "margin: 2px;",
      "padding: 2px;",
      "-moz-border-radius: 2px;",
      "-webkit-border-radius: 2px;",
      "background-color: #ffffff;",
    ],
    body: [
      "white-space: pre-wrap;",
    ]
  }
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
  structure: wy.flow({
    author: wy.widget({type: "identity"}, "from"),
    body: wy.bind("body"),
  }),
  style: {
    root: [
      "-moz-border-radius: 4px;",
      "-webkit-border-radius: 4px;",
      "background-color: #ad7fa8;",
      "margin: 4px 0px;",
    ],
    body: [
      "margin-left: 4px;",
    ]
  }
});

if (require.main == module) {
  setTimeout(function() {
    console.log("starting to show stuff");
    var emitter = wy.wrapElement(document.getElementById("content"));
    for (var i = 0; i < messages.length; i++) {
      var message = messages[i];
      emitter.emit({type: "message", obj: message});
    }
  }, 10);
}
