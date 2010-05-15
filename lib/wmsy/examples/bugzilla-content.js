/**
 * Comment content parsing.
 */

var connotent = require("gloda/connotent");

var ct = connotent.domain("bug-comment");

ct.defineProlog(/Created an attachment \(id=(\d+)\) \[details\]/,
  function(ctx, match) {
    ctx.
    ctx.comment.attachment = parseInt(match.group(1));
  }
);

ct.defineProlog(/\(From update of attachment (\d+) \[details\]\)/,
  function(ctx, match) {
    ctx.comment.attachment = parseInt(match.group(1));
  }
);

ct.defineQuoteFormat(/\(In reply to comment #(\d+)\)/, "> ",
  function(ctx, match) {
  }
);

ct.defineReference(/bug #?(\d+)(?: comment #?(\d+))/,
  function (ctx, match) {

  }
);
