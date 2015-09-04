




/*
     FILE ARCHIVED ON 8:14:30 Oct 7, 2014 AND RETRIEVED FROM THE
     INTERNET ARCHIVE ON 20:14:38 Sep 4, 2015.
     JAVASCRIPT APPENDED BY WAYBACK MACHINE, COPYRIGHT INTERNET ARCHIVE.

     ALL OTHER CONTENT MAY ALSO BE PROTECTED BY COPYRIGHT (17 U.S.C.
     SECTION 108(a)(3)).
*/
/**
 * HTML element names for the search form, the spellchecking suggestion, and the
 * cluster suggestions. The search form must have the following input elements:
 * "q" (for search box), "site", "client".
 * @type {string}
 */
var ss_form_element = 'suggestion_form'; // top search form
var ss_form_element2 = 'suggestion_form2'; // bottom search form
var ss_form_elementH = 'suggestion_formH'; // header search form

/**
 * Name of search suggestion drop down.
 * @type {string}
 */
var ss_popup_element = 'search_suggest'; // top search suggestion drop-down
var ss_popup_element2 = 'search_suggest2'; // bottom search suggestion drop-down
var ss_popup_elementH = 'search_suggestH'; // header search suggestion drop-down

/**
 * Types of suggestions to include.  Just one options now, but reserving the
 * code for more types
 *   g - suggest server
 * Array sequence determines how different suggestion types are shown.
 * Empty array would effectively turn off suggestions.
 * @type {object}
 */
var ss_seq = [ 'g' ];

/**
 * Suggestion type name to display when there is only one suggestion.
 * @type {string}
 */
var ss_g_one_name_to_display = "Suggestion";
if (document.domain.indexOf("japan")>=0 || document.domain.indexOf("jp")>=0 || window.location.href.indexOf(".com/jp/")>0) {
	ss_g_one_name_to_display = "関連キーワード";
} else if (document.domain.indexOf("china")>=0 || document.domain.indexOf("cn")>=0 || window.location.href.indexOf(".com/cn/")>0) {
	ss_g_one_name_to_display = "建议";
}

/**
 * Suggestion type name to display when there are more than one suggestions.
 * @type {string}
 */
var ss_g_more_names_to_display = "Suggestions";
if (document.domain.indexOf("japan")>=0 || document.domain.indexOf("jp")>=0 || window.location.href.indexOf(".com/jp/")>0) {
	ss_g_more_names_to_display = "関連キーワード";
} else if (document.domain.indexOf("china")>=0 || document.domain.indexOf("cn")>=0 || window.location.href.indexOf(".com/cn/")>0) {
	ss_g_more_names_to_display = "建议";
}

/**
 * The max suggestions to display for different suggestion types.
 * No-positive values are equivalent to unlimited.
 * For key matches, -1 means using GSA default (not tagging numgm parameter),
 * 0 means unlimited.
 * Be aware that GSA has a published max limit of 10 for key matches.
 * @type {number}
 */
var ss_g_max_to_display = 10;

/**
 * The max suggestions to display for all suggestion types.
 * No-positive values are equivalent to unlimited.
 * @type {number}
 */
var ss_max_to_display = 12;

/**
 * Idling interval for fast typers.
 * @type {number}
 */
var ss_wait_millisec = 300;

/**
 * Delay time to avoid contention when drawing the suggestion box by various
 * parallel processes.
 * @type {number}
 */
var ss_delay_millisec = 30;

/**
 * Host name or IP address of GSA.
 * Null value can be used if the JS code loads from the GSA.
 * For local test, use null if there is a <base> tag pointing to the GSA,
 * otherwise use the full GSA host name
 * @type {string}
 */
var ss_gsa_host = null;

/**
 * Constant that represents legacy output format.
 * @type {string}
 */
var SS_OUTPUT_FORMAT_LEGACY = 'legacy';

/**
 * Constant that represents OpenSearch output format.
 * @type {string}
 */
var SS_OUTPUT_FORMAT_OPEN_SEARCH = 'os';

/**
 * Constant that represents rich output format.
 * @type {string}
 */
var SS_OUTPUT_FORMAT_RICH = 'rich';

/**
 * What suggest request API to use.
 *   legacy - use current protocol in 6.0
 *            Request: /suggest?token=<query>&max_matches=<num>&use_similar=0
 *            Response: [ "<term 1>", "<term 2>", ..., "<term n>" ]
 *                   or
 *                      [] (if no result)
 *   os -     use OpenSearch protocol
 *            Request: /suggest?q=<query>&max=<num>&site=<collection>&client=<frontend>&access=p&format=os
 *            Response: [
 *                        "<query>",
 *                        [ "<term 1>", "<term 2>", ... "<term n>" ],
 *                        [ "<content 1>", "<content 2>", ..., "<content n>" ],
 *                        [ "<url 1>", "<url 2>", ..., "<url n>" ]
 *                      ] (where the last two elements content and url are optional)
 *                   or
 *                      [ <query>, [] ] (if no result)
 *   rich -   use rich protocol from search-as-you-type
 *            Request: /suggest?q=<query>&max=<num>&site=<collection>&client=<frontend>&access=p&format=rich
 *            Response: {
 *                        "query": "<query>",
 *                        "results": [
 *                          { "name": "<term 1>", "type": "suggest", "content": "<content 1>", "style": "<style 1>", "moreDetailsUrl": "<url 1>" },
 *                          { "name": "<term 2>", "type": "suggest", "content": "<content 2>", "style": "<style 2>", "moreDetailsUrl": "<url 2>" },
 *                          ...,
 *                          { "name": "<term n>", "type": "suggest", "content": "<content n>", "style": "<style n>", "moreDetailsUrl": "<url n>" }
 *                        ]
 *                      } (where type, content, style, moreDetailsUrl are optional)
 *                   or
 *                      { "query": <query>, "results": [] } (if no result)
 * If unspecified or null, using legacy protocol.
 * @type {string}
 */
var ss_protocol = SS_OUTPUT_FORMAT_RICH;

/**
 * Whether to allow non-query suggestion items.
 * Setting it to false can bring results from "os" and "rich" responses into
 * backward compatible with "legacy".
 * @type {boolean}
 */
var ss_allow_non_query = true;

/**
 * Default title text when the non-query suggestion item does not have a useful
 * title.
 * The default display text should be internalionalized.
 * @type {string}
 */
var ss_non_query_empty_title =
    "No Title";

/**
 * Whether debugging is allowed.  If so, toggle with F2 key.
 * @type {boolean}
 */
var ss_allow_debug = false;

/**
 * To determine whether the auto suggestion should be taken from preview or
 * production environment
 */
var ss_mode = 
	"";