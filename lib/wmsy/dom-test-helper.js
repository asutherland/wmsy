// ORIGINALLY FROM:
// mozilla-central/source/testing/mochitest/tests/SimpleTest/EventUtils.js

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

  if (!aWindow) {
    aWindow = window;
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

var wheelScrollUp = exports.wheelScrollUp =
    function wheelScrollUp(aDomNode, aPix) {
  if (aPix == null)
    aPix = 120;
  sendWheelEvent({deltaY: aPix}, aDomNode);
};

var wheelScrollDown = exports.wheelScrollDown =
    function wheelScrollDown(aDomNode, aPix) {
  if (aPix == null)
    aPix = 120;
  sendWheelEvent({deltaY: -aPix}, aDomNode);
};
