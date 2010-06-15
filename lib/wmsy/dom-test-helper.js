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

function fakeWheelEvent(aEvent, aTarget) {
  var event = aTarget.ownerDocument.createEvent("MouseEvents");
  event.initMouseEvent("DOMMouseScroll", true, true,
                       aTarget.ownerDocument.defaultView, aEvent.deltaY / -40,
                       1, 0, 0, 0,
                       false, false, false, false,
                       0, null);
  aTarget.dispatchEvent(event);
}

/**
 * Parse the key modifier flags from aEvent. Used to share code between
 * synthesizeMouse and synthesizeKey.
 */
function _parseModifiers(aEvent)
{
  const masks = Components.interfaces.nsIDOMNSEvent;
  var mval = 0;
  if (aEvent.shiftKey)
    mval |= masks.SHIFT_MASK;
  if (aEvent.ctrlKey)
    mval |= masks.CONTROL_MASK;
  if (aEvent.altKey)
    mval |= masks.ALT_MASK;
  if (aEvent.metaKey)
    mval |= masks.META_MASK;
  //if (aEvent.accelKey)
  //  mval |= (navigator.platform.indexOf("Mac") >= 0) ? masks.META_MASK :
  //                                                     masks.CONTROL_MASK;

  return mval;
}

// from EventUtils too, since my made-up sendWheelEvent is no good owing to a
//  lack of support for WheelEvent
/**
 * Synthesize a mouse scroll event on a target. The actual client point is determined
 * by taking the aTarget's client box and offseting it by aOffsetX and
 * aOffsetY.
 *
 * aEvent is an object which may contain the properties:
 *   shiftKey, ctrlKey, altKey, metaKey, accessKey, button, type, axis, delta, hasPixels
 *
 * If the type is specified, a mouse scroll event of that type is fired. Otherwise,
 * "DOMMouseScroll" is used.
 *
 * If the axis is specified, it must be one of "horizontal" or "vertical". If not specified,
 * "vertical" is used.
 *
 * 'delta' is the amount to scroll by (can be positive or negative). It must
 * be specified.
 *
 * 'hasPixels' specifies whether kHasPixels should be set in the scrollFlags.
 *
 * aWindow is optional, and defaults to the current window object.
 */
function synthesizeMouseScroll(aTarget, aOffsetX, aOffsetY, aEvent, aWindow)
{
  var utils = aWindow.QueryInterface(Components.interfaces.nsIInterfaceRequestor).
                      getInterface(Components.interfaces.nsIDOMWindowUtils);
  if (utils) {
    // See nsMouseScrollFlags in nsGUIEvent.h
    const kIsVertical = 0x02;
    const kIsHorizontal = 0x04;
    const kHasPixels = 0x08;

    var button = aEvent.button || 0;
    var modifiers = _parseModifiers(aEvent);

    var rect = aTarget.getBoundingClientRect();

    var left = rect.left;
    var top = rect.top;

    var type = aEvent.type || "DOMMouseScroll";
    var axis = aEvent.axis || "vertical";
    var scrollFlags = (axis == "horizontal") ? kIsHorizontal : kIsVertical;
    if (aEvent.hasPixels) {
      scrollFlags |= kHasPixels;
    }
console.log("TARGET scroll offsets", aTarget.offsetLeft, aTarget.offsetTop);
console.log("targetting scroll wheel event at", left + aOffsetX, top + aOffsetY,
            "with type", type, "button", button, "scroll flags", scrollFlags, "modifiers", modifiers);
    function chatty(aEvent) {
      console.log("*** EVENT!!! ***");
    }
aTarget.parentNode.addEventListener("DOMMouseScroll", chatty, false);
    utils.sendMouseScrollEvent(type, left + aOffsetX, top + aOffsetY, button,
                               scrollFlags, aEvent.delta, modifiers);
aTarget.parentNode.removeEventListener("DOMMouseScroll", chatty, false);
  }
}

var wheelScrollUp = exports.wheelScrollUp =
    function wheelScrollUp(aDomNode, aPix) {
  if (aPix == null)
    aPix = 120;
  /*
  synthesizeMouseScroll(aDomNode, 1, 1,
                        {type: "DOMMouseScroll", hasPixels: true, delta: aPix,
                         button: 1},
                        aDomNode.ownerDocument.defaultView);
  */
  //sendWheelEvent({deltaY: aPix}, aDomNode);
  fakeWheelEvent({deltaY: aPix}, aDomNode);
};

var wheelScrollDown = exports.wheelScrollDown =
    function wheelScrollDown(aDomNode, aPix) {
  if (aPix == null)
    aPix = 120;
  /*
  synthesizeMouseScroll(aDomNode, 1, 1,
                        {type: "DOMMouseScroll", hasPixels: true, delta: -aPix,
                         button: 1},
                        aDomNode.ownerDocument.defaultView);
   */
  //sendWheelEvent({deltaY: -aPix}, aDomNode);
  fakeWheelEvent({deltaY: -aPix}, aDomNode);
};
