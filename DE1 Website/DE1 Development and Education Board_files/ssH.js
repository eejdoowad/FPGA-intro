




/*
     FILE ARCHIVED ON 8:14:25 Oct 7, 2014 AND RETRIEVED FROM THE
     INTERNET ARCHIVE ON 20:14:38 Sep 4, 2015.
     JAVASCRIPT APPENDED BY WAYBACK MACHINE, COPYRIGHT INTERNET ARCHIVE.

     ALL OTHER CONTENT MAY ALSO BE PROTECTED BY COPYRIGHT (17 U.S.C.
     SECTION 108(a)(3)).
*/
// Copyright 2009 Google Inc.  All Rights Reserved.

/**
 * @fileoverview JavaScript for GSA Suggest (Core).
 *
 * List of global variables defined in other files. We define these variables
 * in an XSLT accessible to customers so that they can customize it.
 * Look at the stylesheet_template.enterprise for detailed descriptions of
 * these variables. Listing here with short descriptions:
 * <ul>
 * <li> ss_form_elementH {string} Name of search form.
 * <li> ss_popup_elementH {string} Name of search suggestion drop down.
 * <li> ss_seq {array} Types of suggestions to include.
 * <li> ss_g_one_name_to_display {string} name to display to user.
 * <li> ss_g_more_names_to_display {string} name to display to user.
 * <li> ss_g_max_to_display {number} Max number of query suggestions to display.
 * <li> ss_max_to_display {number} Max number of all types of suggestions to
 * display.
 * <li> ss_wait_millisec {number} Idling internval for fast typers.
 * <li> ss_delay_millisec {number} Delay time to avoid contention when drawing
 * the suggestion box by various par  allel processes.
 * <li> ss_gsa_host {string} Host name or IP address of GSA.
 * <li> SS_OUTPUT_FORMAT_LEGACY {string} Constant that contains the value for
 * legacy output format.
 * <li> SS_OUTPUT_FORMAT_OPEN_SEARCH {string} Constant that contains the value
 * for OpenSearch output format.
 * <li> SS_OUTPUT_FORMAT_RICH {string} Constant that contains the value for rich
 * output format.
 * <li> ss_g_protocol {string} Output format protocol to use.
 * <li> ss_allow_debug {boolean} Whether debugging is allowed.
 * </ul>
 */

/**
 * Cached array that stores processed results for typed queries.
 * @type {array}
 */
var ss_cachedH = [];

/**
 * Cached query when using up and down arrows to move around the suggestion box.
 * When the user escapes from the suggestion box, the typed query is restored
 * from here.
 * @type {string}
 */
var ss_qbackupH = null;

/**
 * The query for which suggestions are displayed.
 * @type {string}
 */
var ss_qshownH = null;

/**
 * The table row location of the selected suggestion entry.
 * @type {number}
 */
var ss_locH = -1;

/**
 * Lock to prevent painting the suggestion box for an expired query after the
 * required delay.
 * @type {number}
 */
var ss_waitingH = 0;

/**
 * Lock to prevent contention when drawing the suggestion box, especially for
 * the concurrent AJAX calls.
 * @type {boolean}
 */
var ss_paintingH = false;

/**
 * Pending key handling request holder.
 */
var ss_key_handling_queueH = null;

/**
 * Pending painting request holder.
 */
var ss_painting_queueH = null;

/**
 * Global flag to indicate whether the search box is currently dismissed.
 * The suggestion box must not be drawn if it is false.
 * @type {boolean}
 */
var ss_dismissedH = false;

/**
 * Low-level raw information including AJAX requests and responses shown via
 * rudimental alert().
 * @type {boolean}
 */
var ss_panicH = false;

/**
 * Constant for the name of class for a row in suggestions drop down.
 * @type {string}
 */
var SS_ROW_CLASSH = 'ss-gac-a';

/**
 * Constant for the name of class for a selected row in suggestions drop down.
 * @type {string}
 */
var SS_ROW_SELECTED_CLASSH = 'ss-gac-b';

if (!Array.indexOf) {
  /**
   * Custom implementation of indexOf for browsers that do not support it.
   * For example, IE6 and IE7 do not support.
   *
   * @param {Object} obj The element to be searched in the array.
   *
   * @return {number} The index if the element is found, -1 otherwise.
   */
  Array.prototype.indexOf = function(obj) {
    for (var i = 0; i < this.length; i++) {
      if (this[i] == obj) {
        return i;
      }
    }
    return -1;
  };
}

/**
 * Instance of debugger.
 * @type {ss_DebuggerH}
 */
var ss_debugH = new ss_DebuggerH();

/**
 * Composes the suggest URI to be sent to EnterpriseFrontend. Extracts the user
 * input from the suggest form and then formats the URI based on that.
 *
 * @param {string} qVal The query string.
 * @param {Element} suggestForm The suggest form node.
 *
 * @return {string} The composed URI.
 */
function ss_composeSuggestUriH(qVal, suggestForm) {
  var siteVal = suggestForm.site ? suggestForm.site.value : null;
  var clientVal = suggestForm.client ? suggestForm.client.value : null;
  if (!qVal || !siteVal || !clientVal) {
    return null;
  }
  var accessVal = (suggestForm.access && suggestForm.access.value) ?
      suggestForm.access.value : 'p';
  //var uri = '/suggest';
  var uri = '/servlets/gsasuggest';
  if (SS_OUTPUT_FORMAT_LEGACY == ss_protocol) {
    uri = uri + '?token=' + encodeURIComponent(qVal) +
        '&max_matches=' + ss_g_max_to_display;
  } else {
    // Same param names for other two formats.
    uri = uri + '?q=' + encodeURIComponent(qVal) +
        '&max=' + ss_g_max_to_display;
  }
  uri = uri +
	  '&mode=' + ss_mode +
      '&site=' + encodeURIComponent(siteVal) +
      '&client=' + encodeURIComponent(clientVal) +
      '&access=' + encodeURIComponent(accessVal) +
      '&format=' + encodeURIComponent(ss_protocol);
  return uri;
}

/**
 * Submits a suggest query to the EnterpriseFrontend.
 *
 * Also defines a nested function handler that is called when suggest results
 * are fetched. The handler function parses the JSON response to extract
 * dynamic result clusters, and document matches.
 *
 * @param {string} qVal The query that user enters.
 */
// TODO: This function is too big and needs to be re-factored.
function ss_suggestH(qVal) {
  var startTimeMs = new Date().getTime();
  if (!ss_cachedH[qVal]) {
    ss_cachedH[qVal] = {};
  }
  var suggestForm = document.getElementById(ss_form_elementH);
  var uri = ss_composeSuggestUriH(qVal, suggestForm);
  if (!uri) {
    return;
  }
  var url = ss_gsa_host ? 'http://' + ss_gsa_host + uri : uri;
  if (ss_panicH) {
    alert('ss_suggestH() AJAX: ' + url);
  }
  var xmlhttp = XH_XmlHttpCreate();
  var handler = function() {
    if (xmlhttp.readyState == XML_READY_STATE_COMPLETED) {
      if (ss_panicH) {
        alert('ss_suggestH() AJAX: ' + xmlhttp.responseText);
      }
      var suggested;
      try {
        suggested = eval('(' + xmlhttp.responseText + ')');
      } catch (e) {
        ss_cachedH[qVal].g = null;

        // Always try to show suggestion box even if there is no results
        // because previous attempt may be skipped due to concurrent ajax
        // processing.
        ss_showH(qVal);
        return;
      }
      if (ss_useH.g) {
        try {
          switch (ss_protocol) {
            case SS_OUTPUT_FORMAT_LEGACY:
            default:
              var suggestions = suggested;
              if (suggestions && suggestions.length > 0) {
                var found = false;
                ss_cachedH[qVal].g = [];
                var max = (ss_g_max_to_display <= 0) ?
                    suggestions.length :
                    Math.min(ss_g_max_to_display, suggestions.length);
                for (var si = 0; si < max; si++) {
                  ss_cachedH[qVal].g[si] = { 'q': suggestions[si] };
                  found = true;
                }
                if (!found) {
                  ss_cachedH[qVal].g = null;
                }
              } else {
                ss_cachedH[qVal].g = null;
              }
              break;
            case SS_OUTPUT_FORMAT_OPEN_SEARCH:
              if (suggested.length > 1) {
                var suggestions = suggested[1];
                if (suggestions && suggestions.length > 0) {
                  var found = false;
                  ss_cachedH[qVal].g = [];
                  var max = (ss_g_max_to_display <= 0) ?
                      suggestions.length :
                      Math.min(ss_g_max_to_display, suggestions.length);
                  for (var si = 0; si < max; si++) {
                    if (suggestions[si] && suggestions[si] != suggested[0]) {
                      ss_cachedH[qVal].g[si] = { 'q': suggestions[si] };
                      found = true;
                    } else if ((suggested.length > 3) && ss_allow_non_query) {
                      var title = (suggested[2].length > si) ?
                          null : suggested[2][si];
                      var url = (suggested[3].length > si) ?
                          null : suggested[3][si];
                      if (url) {
                        title = !title ? ss_non_query_empty_title : title;
                        ss_cachedH[qVal].g[si] = { 't': title, 'u': url };
                        found = true;
                      }
                    }
                  }
                  if (!found) {
                    ss_cachedH[qVal].g = null;
                  }
                } else {
                  ss_cachedH[qVal].g = null;
                }
              } else {
                ss_cachedH[qVal].g = null;
              }
              break;
            case SS_OUTPUT_FORMAT_RICH:
              var suggestions = suggested.results;
              if (suggestions && suggestions.length > 0) {
                var found = false;
                ss_cachedH[qVal].g = [];
                var max = (ss_g_max_to_display <= 0) ?
                    suggestions.length :
                    Math.min(ss_g_max_to_display, suggestions.length);
                for (var si = 0; si < max; si++) {
                  if (suggestions[si].name &&
                      suggestions[si].name != suggested.query) {
                    ss_cachedH[qVal].g[si] = { 'q': suggestions[si].name };
                    found = true;
                  } else if (ss_allow_non_query) {
                    var title = suggestions[si].content;
                    var url = suggestions[si].moreDetailsUrl;
                    if (url) {
                      title = !title ? ss_non_query_empty_title : title;
                      ss_cachedH[qVal].g[si] = { 't': title, 'u': url };
                      found = true;
                    }
                  }
                }
                if (!found) {
                  ss_cachedH[qVal].g = null;
                }
              } else {
                ss_cachedH[qVal].g = null;
              }
              break;
          }
        } catch (e) {
          ss_cachedH[qVal].g = null;
        }
      }
      if (ss_allow_debug && ss_debugH && ss_debugH.getDebugMode()) {
        var stopTimeMs = new Date().getTime();
        ss_debugH.addRequestDebugLine(qVal, 'suggest',
                                     stopTimeMs - startTimeMs, ss_cachedH[qVal]);
      }

      // Always try to show suggestion box even if there is no results
      // because previous attempt may be skipped due to concurrent ajax
      // processing.
      ss_showH(qVal);
    }
  };
  XH_XmlHttpPOST(xmlhttp, url, '', handler);
}

/**
 * Determines if the query has been processed.
 *
 * @param {string} qVal The query that user enters.
 * @return {boolean} True if this query is already in cache.
 */
function ss_processedH(qVal) {
  if (!ss_cachedH[qVal] && ss_useH.g) {
    return false;
  }
  return true;
}

/**
 * Handles key stroke events for turning debug console on and off.
 */
function ss_handleAllKeyH(e) {
  var kid = (window.event) ? window.event.keyCode : e.keyCode;
  switch (kid) {
    case 40:  // "key down".
    case 38:  // "key up".
      // If the next line is activated, key down and up will bring search box
      // into focus which is useful if the user happens to click the mouse
      // outside of the search box and the suggestions, but it may not be
      // desirable if you want to use keyboard to scroll the page also, once the
      // key is trapped here, it won't starts move the selection unless we add
      // suggestion movement code here, which would bring side effect to the
      // search box key stroke trapping.
      break;
    case 9:  // "tab".
      ss_qbackupH = null;
      ss_dismissedH = true;
      ss_clearH(true);
    case 16:  // "shift-tab".
      ss_qbackupH = null;
      ss_dismissedH = true;
      var qry = document.getElementById(ss_form_elementH).q.value;
      if (!ss_processedH(qry)) {
        // Fire new searches for the selected suggestion
        // useful for potential lucky guess.
        if (ss_panicH) {
          alert('run ajax when key off');
        }
        ss_suggestH(qry);
      }
      break;
    case 113:  // "F2".
      if (!ss_allow_debug) {
        break;
      }
      if (ss_debugH && ss_debugH.getDebugMode()) {
        ss_debugH.deactivateConsole();
      } else {
        ss_debugH.activateConsole();
      }
      break;
    default:
      break;
  }
}

/**
 * Handles key stroke events for the search box.
 */
function ss_handleKeyH(e) {
  var kid = (window.event) ? window.event.keyCode : e.keyCode;
  var fo = document.getElementById(ss_form_elementH);
  var qnow = (!ss_qbackupH) ? fo.q.value : ss_qbackupH;
  var sum = 0;
  var tbl = document.getElementById(ss_popup_elementH);
  switch (kid) {
    case 40:  // "key down".
      ss_dismissedH = false;
      if (ss_processedH(qnow)) {
        sum = ss_countSuggestionsH(qnow);
        if (sum > 0) {
          if (tbl.style.visibility == 'hidden') {
            ss_showH(qnow);
            break;
          }
          if (ss_qbackupH) {
            ss_locH++;
          } else {
            ss_qbackupH = qnow;
            ss_locH = 0;
          }
          while (ss_locH >= sum)
            ss_locH -= sum;
          var rows = tbl.getElementsByTagName('tr');
          for (var ri = 0; ri < rows.length - 1; ri++) {
            if (ri == ss_locH) {
              rows[ri].className = SS_ROW_SELECTED_CLASSH;
            } else {
              rows[ri].className = SS_ROW_CLASSH;
            }
          }

          // Find out what type of suggestion it is.
          var suggestion = ss_locateSuggestionH(qnow, ss_locH);

          // Adjust the query in the search box.
          if (suggestion.q) {
            fo.q.value = suggestion.q;
          } else {
            fo.q.value = ss_qbackupH;
          }
        }
      } else {
        // May be here if using back button.
        if (ss_panicH) {
          alert('run ajax when key down');
        }
        ss_suggestH(qnow);
      }
      break;
    case 38:  // "key up".
      ss_dismissedH = false;
      if (ss_processedH(qnow)) {
        sum = ss_countSuggestionsH(qnow);
        if (sum > 0) {
          if (tbl.style.visibility == 'hidden') {
            ss_showH(qnow);
            break;
          }
          if (ss_qbackupH) {
            ss_locH--;
          } else {
            ss_qbackupH = qnow;
            ss_locH = -1;
          }
          while (ss_locH < 0)
            ss_locH += sum;
          var rows = tbl.getElementsByTagName('tr');
          for (var ri = 0; ri < rows.length - 1; ri++) {
            if (ri == ss_locH) {
              rows[ri].className = SS_ROW_SELECTED_CLASSH;
            } else {
              rows[ri].className = SS_ROW_CLASSH;
            }
          }

          // Find out what type of suggestion it is.
          var suggestion = ss_locateSuggestionH(qnow, ss_locH);

          // Adjust the query in the search box.
          if (suggestion.q) {
            fo.q.value = suggestion.q;
          } else {
            fo.q.value = ss_qbackupH;
          }
        }
      } else {
        // May be here if using back button.
        if (ss_panicH) {
          alert('run ajax when key up');
        }
        ss_suggestH(qnow);
      }
      break;
    case 13:  // "enter".
      var url = null;
      if (ss_processedH(qnow) && ss_qbackupH && ss_locH > -1) {
        // Find out what type of suggestion it is.
        var suggestion = ss_locateSuggestionH(ss_qbackupH, ss_locH);
        // Adjust the query in the search box.
        if (suggestion.u) {
          url = suggestion.u;
        }
      }
      ss_qbackupH = null;
      ss_dismissedH = true;
      ss_clearH();
      if (url) {
        window.location.href = url;
      }
      break;
    case 27:  // "escape".
      if (ss_qbackupH) {
        fo.q.value = ss_qbackupH;
        ss_qbackupH = null;
      }
      ss_dismissedH = true;
      ss_clearH();
      break;
    case 37:  // "key left".
    case 39:  // "key right".
    case 9:  // "tab".
    case 16:  // "shift-tab".
      break;
    default:
      ss_dismissedH = false;
      if (fo.q.value == ss_qshownH) {
        // The key stroke has not changed the searched text.
      } else {
        if (ss_key_handling_queueH) {
          // Ignore pending key handling request delayed earlier.
          clearTimeout(ss_key_handling_queueH);
        }
        ss_qbackupH = null;
        ss_locH = -1;
        // Flow through for delayed AJAX calls.
        ss_waitingH++;
        if (ss_allow_debug && ss_debugH && ss_debugH.getDebugMode()) {
          ss_debugH.addWaitDebugLine(fo.q.value, 'queue', ss_wait_millisec);
        }
        ss_key_handling_queueH = setTimeout(
            'ss_handleQueryH("' + ss_escapeH(fo.q.value) + '", ' +
            ss_waitingH + ')', ss_wait_millisec);
      }
      break;
  }
}

/**
 * Triggers fetch for query suggestions or triggers the display depending on
 * whether the query has already been processed earlier or not.
 *
 * @param {string} query The query whose suggestions are needed.
 * @param {number} waiting1 The value to match the lock so as not to handle
 *     queries that are no longer valid.
 */
function ss_handleQueryH(query, waiting1) {
  if (waiting1 != ss_waitingH) return;
  ss_waitingH = 0;
  if (query == '') {
    ss_clearH();
  } else if (!ss_processedH(query)) {
    if (ss_panicH) {
      alert('run ajax when key change');
    }
    ss_suggestH(query);
  } else {
    ss_showH(query);
  }
}

/**
 * Puts search box in focus.
 */
function ss_sfH() {
  document.getElementById(ss_form_elementH).q.focus();
  ss_dismissedH = false;
}

/**
 * Clears search suggestions.
 *
 * @param {boolean} nofocus The flag to indicate whether the search box must not
 *     be in focus, such as when user uses the tab key to move away to the
 *     search button(s).
 */
function ss_clearH(nofocus) {
  ss_qshownH = null;
  var fo = document.getElementById(ss_form_elementH);
  var qnow = (!ss_qbackupH) ? fo.q.value : ss_qbackupH;
  ss_hideH(qnow);
  if (!nofocus) {
    ss_sfH();
  }
}

/**
 * Hides search suggestions.
 *
 * @param {string} qry The query to which suggestions to be closed.
 */
function ss_hideH(qry) {
  var tbl = document.getElementById(ss_popup_elementH);
  if (tbl.style.visibility == 'visible') {
    if (ss_panicH) {
      alert('close suggestion box');
    }
    if (ss_allow_debug && ss_debugH && ss_debugH.getDebugMode()) {
      ss_debugH.addHideDebugLine(qry, 'hide');
    }
    tbl.style.visibility = 'hidden';
  }
}

/**
 * Shows search suggestions.
 *
 * @param {string} qry The query to which suggestions to be presented.
 */
function ss_showH(qry) {
  var currentQry = document.getElementById(ss_form_elementH).q.value;
  if (currentQry != qry) {
    // The query whose suggestions to be shown does not match the current query
    // this happens when the previous query takes much longer to process.
    if (ss_allow_debug && ss_debugH && ss_debugH.getDebugMode()) {
      ss_debugH.addHideDebugLine(qry, 'skip');
    }
    return;
  }

  var startTimeMs = new Date().getTime();
  if (ss_dismissedH) {
    // The suggestion box has been dismissed by mouse close or key
    // escape/enter/tab.
    ss_qshownH = null;
    ss_hideH(qry);
    return;
  }

  if (!ss_processedH(qry)) {
    // Not all ajax calls have been processed, skip instead.
    return;
  }

  if (qry == '') {
    // Empty query should not have much to suggest, close if not already.
    ss_hideH(qry);
    return;
  }

  var g = ss_cachedH[qry] ? ss_cachedH[qry].g : null;
  var disp = false;
  if (ss_useH.g && g) {
    disp = true;
  }
  if (!disp) {
    // Nothing to show for.
    ss_qshownH = null;
    ss_hideH(qry);
    return;
  }
  // Check the lock.
  if (ss_paintingH) {
    if (ss_painting_queueH) {
      // Ignore potential painting request delayed earlier.
      clearTimeout(ss_painting_queueH);
    }
    // Postpone the call for later time.
    if (ss_allow_debug && ss_debugH && ss_debugH.getDebugMode()) {
      ss_debugH.addWaitDebugLine(qry, 'delay', ss_delay_millisec);
    }
    ss_painting_queueH = setTimeout('ss_showH("' + ss_escapeH(qry) + '")',
                                   ss_delay_millisec);
    return;
  } else {
    // Set the lock, which may not be fool-proof when more than another thread
    // checks the lock just before.
    ss_paintingH = true;
  }
  var tbl = document.getElementById(ss_popup_elementH);
  for (var ri = tbl.rows.length - 1; ri > -1; ri--) {
    tbl.deleteRow(ri);
  }
  var cnt = 0;
  for (var z = 0; z < ss_seq.length; z++) {
    switch (ss_seq[z]) {
      case 'g':
        cnt += ss_showSuggestionH(g, cnt, tbl, qry);
        break;
    }
    if (ss_max_to_display > 0 && cnt >= ss_max_to_display) {
      break;
    }
  }
  if (cnt > 0) {
    var row = tbl.insertRow(-1);
    row.className = 'ss-gac-e';
    var cls = document.createElement('td');
    cls.colSpan = 2;
    var clsTxt = document.createElement('span');
    clsTxt.onclick = function() {
      ss_qbackupH = null;
      ss_clearH();  // This will always turn off ss_dismiss after bring search
                   // box into focus.
      var query = document.getElementById(ss_form_elementH).q.value;
      if (!ss_processedH(query)) {
        // Fire new searches for the selected suggestion
        // useful for potential lucky guess.
        ss_dismissedH = true;
        if (ss_panicH) {
          alert('run ajax when mouse close');
        }
        ss_suggestH(query);
      }
    };
	var close_display = "close";
	if (document.domain.indexOf("japan")>=0 || document.domain.indexOf("jp")>=0 || window.location.href.indexOf(".com/jp/")>0) {
		close_display = "閉じる";
	} else if (document.domain.indexOf("china")>=0 || document.domain.indexOf("cn")>=0 || window.location.href.indexOf(".com/cn/")>0) {
		close_display = "关闭";
	}
	clsTxt.appendChild(document.createTextNode(close_display));
    //clsTxt.appendChild(document.createTextNode('close'));
    cls.appendChild(clsTxt);
    row.appendChild(cls);
    tbl.style.visibility = 'visible';
    ss_qshownH = qry;
    if (ss_panicH) {
      alert('open suggestion box for ' + qry);
    }
    if (ss_allow_debug && ss_debugH && ss_debugH.getDebugMode()) {
      var stopTimeMs = new Date().getTime();
      ss_debugH.addShowDebugLine(qry, stopTimeMs - startTimeMs,
                                ss_cachedH[qry], cnt);
    }
  } else {
    ss_hideH(qry);
  }
  // Release the lock.
  ss_paintingH = false;
}

/**
 * Draws suggestion.
 *
 * @param {object} g The suggest server entry.
 * @param {number} cnt The current row index to start drawing.
 * @param {object} tbl The suggestion box element.
 * @param {string} qry The user's query.
 * @return {number} Returns the number of suggestions actually drawn.
 */
function ss_showSuggestionH(g, cnt, tbl, qry) {
  if (ss_max_to_display > 0 && cnt >= ss_max_to_display) {
    return 0;
  }
  if (g && g.length > 0) {
    lqry = qry.toLowerCase().replace(/\"/g, "");
    for (var i = 0; i < g.length; i++) {
      var row = tbl.insertRow(-1);
      row.onclick = ss_handleMouseCH;
      row.onmousemove = ss_handleMouseMH;
      row.className = SS_ROW_CLASSH;
      var alt = document.createElement('td');
      // the suggestion will always start with the query.
      if (g[i].q) {
        var txtNode = '<b>' + g[i].q.substr(0, lqry.length) + '</b>';
        if (g[i].q.length > lqry.length) {
          txtNode += g[i].q.substring(lqry.length);
        }
        alt.innerHTML = txtNode;
      } else {
        alt.innerHTML = '<i>' + g[i].t + '</i>';
      }
      alt.className = 'ss-gac-c';
      row.appendChild(alt);
      var clue = '';
      if (i == 0 && g.length == 1) {
        clue = ss_g_one_name_to_display;
      } else if (i == 0) {
        clue = ss_g_more_names_to_display;
      }
      var typ = document.createElement('td');
      typ.appendChild(document.createTextNode(clue));
      typ.className = 'ss-gac-d';
      row.appendChild(typ);
      if (ss_max_to_display > 0 && cnt + i + 1 >= ss_max_to_display) {
        return i + 1;
      }
    }
    return g.length;
  }
  return 0;
}

/**
 * Handles mouse movement. To be attached to the row on mouse-over.
 * @return {boolean} Always returns true after handling the event.
 * @this {Element}
 */
function ss_handleMouseMH() {
  var fo = document.getElementById(ss_form_elementH);
  var tbl = document.getElementById(ss_popup_elementH);
  var rows = tbl.getElementsByTagName('tr');
  for (var ri = 0; ri < rows.length - 1; ri++) {
    if (rows[ri] == this && rows[ri].className != SS_ROW_SELECTED_CLASSH) {
      // Select the row.
      rows[ri].className = SS_ROW_SELECTED_CLASSH;
      // Back up the original query if not already, and adjust the reference
      // index.
      if (!ss_qbackupH) {
        ss_qbackupH = fo.q.value;
      }
      ss_locH = ri;
      // Find out what type of suggestion it is.
      var suggestion = ss_locateSuggestionH(ss_qbackupH, ss_locH);
      // Adjust the query in the search box.
      if (suggestion.q) {
        fo.q.value = suggestion.q;
      } else {
        fo.q.value = ss_qbackupH;
      }
    } else if (rows[ri] != this) {
      rows[ri].className = SS_ROW_CLASSH;
    }
  }
  // Bring the search box back into focus to allow the next key down and key up.
  ss_sfH();
  return true;
}

/**
 * Handles mouse pressing, while keeping the history in the browser in case back
 * button is used. To be attached to the row on mouse clicking.
 * @this {Element}
 */
function ss_handleMouseCH() {
  var fo = document.getElementById(ss_form_elementH);
  var tbl = document.getElementById(ss_popup_elementH);
  var rows = tbl.getElementsByTagName('tr');
  for (var ri = 0; ri < rows.length - 1; ri++) {
    if (rows[ri] == this) {
      // Back up the original query if not already, and adjust the reference
      // index.
      if (!ss_qbackupH) {
        ss_qbackupH = fo.q.value;
      }
      ss_locH = ri;
      // Find out what type of suggestion it is.
      var suggestion = ss_locateSuggestionH(ss_qbackupH, ss_locH);
      // Adjust the query in the search box.
      if (suggestion.q) {
        fo.q.value = suggestion.q;
        fo.submit();
      } else {
        fo.q.value = ss_qbackupH;
        if (suggestion.u) {
          window.location.href = suggestion.u;
        }
      }
      break;
    }
  }
}

/**
 * Counts the total number of suggestions for the typed query.
 *
 * @param {string} query The typed query.
 * @return {number} The number of suggestions we have for displaying.
 */
function ss_countSuggestionsH(query) {
  var cnt = 0;
  for (var i = 0; i < ss_seq.length; i++) {
    switch (ss_seq[i]) {
      case 'g':
        cnt += ss_cachedH[query].g ? ss_cachedH[query].g.length : 0;
        break;
    }
    if (ss_max_to_display > 0 && cnt >= ss_max_to_display) {
      return ss_max_to_display;
    }
  }
  return cnt;
}

/**
 * Looks up the suggestion for the typed query.
 *
 * @param {string} query The typed query.
 * @param {number} loc The location index of the current suggestion selection.
 *
 * @return {string} The suggestion term for given query at the given loc.
 */
function ss_locateSuggestionH(query, loc) {
  var cnt1 = 0;
  var cnt2 = 0;
  var type = null;
  for (var z = 0; z < ss_seq.length; z++) {
    switch (ss_seq[z]) {
      case 'g':
        cnt2 += ss_cachedH[query].g ? ss_cachedH[query].g.length : 0;
        break;
    }
    if (loc >= cnt1 && loc < cnt2) {
      switch (ss_seq[z]) {
        case 'g':
          var qV = ss_cachedH[query].g[loc - cnt1].q;
          if (qV) {
            return { 'q': qV };
          } else {
            return { 'u': ss_cachedH[query].g[loc - cnt1].u };
          }
      }
      break;
    }
    cnt1 = cnt2;
  }
  return null;
}

/**
 * Escapes query to be used in setTimeout().
 *
 * @param {string} query The query whose suggestions are needed.
 * @return {string} The escaped query.
 */
function ss_escapeH(query) {
  return query.replace(/\\/g, '\\\\').replace(/\"/g, '\\\"');
}

/**
 * Escapes query to be used in debugging display.
 *
 * @param {string} query The query whose suggestions are needed.
 * @return {string} The escaped query.
 */
function ss_escapeDbgH(query) {
  var escapedQuery = '';
  var ch = query.split('');
  for (var i = 0; i < ch.length; i++) {
    switch (ch[i]) {
      case '&':
        escapedQuery += '&amp;';
        break;
      case '<':
        escapedQuery += '&lt;';
        break;
      case '>':
        escapedQuery += '&gt;';
        break;
      default:
        escapedQuery += ch[i];
        break;
    }
  }
  return escapedQuery;
}

/**
 * Debugger class.
 *
 * @constructor
 */
function ss_DebuggerH() {
  this.debugMode = false;
}

/**
 * Id of debug console in the DOM Tree.
 * @type {string}
 */
ss_DebuggerH.DEBUG_CONSOLE_ID = 'ss_debug_console';

/**
 * Id of content node of debug console in the DOM Tree.
 * @type {string}
 */
ss_DebuggerH.DEBUG_CONTENT_ID = 'ss_debug_content';

/**
 * Id of the button that minimizes/maximizes the debug console.
 * @type {string}
 */
ss_DebuggerH.DEBUG_TOGGLE_ID = 'ss_debug_toggle';

/**
 * Getter method for debugMode member variable.
 * @return {boolean} The value of debugMode variable.
 */
ss_DebuggerH.prototype.getDebugMode = function() {
  return this.debugMode;
};

/**
 * Activates debugger console.
 */
ss_DebuggerH.prototype.activateConsole = function() {
  var console = document.getElementById(ss_DebuggerH.DEBUG_CONSOLE_ID);
  if (console) {
    console.style.display = 'block';
  } else {
    var dc = document.createElement('div');
    dc.id = ss_DebuggerH.DEBUG_CONSOLE_ID;
    dc.zIndex = 100;
    dc.className = 'expanded';
    var title = document.createElement('h1');
    title.appendChild(document.createTextNode('GSA Suggest Debug Console'));
    title.style.display = 'inline';
    dc.appendChild(title);
    var actn = document.createElement('div');
    actn.style.float = 'right';
    var btn = document.createElement('button');
    btn.onclick = function(event) {
      var debugContent = document.getElementById(ss_DebuggerH.DEBUG_CONTENT_ID);
      if (debugContent) {
        for (var ri = debugContent.rows.length - 1; ri > 0; ri--) {
          debugContent.deleteRow(ri);
        }
      }
    };
    btn.appendChild(document.createTextNode('Clear console'));
    actn.appendChild(btn);
    btn = document.createElement('button');
    btn.onclick = function(event) {
      ss_cachedH = [];
    };
    btn.appendChild(document.createTextNode('Clear cache'));
    actn.appendChild(btn);
    btn = document.createElement('button');
    btn.id = ss_DebuggerH.DEBUG_TOGGLE_ID;
    btn.onclick = function(event) {
      var debugConsole = document.getElementById(ss_DebuggerH.DEBUG_CONSOLE_ID);
      if (debugConsole) {
        var b = document.getElementById(ss_DebuggerH.DEBUG_TOGGLE_ID);
        if (debugConsole.className.indexOf('expanded') != -1) {
          debugConsole.className = debugConsole.className.replace(
              /expanded/, 'contracted');
          b.innerHTML = 'Maximize';
        } else {
          debugConsole.className = debugConsole.className.replace(
              /contracted/, 'expanded');
          b.innerHTML = 'Minimize';
        }
      }
    };
    btn.appendChild(document.createTextNode('Minimize'));
    actn.appendChild(btn);
    actn.style.display = 'inline';
    dc.appendChild(actn);
    dc.appendChild(document.createElement('br'));
    var pane = document.createElement('table');
    pane.id = ss_DebuggerH.DEBUG_CONTENT_ID;
    var dhr = pane.insertRow(-1);
    var dhc = document.createElement('th');
    dhc.innerHTML = 'Query';
    dhr.appendChild(dhc);
    dhc = document.createElement('th');
    dhc.innerHTML = 'Type';
    dhr.appendChild(dhc);
    dhc = document.createElement('th');
    dhc.innerHTML = 'Time';
    dhr.appendChild(dhc);
    dhc = document.createElement('th');
    dhc.innerHTML = 'g';
    dhr.appendChild(dhc);
    dhc = document.createElement('th');
    dhc.innerHTML = 'Total';
    dhr.appendChild(dhc);
    dc.appendChild(pane);
    document.body.appendChild(dc);
  }
  this.debugMode = true;
};

/**
 * De-activates debugger console.
 */
ss_DebuggerH.prototype.deactivateConsole = function() {
  var console = document.getElementById(ss_DebuggerH.DEBUG_CONSOLE_ID);
  if (console) {
    console.style.display = 'none';
  }
  this.debugMode = false;
};

ss_DebuggerH.prototype.addRequestDebugLine = function(query, type, time, obj) {
  var debugContent = document.getElementById(ss_DebuggerH.DEBUG_CONTENT_ID);
  if (debugContent) {
    var currentRow = debugContent.insertRow(1);
    var currentCell = document.createElement('td');
    currentCell.innerHTML = '&lt;' + ss_escapeDbgH(query) + '&gt;';
    currentRow.appendChild(currentCell);
    currentCell = document.createElement('td');
    currentCell.innerHTML = type;
    currentRow.appendChild(currentCell);
    currentCell = document.createElement('td');
    currentCell.className = 'no';
    currentCell.innerHTML = time + ' ms';
    currentRow.appendChild(currentCell);
    switch (type) {
      case 'suggest':
        currentCell = document.createElement('td');
        currentCell.className = 'no';
        currentCell.innerHTML = (obj.g ? obj.g.length : 0);
        currentRow.appendChild(currentCell);
        currentCell = document.createElement('td');
        currentRow.appendChild(currentCell);
        break;
      default:
        currentCell = document.createElement('td');
        currentRow.appendChild(currentCell);
        currentCell = document.createElement('td');
        currentRow.appendChild(currentCell);
        break;
    }
  }
};

ss_DebuggerH.prototype.addShowDebugLine = function(query, time, o, total) {
  var debugContent = document.getElementById(ss_DebuggerH.DEBUG_CONTENT_ID);
  if (debugContent) {
    var currentRow = debugContent.insertRow(1);
    var currentCell = document.createElement('td');
    currentCell.innerHTML = '&lt;' + ss_escapeDbgH(query) + '&gt;';
    currentRow.appendChild(currentCell);
    currentCell = document.createElement('td');
    currentCell.innerHTML = '<i>show</i>';
    currentRow.appendChild(currentCell);
    currentCell = document.createElement('td');
    currentCell.className = 'no';
    currentCell.innerHTML = time + ' ms';
    currentRow.appendChild(currentCell);
    currentCell = document.createElement('td');
    currentCell.className = 'no';
    currentCell.innerHTML = (o ? (o.g ? o.g.length : 0) : 0);
    currentRow.appendChild(currentCell);
    currentCell = document.createElement('td');
    currentCell.className = 'no';
    currentCell.innerHTML = total;
    currentRow.appendChild(currentCell);
  }
};

ss_DebuggerH.prototype.addHideDebugLine = function(query, type) {
  var debugContent = document.getElementById(ss_DebuggerH.DEBUG_CONTENT_ID);
  if (debugContent) {
    var currentRow = debugContent.insertRow(1);
    var currentCell = document.createElement('td');
    currentCell.innerHTML = '&lt;' + ss_escapeDbgH(query) + '&gt;';
    currentRow.appendChild(currentCell);
    currentCell = document.createElement('td');
    currentCell.innerHTML = '<i>' + type + '</i>';
    currentRow.appendChild(currentCell);
    currentCell = document.createElement('td');
    currentCell.className = 'no';
    currentCell.innerHTML = '0 ms';
    currentRow.appendChild(currentCell);
    currentCell = document.createElement('td');
    currentRow.appendChild(currentCell);
    currentCell = document.createElement('td');
    currentRow.appendChild(currentCell);
  }
};

ss_DebuggerH.prototype.addWaitDebugLine = function(query, type, time) {
  var debugContent = document.getElementById(ss_DebuggerH.DEBUG_CONTENT_ID);
  if (debugContent) {
    var currentRow = debugContent.insertRow(1);
    var currentCell = document.createElement('td');
    currentCell.innerHTML = '&lt;' + ss_escapeDbgH(query) + '&gt;';
    currentRow.appendChild(currentCell);
    currentCell = document.createElement('td');
    currentCell.innerHTML = '<i>' + type + '</i>';
    currentRow.appendChild(currentCell);
    currentCell = document.createElement('td');
    currentCell.className = 'no';
    currentCell.innerHTML = time + ' ms';
    currentRow.appendChild(currentCell);
    currentCell = document.createElement('td');
    currentRow.appendChild(currentCell);
    currentCell = document.createElement('td');
    currentRow.appendChild(currentCell);
  }
};

/**
 * Object that stores which all type of suggestions to display.
 * @type {object}
 */
var ss_useH = {};
ss_useH.g = ss_seq.indexOf('g') >= 0 ? true : false;

/**
 * Defined outside this file (by the browser's DOM).
 * @type {object}
 */
document.onkeyup = ss_handleAllKeyH;
