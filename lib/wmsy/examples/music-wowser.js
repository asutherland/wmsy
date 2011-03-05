/*****************************BEGIN LICENSE BLOCK *****************************
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

define("wmsy/examples/music-wowser",
  [
    "wmsy/wmsy",
    "text!./music-wowser.css",
    "exports",
  ],
  function(
    $wmsy,
    $_css,
    exports
  ) {

var wy = new $wmsy.WmsyDomain({id: "music-wowser",
                               clickToFocus: true,
                               focusRing: false,
                               css: $_css});

wy.defineIdSpace("album", function(album) {
                   return album.id;
                 });

var uniquer = 0;

function Artist(aName) {
  this.id = uniquer++;
  this.name = aName;
}

function Disc(aArtist, aName, aKind, aYear, aImageUrlBit, aOwningAlbum) {
  this.id = uniquer++;
  this.artist = aArtist;
  this.name = aName;
  this.kind = aKind;
  this.year = aYear;
  this.owningAlbum = aOwningAlbum;

  this.imageUrl = "http://www.petshopboys.co.uk/media/article_images/300/" +
                    aImageUrlBit + ".jpg";

  this.ownedSingles = [];
}
Disc.prototype = {
  addOwnedSingle: function Disc_addOwnedDisc(aDisc) {
    this.ownedSingles.push(aDisc);
  }
};

function metafy(aArtistName, aAlbumMappings) {
  var meta = {};
  var artist = meta.artist = new Artist(aArtistName);
  var albums = meta.albums = [];
  var singles = meta.singles = [];
  for (var kind in aAlbumMappings) {
    var discList = aAlbumMappings[kind];
    for (var iDisc = 0; iDisc < discList.length; iDisc++) {
      var disc = discList[iDisc];
      var albumName = disc[0], albumYear = disc[1], urlBit = disc[2],
          singleDefs = disc[3];

      var album = new Disc(artist, albumName, kind, albumYear, urlBit, null);
      albums.push(album);

      for (var iSingle = 0; iSingle < singleDefs.length; iSingle++) {
        var sdef = singleDefs[iSingle];
        var singleName = sdef[0], singleYear = sdef[1], surlBit = sdef[2];
        var single = new Disc(artist, singleName, "single", singleYear, surlBit,
                              album);
        singles.push(single);
        album.addOwnedSingle(single);
      }
    }
  }
  return meta;
}

var psbMeta = metafy("Pet Shop Boys", {
  album: [
    ["Please", 1986, 1280, [
       ["West End Girls", 1985, 1314],
       ["Love Comes Quickly", 1986, 1316],
       ["Opportunities (Let's Make Lots of Money)", 1986, 1315],
       ["Suburbia", 1986, 1317]
    ]],
    ["Actually", 1987, 1282, [
      ["It's a Sin", 1987, 1318],
      ["What Have I Done To Deserve This?", 1987, 1319],
      ["Rent", 1987, 1320],
      ["Heart", 1988, 1322],
    ]],
    ["Behaviour", 1990, 1285, [
      ["So Hard", 1990, 1326],
      ["Being Boring", 1990, 1327],
      ["Jealousy", 1991, 1329],
    ]],
    ["Very", 1993, 1287, [
      ["Can You Forgive Her?", 1993, 1333],
      ["Go West", 1993, 1334],
      ["I Wouldn't Normally Do This Kind Of Thing", 1993, 1335],
      ["Liberation", 1994, 1336],
      ["Yesterday, When I Was Mad", 1994, 1338],
    ]],
    ["Bilingual", 1996, 1291, [
      ["Before", 1996, 1340],
      ["Se a vida é (That's The Way Life Is)", 1996, 1341],
      ["Single-Bilingual", 1996, 1342],
      ["A Red Letter Day", 1997, 1343],
      ["Somewhere", 1997, 1344],
    ]],
    ["Nightlife", 1999, 1295, [
      ["I Don't Know What You Want But I Can't Give It Any More", 1999, 1345],
      ["New York City Boy",1999, 1346],
      ["You Only Tell Me You Love Me When You're Drunk", 2000, 1347],
    ]],
    ["Release", 2002, 1302, [
      ["Home And Dry", 2002, 1348],
      ["I Get Along", 2002, 1349],
      ["London", 2003, 1350],
    ]],
    ["Fundamental", 2006, 1305, [
      ["I'm With Stupid", 2006, 1353],
      ["Minimal", 2006, 1354],
      ["Numb", 2006, 1355],
      ["Integral", 2007, 1357],
    ]],
    ["Yes", 2009, 1311, [
      ["Love, etc.", 2009, 1358],
      ["Did You See Me Coming?", 2009, 1359],
      ["Beautiful People", 2009, 2123],
    ]],
  ],
  "album.ep": [
    ["Introspective", 1988, 1283, [
      ["Always On My Mind", 1987, 1321],
      ["Domino Dancing", 1988, 1323],
      ["Left To My Own Devices", 1988, 1324],
      ["It's Alright", 1988, 1325],
    ]],
  ],
});


////////////////////////////////////////////////////////////////////////////////
//// Root UI

wy.defineWidget({
  name: "wowser-root-ui",
  doc: "The top-level UI",
  focus: wy.focus.domain.vertical("artists", "playcontrol"),
  constraint: {
    type: "root",
  },
  relay: ["enqueue"],
  structure: {
    artists: wy.vertList({type: "artist-meta"}, "artists"),
    playcontrol: wy.widget({type: "play-control"}, "playcontrol"),
  },
});

////////////////////////////////////////////////////////////////////////////////
//// Play Control

wy.defineWidget({
  name: "play-control",
  doc: "Play control interface; currently just a faux queue",
  focus: wy.focus.container.horizontal("queued"),
  constraint: {
    type: "play-control",
  },
  structure: {
    queueLabel: "Queue",
    queued: wy.horizList({type: "album"}, "queue"),
    buttons: {
      clearQueue: wy.button("Clear"),
    },
  },
  receive: {
    enqueue: function(album) {
      this.ANTICS.prepare("album");
      this.queued_slice.mutateSplice(0, 0, album);
      this.ANTICS.go("album");
    },
  },
  events: {
    clearQueue: {
      command: function() {
        this.ANTICS.prepare("album");
        this.queued_slice.mutateSplice(0);
        this.ANTICS.go("album");
      }
    },
  },
});

////////////////////////////////////////////////////////////////////////////////
//// Artist

wy.defineWidget({
  name: "artist-detail-view",
  doc: "Show an artist's albums with singles grouped by owning album.",
  constraint: {
    type: "artist-meta",
  },
  focus: wy.focus.container.vertical("albums", "singles"),
  bus: ["albumSelected"],
  structure: {
    artistLabel: wy.bind(["artist", "name"]),
    albums: wy.subWidget({subpart: "album-list"}),
    singles: wy.subWidget({subpart: "singles-list"}),
  },
});

wy.defineWidget({
  name: "artist:album-list",
  doc: "List of albums by an artist.",
  constraint: {
    type: "artist-meta",
    subpart: "album-list",
  },
  focus: wy.focus.container.horizontal("albums"),
  structure: {
    albums: wy.horizList({type: "album"}, "albums"),
  },
  emit: ["albumSelected"],
  events: {
    albums: {
      command: function(aAlbumWidget) {
        console.log("clicked on " + aAlbumWidget + "\n");
        console.log(" == album: " + aAlbumWidget.obj.name + "\n");
        //this.emit_albumSelected(aAlbumWidget.obj);
      }
    }
  },
});

wy.defineWidget({
  name: "artist:singles-list",
  doc: "List of singles by an artist, grouped by their owning album.",
  constraint: {
    type: "artist-meta",
    subpart: "singles-list",
  },
  focus: wy.focus.container.horizontal("albumGroups"),
  structure: {
    albumGroups: wy.horizList({type: "album-collection", attr: "ownedSingles"},
                               "albums"),
  },
  receive: {
    albumSelected: function(aAlbum) {
      // focus the group
    }
  },
});

////////////////////////////////////////////////////////////////////////////////
//// Album Groups

wy.defineWidget({
  name: "album-group",
  doc: "Group of albums from a parameterized attribute.",
  constraint: {
    type: "album-collection",
    attr: wy.WILD,
  },
  focus: wy.focus.container.horizontal("albums"),
  structure: {
    albums: wy.horizList({type: "album"}, wy.fromConstraint("attr")),
  },
});

////////////////////////////////////////////////////////////////////////////////
//// Albums

wy.defineWidget({
  name: "album-overview-medium",
  doc: "Album as cover art and title.",
  constraint: {
    type: "album",
  },
  focus: wy.focus.item,
  idspaces: ["album"],
  structure: {
    cover: wy.bindImage("imageUrl"),
    albumTitle: wy.bind("name"),
  },
  emit: ["enqueue"],
  events: {
    root: {
      command: function root_command(binding, event, justFocused) {
        // if we were already focused when the click happened, enqueue ourselves.
        if (!justFocused)
          this.emit_enqueue(this.obj);
      }
    },
  },
});

exports.main = function() {
  console.log("starting to show stuff");
  var emitter = wy.wrapElement(document.getElementById("content"));
  var rootObj = {
    artists: [psbMeta],
    playcontrol: {
      queue: [],
    },
  };
  emitter.emit({type: "root", obj: rootObj});
};

}); // end define
