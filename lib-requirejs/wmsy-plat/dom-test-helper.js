/*
 * The contents of this file are pretty much just modified functions from:
 * mozilla-central/source/testing/mochitest/tests/SimpleTest/EventUtils.js
 *
 * Some of them are by way of jetpack, which might have taken things from
 *  mozmill.
 *
 * Minor deviations are to allow us to directly specify DOM nodes rather than
 *  require use of ids.
 *
 * The major deviations are really in attempting to generate scroll-wheel
 *  events.  You can see the wreckage down at the bottom.
 */

define("wmsy-plat/dom-test-helper",
  [
    "wmsy/platfo",
    "exports"
  ],
  function(
    $platfo,
    exports
  ) {

var platform = $platfo.platform;

function makeKeyEvent(doc, aKind, aCharCode, aKeyCode, aHasShift) {
  var win = doc.defaultView;
  var event;
  if (platform === "moz") {
    // gecko
    event = doc.createEvent("KeyEvents");
    event.initKeyEvent(aKind, true, true, win,
                       false, false, aHasShift, false,
                       aKeyCode, aCharCode);
  }
  else {
    // webkit
    event = doc.createEvent("Events");
    event.initEvent(aKind, true, true);
    event.keyCode = aKeyCode;
    event.charCode = aCharCode;
    event.altKey = false;
    event.ctrlKey = false;
    event.shiftKey = aHasShift;
  }
  return event;
}

/**
 * Actually perform event dispatch given a charCode, keyCode, and boolean for
 * whether "shift" was pressed.  Send the event to the node with id aTarget.  If
 * aTarget is not provided, use "target".
 *
 * Returns true if the keypress event was accepted (no calls to preventDefault
 * or anything like that), false otherwise.
 */
function sendKeyEvent(aTarget, aCharCode, aKeyCode, aHasShift) {
  var doc = aTarget.ownerDocument;
  var win = doc.defaultView;

  var event = makeKeyEvent(doc, "keydown", 0, aKeyCode, aHasShift);
  var accepted = aTarget.dispatchEvent(event);

  // Preventing the default keydown action also prevents the default
  // keypress action.
  if (aCharCode) {
    event = makeKeyEvent(doc, "keypress", aCharCode, 0, aHasShift);
  } else {
    event = makeKeyEvent(doc, "keypress", 0, aKeyCode, aHasShift);
  }
  if (!accepted) {
    event.preventDefault();
  }
  accepted = aTarget.dispatchEvent(event);

  // Always send keyup
  event = makeKeyEvent(doc, "keyup", 0, aKeyCode, aHasShift);
  aTarget.dispatchEvent(event);
  return accepted;
}
exports.sendKeyEvent = sendKeyEvent;


/**
 * Send a mouse event to the node with id aTarget. The "event" passed in to
 * aEvent is just a JavaScript object with the properties set that the real
 * mouse event object should have. This includes the type of the mouse event.
 * E.g. to send an click event to the node with id 'node' you might do this:
 *
 * sendMouseEvent({type:'click'}, 'node');
 */
var sendMouseEvent = exports.sendMouseEvent =
    function sendMouseEvent(aEvent, aTarget, aWindow) {
  if (['click', 'mousedown', 'mouseup', 'mouseover', 'mouseout']
        .indexOf(aEvent.type) == -1) {
    throw new Error("sendMouseEvent doesn't know about event type '"+aEvent.type+"'");
  }

  // For events to trigger the UA's default actions they need to be "trusted"
  //aWindow.netscape.security.PrivilegeManager.enablePrivilege('UniversalBrowserWrite');

  var event = aWindow.document.createEvent('MouseEvent');

  var typeArg          = aEvent.type;
  var canBubbleArg     = true;
  var cancelableArg    = true;
  var viewArg          = aWindow;
  var detailArg        = aEvent.detail        ||
                           (aEvent.type == 'click'     ||
                            aEvent.type == 'mousedown' ||
                            aEvent.type == 'mouseup' ? 1 : 0);
  var screenXArg       = aEvent.screenX       || 0;
  var screenYArg       = aEvent.screenY       || 0;
  var clientXArg       = aEvent.clientX       || 0;
  var clientYArg       = aEvent.clientY       || 0;
  var ctrlKeyArg       = aEvent.ctrlKey       || false;
  var altKeyArg        = aEvent.altKey        || false;
  var shiftKeyArg      = aEvent.shiftKey      || false;
  var metaKeyArg       = aEvent.metaKey       || false;
  var buttonArg        = aEvent.button        || 0;
  var relatedTargetArg = aEvent.relatedTarget || null;

  event.initMouseEvent(typeArg, canBubbleArg, cancelableArg, viewArg, detailArg,
                       screenXArg, screenYArg, clientXArg, clientYArg,
                       ctrlKeyArg, altKeyArg, shiftKeyArg, metaKeyArg,
                       buttonArg, relatedTargetArg);
  // XXX modification to support not targeting by id
  var target;
  if (aTarget) {
    if (typeof(aTarget) == "string")
      target = aWindow.document.getElementById(aTarget);
    else
      target = aTarget;
  }
  else {
    target = aWindow.document;
  }
  target.dispatchEvent(event);
};

// based on sendMouseEvent from above
var sendWheelEvent = exports.sendWheelEvent =
    function sendWheelEvent(aEvent, aDomNode) {
  var event = aDomNode.ownerDocument.createEvent("WheelEvent");

  var typeArg          = aEvent.type || "wheel";
  var canBubbleArg     = true;
  var cancelableArg    = true;
  var viewArg          = aWindow;
  var detailArg        = aEvent.detail        ||
                           (aEvent.type == 'click'     ||
                            aEvent.type == 'mousedown' ||
                            aEvent.type == 'mouseup' ? 1 : 0);
  var screenXArg       = aEvent.screenX       || 0;
  var screenYArg       = aEvent.screenY       || 0;
  var clientXArg       = aEvent.clientX       || 0;
  var clientYArg       = aEvent.clientY       || 0;
  var buttonArg        = aEvent.button        || 1; // middle-button...?
  var relatedTargetArg = aEvent.relatedTarget || null;
  var modifiersListArg = aEvent.modifiersList || ""; // like "Control Alt"
  var deltaXArg        = aEvent.deltaX        || 0;
  var deltaYArg        = aEvent.deltaY        || 0;
  var deltaZArg        = aEvent.deltaZ        || 0;
  // 0: pixel, 1: line, 2: page
  var deltaModeArg     = aEvent.deltaMode     || 0; // pixel

  event.initWheelEvent(typeArg, canBubbleArg, cancelableArg, viewArg, detailArg,
                       screenXArg, screenYArg, clientXArg, clientYArg,
                       buttonArg, relatedTargetArg, modifiersListArg,
                       deltaXArg, deltaYArg, deltaZArg, deltaModeArg);


  aDomNode.dispatchEvent(event);
};

function fakeWheelEvent(aEvent, aTarget) {
  var event = aTarget.ownerDocument.createEvent("MouseEvents");
  event.initMouseEvent("DOMMouseScroll", true, true,
                       aTarget.ownerDocument.defaultView, aEvent.deltaY / -40,
                       1, 0, 0, 0,
                       false, false, false, false,
                       0, null);
  aTarget.dispatchEvent(event);
}

var wheelScrollUp = exports.wheelScrollUp =
    function wheelScrollUp(aDomNode, aPix) {
  if (aPix == null)
    aPix = 120;
  //sendWheelEvent({deltaY: aPix}, aDomNode);
  fakeWheelEvent({deltaY: aPix}, aDomNode);
};

var wheelScrollDown = exports.wheelScrollDown =
    function wheelScrollDown(aDomNode, aPix) {
  if (aPix == null)
    aPix = 120;
  //sendWheelEvent({deltaY: -aPix}, aDomNode);
  fakeWheelEvent({deltaY: -aPix}, aDomNode);
};

}); // end define
