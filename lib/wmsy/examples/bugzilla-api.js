/**
 * Atul's bugzilla API helper from:
 * https://hg.mozilla.org/users/avarma_mozilla.com/bugzilla-dashboard/file/tip/js/bugzilla.js
 * with minimal conversion to CommonJS style.
 */
exports.Bugzilla = {
  BASE_URL: "https://api-dev.bugzilla.mozilla.org/latest",
  BASE_UI_URL: "https://bugzilla.mozilla.org",
  DEFAULT_OPTIONS: {
    method: "GET"
  },
  getShowBugURL: function Bugzilla_getShowBugURL(id) {
    return this.BASE_UI_URL + "/show_bug.cgi?id=" + id;
  },
  queryString: function Bugzilla_queryString(data) {
    var parts = [];
    for (name in data) {
      var values = data[name];
      if (!values.forEach)
        values = [values];
      values.forEach(
        function(value) {
          parts.push(encodeURI(name) + "=" + encodeURI(value));
        });
    }
    return parts.join("&");
  },
  ajax: function Bugzilla_ajax(options) {
    var newOptions = {__proto__: this.DEFAULT_OPTIONS};
    for (name in options)
      newOptions[name] = options[name];
    options = newOptions;

    function onLoad() {
      var response = JSON.parse(xhr.responseText);
      if (!response.error)
        options.success(response);
      // TODO: We should really call some kind of error callback
      // if this didn't work.
    }

    var xhr = options.xhr ? options.xhr : new XMLHttpRequest();
    var url = this.BASE_URL + options.url;

    if (options.data)
      url = url + "?" + this.queryString(options.data);
    xhr.open(options.method, url);
    xhr.setRequestHeader("Accept", "application/json");
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.addEventListener("load", onLoad, false);
    xhr.send(null);
    return xhr;
  },
  getBug: function Bugzilla_getBug(id, cb) {
    return this.ajax({url: "/bug/" + id,
                      success: cb});
  },
  search: function Bugzilla_search(query, cb) {
    return this.ajax({url: "/bug",
                      data: query,
                      success: cb});
  }
};

/**
 * Issues queries against the bugzilla JS API so that we can use its quicksearch
 *  syntax, run regexes against the ugly JSONP result to get the bug numbers,
 *  then reissue the request against the Bugzilla API above.
 */
exports.Fugzilla = function Fugzilla(aUsername, aPassword) {
  this.username = aUsername;
  this.password = aPassword;
};
exports.Fugzilla.prototype = {
  QS_URL_BASE: "https://bugzilla.mozilla.org/buglist.cgi?ctype=js&quicksearch=",
  quicksearch: function Fugzilla_quicksearch(aQSClause, options) {
    var dis = this;
    function bounceChew() {
      dis._chewQSResults(xhr, options);
    }

    var xhr = new XMLHttpRequest();
    var url = this.QS_URL_BASE + aQSClause;
    xhr.open("GET", url);
    xhr.addEventListener("load", bounceChew, false);
    xhr.send(null);
    return xhr;
  },

  RE_RESULT_BUG: /bugs\[(\d+)\] = \[/g,
  _chewQSResults: function Fugzilla__chewQSResults(xhr, options) {
    var rtext = xhr.responseText;
    var match;
    var bugIds = [];
    while ((match = this.RE_RESULT_BUG.exec(rtext))) {
      bugIds.push(match[1]);
    }
    return this.bugsById(bugIds, options);
  },

  /**
   * @param aBugIds A list of bug id strings.
   */
  bugsById: function Fugzilla_bugsById(aBugIds, callback) {
    var query = {
      username: this.username,
      password: this.password,
      id: aBugIds.join(","),
      include_fields: "_default,attachments,blocks,cc,comments,depends_on," +
        "dupe_of,flags,groups,history,see_also,token",
    };
    return Bugzilla.search(query, callback);
  },
};
