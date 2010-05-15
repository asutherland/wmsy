var wmsy = require("wmsy/wmsy");
var wy = new wmsy.WmsyDomain({id: "music-wowser"});

function Artist(aName) {
  this.name = aName;
}

function Disc(aArtist, aName, aKind, aYear, aImageUrlBit, aOwningAlbum) {
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
//// Artist

wy.defineWidget({
  name: "artist-detail-view",
  doc: "Show an artist's albums with singles grouped by owning album.",
  constraint: {
    type: "artist-meta",
  },
  focus: wy.focus.container.vertical,
  bus: ["albumSelected"],
  structure: {
    artistLabel: wy.bind(["artist", "name"]),
    albums: wy.subWidget({subpart: "album-list"}),
    singles: wy.subWidget({subpart: "singles-list"}),
  },
  style: {
    artistLabel: [
      "font-size: 200%;"],
  }
});

wy.defineWidget({
  name: "artist:album-list",
  doc: "List of albums by an artist.",
  constraint: {
    type: "artist-meta",
    subpart: "album-list",
  },
  focus: wy.focus.container.horizontal,
  structure: {
    albums: wy.widgetList({type: "album"}, "albums"),
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
  }
});

wy.defineWidget({
  name: "artist:singles-list",
  doc: "List of singles by an artist, grouped by their owning album.",
  constraint: {
    type: "artist-meta",
    subpart: "singles-list",
  },
  focus: wy.focus.container.horizontal,
  structure: {
    albumGroups: wy.widgetList({type: "album-collection", attr: "ownedSingles"},
                               "albums"),
  },
  handle: {
    albumSelected: function(aAlbum) {
      // focus the group
    }
  }
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
  focus: wy.focus.container.horizontal,
  structure: {
    albums: wy.widgetList({type: "album"}, wy.fromConstraint("attr")),
  },
  style: {
    root: {
      _: [
        "display: inline-block;",
        "padding: 2px;",
        "border: 1px solid #fff;",
        "background-color: #bbb;"],
      '[active="true"]': [
        "background-color: #fff;",
        "border: 1px solid #000;"],
    }
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
  structure: {
    cover: wy.bindImage("imageUrl"),
    albumTitle: wy.bind("name"),
  },
  style: {
    root: {
      _: [
        "display: inline-block;",
        "padding: 4px;"],
      ':focused': [
        "background-color: #88c;"],
      },
    cover: [
      "display: block;",
      "image-rendering: optimizeQuality;",
      "width: 60px;",
      "height: 60px;",
      "background-color: #c88;"],
    albumTitle: [
      "display: none;",
      "text-align: center;"],
  }
});

if (require.main == module) {
  setTimeout(function() {
    console.log("starting to show stuff");
    var emitter = wy.wrapElement(document.getElementById("content"));
    emitter.emit({type: "artist-meta", obj: psbMeta});
  }, 10);
}