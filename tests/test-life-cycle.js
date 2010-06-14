/**
 * Test life-cycle issues; primarily that widgets get told about their
 *  destruction appropriately (so that they can un-register listeners,
 *  primarily.)
 */

var Pages = require("page-worker");

var wmsy = require("wmsy/wmsy");


/**
 * Test that destroy properly happens for children at top-level destruction as
 *  well as when an update (or explicit _set) causes the underlying binding for
 *  a widget to change.  We also end up checking the widget _set logic pretty
 *  well in the process in terms of rebinding/update()ing...
 */
exports.testWidgetCycle = function testWidgetCycle(test) {
  var wy = new wmsy.WmsyDomain({id: "life-widget", domain: "life-widget"});

  wy.defineWidget({
    name: "parent",
    constraint: {
      type: "root",
    },
    structure: {
      a: wy.widget({type: "child"}, "a"),
      b: wy.widget({type: "child"}, "b"),
    },
    impl: {
      postInit: function() {
        this.obj.updateCount = 0;
      },
      update: function() {
        this._update();
        this.obj.updateCount++;
      },
      destroy: function() {
        this._destroy();
        this.obj.destroyed++;
      }
    }
  });

  wy.defineWidget({
    name: "child1",
    constraint: {
      type: "child",
      obj: {kind: "inner"},
    },
    structure: {
      z: wy.widget({type: "child"}, "z"),
    },
    impl: {
      postInit: function() {
        this.obj.updateCount = 0;
      },
      update: function() {
        this._update();
        this.obj.updateCount++;
      },
      destroy: function() {
        this._destroy();
        this.obj.destroyified++;
      }
    }
  });

  wy.defineWidget({
    name: "child2",
    constraint: {
      type: "child",
      obj: {kind: "leaf"},
    },
    structure: {},
    impl: {
      postInit: function() {
        this.obj.updateCount = 0;
      },
      update: function() {
        this._update();
        this.obj.updateCount++;
      },
      destroy: function() {
        this._destroy();
        this.obj.destroyeded++;
      }
    }
  });

  var rootObj = {
    destroyed: 0,
    updateCount: 0,
    a: {
      kind: "inner",
      destroyified: 0, // inner
      destroyeded: 0, // leaf
      updateCount: 0,
      z: {
        kind: "leaf",
        destroyeded: 0,
        updateCount: 0,
      },
    },
    b: {
      kind: "leaf",
      destroyeded: 0,
      updateCount: 0,
    }
  };

  test.waitUntilDone();

  var page = Pages.add(Pages.Page({
    onReady: check,
    content: "<div id='root'></div>",
  }));

  function check() {
    var emitter = wy.wrapElement(page.document.getElementById("root"));

    // - bind and paranoia check
    var binding = emitter.emit({type: "root", obj: rootObj});
    test.assertEqual(rootObj.destroyed, 0, "root");
    test.assertEqual(rootObj.a.destroyified, 0, "a (inner)");
    test.assertEqual(rootObj.a.destroyeded, 0, "a (leaf)");
    test.assertEqual(rootObj.a.z.destroyeded, 0, "a.z");
    test.assertEqual(rootObj.b.destroyeded, 0, "b");

    test.assertEqual(rootObj.updateCount, 0, "root up");
    test.assertEqual(rootObj.a.updateCount, 0, "a up");
    test.assertEqual(rootObj.a.z.updateCount, 0, "a.z up");
    test.assertEqual(rootObj.b.updateCount, 0, "b up");

    // - mutate then update() making sure only expected destruction occurred...
    rootObj.a.kind = "leaf";
    binding.update();
    test.assertEqual(rootObj.destroyed, 0, "root [a kind change]");
    test.assertEqual(rootObj.a.destroyified, 1, "a (inner) [a kind change]");
    test.assertEqual(rootObj.a.destroyeded, 0, "a (leaf) [a kind change]");
    test.assertEqual(rootObj.a.z.destroyeded, 1, "a.z [a kind change]");
    test.assertEqual(rootObj.b.destroyeded, 0, "b [a kind change]");

    test.assertEqual(rootObj.updateCount, 1, "root up [a kind change]");
    test.assertEqual(rootObj.a.updateCount, 0, "a up [a kind change]");
    test.assertEqual(rootObj.a.z.updateCount, 0, "a.z up [a kind change]");
    test.assertEqual(rootObj.b.updateCount, 1, "b up [a kind change]");

    // - change nothing, call update(), no extra destructions, more updates
    binding.update();
    test.assertEqual(rootObj.destroyed, 0, "root [inert update]");
    test.assertEqual(rootObj.a.destroyified, 1, "a (inner) [inert update]");
    test.assertEqual(rootObj.a.destroyeded, 0, "a (leaf) [inert update]");
    test.assertEqual(rootObj.a.z.destroyeded, 1, "a.z [inert update]");
    test.assertEqual(rootObj.b.destroyeded, 0, "b [inert update]");

    test.assertEqual(rootObj.updateCount, 2, "root up [inert update]");
    test.assertEqual(rootObj.a.updateCount, 1, "a up [inert update]");
    // a.z is dead, should not get updated! stays 0.
    test.assertEqual(rootObj.a.z.updateCount, 0, "a.z up [inert update]");
    test.assertEqual(rootObj.b.updateCount, 2, "b up [inert update]");

    // - remove the binding entirely; everyone gets torn down
    emitter.remove(binding);
    test.assertEqual(rootObj.destroyed, 1, "root death");
    test.assertEqual(rootObj.a.destroyified, 1, "a (inner) death");
    test.assertEqual(rootObj.a.destroyeded, 1, "a (leaf) death");
    test.assertEqual(rootObj.a.z.destroyeded, 1, "a.z death");
    test.assertEqual(rootObj.b.destroyeded, 1, "b death");

    test.done();
  }
};

exports.testWidgetListCycle = function testWidgetListCycle(test) {
  var wy = new wmsy.WmsyDomain({id: "life-wlist", domain: "life-wlist"});

  wy.defineWidget({
    name: "list-holder",
    constraint: {
      type: "root",
    },
    structure: {
      foo: wy.widgetList({type: "list-item"}, "foo"),
    }
  });
  wy.defineWidget({
    name: "list-item",
    constraint: {
      type: "list-item",
    },
    structure: wy.bind("id"),
    impl: {
      preInit: function() {
        this.obj.liveness++;
      },
      destroy: function() {
        this._destroy();
        this.obj.liveness--;
      }
    }
  });

  var objs = {
    a: {id: "a", liveness: 0},
    b: {id: "b", liveness: 0},
    c: {id: "c", liveness: 0},
    d: {id: "d", liveness: 0},
  };

  var rootObj = {
    foo: [objs.a],
  };

  test.waitUntilDone();

  var page = Pages.add(Pages.Page({
    onReady: check,
    content: "<div id='root'></div>",
  }));

  function check() {
    var emitter = wy.wrapElement(page.document.getElementById("root"));

    // - bind and paranoia check
    var binding = emitter.emit({type: "root", obj: rootObj});
    test.assertEqual(objs.a.liveness, 1, "a initial");

    // - explicit add b,c,d
    rootObj.foo.push(objs.b, objs.c, objs.d); // does not affect widget...
    binding.foo_addAll([objs.b, objs.c, objs.d]);
    test.assertEqual(objs.a.liveness, 1, "a maintain");
    test.assertEqual(objs.b.liveness, 1, "b added");
    test.assertEqual(objs.c.liveness, 1, "c added");
    test.assertEqual(objs.d.liveness, 1, "d added");

    // - explicit remove a,c
    rootObj.foo.splice(2, 1);
    rootObj.foo.splice(0, 1);
    binding.foo_removeAll([objs.a, objs.c]);
    test.assertEqual(objs.a.liveness, 0, "a removed");
    test.assertEqual(objs.b.liveness, 1, "b maintained");
    test.assertEqual(objs.c.liveness, 0, "c removed");
    test.assertEqual(objs.d.liveness, 1, "d maintained");

    // - explicit clear remainder (b, d)
    rootObj.foo = [];
    binding.foo_clear();
    test.assertEqual(objs.a.liveness, 0, "a still dead");
    test.assertEqual(objs.b.liveness, 0, "b cleared");
    test.assertEqual(objs.c.liveness, 0, "c still dead");
    test.assertEqual(objs.d.liveness, 0, "d clearedd");

    // - update() nets an add
    rootObj.foo = [objs.c, objs.d];
    binding.update();
    test.assertEqual(objs.a.liveness, 0, "a still dead");
    test.assertEqual(objs.b.liveness, 0, "b still dead");
    test.assertEqual(objs.c.liveness, 1, "c updated in");
    test.assertEqual(objs.d.liveness, 1, "d updated in");

    // - update() nets a clear and an add
    rootObj.foo = [objs.a];
    binding.update();
    test.assertEqual(objs.a.liveness, 1, "a updated in");
    test.assertEqual(objs.b.liveness, 0, "b still dead");
    test.assertEqual(objs.c.liveness, 0, "c updated cleared");
    test.assertEqual(objs.d.liveness, 0, "d updated cleared");

    test.done();
  }
};
