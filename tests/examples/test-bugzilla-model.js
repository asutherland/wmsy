var bzm = require("wmsy/examples/bugzilla-model");

var assert = require("assert");

exports.testNameParsing = function testNameParsing() {
  var bienvenu = bzm.BugPeeps.fromUserJson({
    id: 1,
    name: "bienvenu@example.com",
    real_name: "David :Bienvenu",
    ref: "http://blah.blah/"
  });
  assert.equal(bienvenu.email, "bienvenu@example.com");
  assert.equal(bienvenu.name, "David Bienvenu");
  assert.equal(bienvenu.handle, "Bienvenu");

  var asuth = bzm.BugPeeps.fromUserJson({
    id: 2,
    name: "asuth@example.com",
    real_name: "Andrew Sutherland (:asuth)",
    ref: "http://blah.blah/"
  });
  assert.equal(asuth.email, "asuth@example.com");
  assert.equal(asuth.name, "Andrew Sutherland");
  assert.equal(asuth.handle, "asuth");

  var ludo = bzm.BugPeeps.fromUserJson({
    id: 100,
    name: "ludo@example.com",
    real_name: "Ludo [:_Tsk_ ] (away until May 16th)",
    ref: "http://blah.blah/"
  });
  assert.equal(ludo.email, "ludo@example.com");
  assert.equal(ludo.name, "Ludo");
  assert.equal(ludo.handle, "_Tsk_");

  // we can stop checking email addresses now...

  var vacay = bzm.BugPeeps.fromUserJson({
    id: 3,
    name: "vacay1@example.com",
    real_name: "Baron von Vacation (:vacay1) (On vacation until March 7th)",
    ref: "http://blah.blah/"
  });
  assert.equal(vacay.name, "Baron von Vacation");
  assert.equal(vacay.handle, "vacay1");

  vacay = bzm.BugPeeps.fromUserJson({
    id: 4,
    name: "vacay2@example.com",
    real_name: "Baron von Vacation (:vacay2 on vacation until March 7th)",
    ref: "http://blah.blah/"
  });
  assert.equal(vacay.name, "Baron von Vacation");
  assert.equal(vacay.handle, "vacay2");

  vacay = bzm.BugPeeps.fromUserJson({
    id: 5,
    name: "vacay3@example.com",
    real_name: "Baron von Vacation (:vacay3) [on vacation until March 7th]",
    ref: "http://blah.blah/"
  });
  assert.equal(vacay.name, "Baron von Vacation");
  assert.equal(vacay.handle, "vacay3");

  var nonick = bzm.BugPeeps.fromUserJson({
    id: 6,
    name: "nonick1@example.com",
    real_name: "Non Nicknamed",
    ref: "http://blah.blah/"
  });
  assert.equal(nonick.name, "Non Nicknamed");
  assert.equal(nonick.handle, "Non Nicknamed");

  nonick = bzm.BugPeeps.fromUserJson({
    id: 7,
    name: "nonick2@example.com",
    real_name: "Non Nicknamed (unavailable 'til June 2020)",
    ref: "http://blah.blah/"
  });
  assert.equal(nonick.name, "Non Nicknamed");
  assert.equal(nonick.handle, "Non Nicknamed");

  var noreal = bzm.BugPeeps.fromUserJson({
    id: 8,
    name: "noreal@example.com",
    ref: "http://blah.blah/"
  });
  assert.equal(noreal.name, "noreal@example.com");
  assert.equal(noreal.handle, "noreal@example.com");
};

if (require.main == module)
  require("os").exit(require("test").run(exports));
