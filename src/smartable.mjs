/*! smartable 1.0.0 https://uncle-fed.github.io/smartable/ @license MIT */

const jsYamlUrl = "https://cdn.jsdelivr.net/npm/js-yaml@4.1.0/dist/js-yaml.min.mjs";
const luxonUrl = "https://cdn.jsdelivr.net/npm/luxon@3.0.1/build/es6/luxon.min.js";

export default function (

        custom = {
            callback: {},
            converter: undefined,
            cssClass: {},
            html: {},
            options: {},
            source: undefined,
            specs: undefined,
            table: undefined,
            views: {}
        }) {

    // shorthand functions / helpers
    const $ = (s, o = document) => o.querySelector(s);
    const $$ = (s, o = document) => o.querySelectorAll(s);
    const $hasProp = (obj, key) => (obj !== null) && (typeof obj === "object") && Object.prototype.hasOwnProperty.call(obj, key);
    const $typeOf = (v) => Object.prototype.toString.call(v).replace("[object ", "").replace("]", "");

    // more shared "globals"
    const $htmlVoid = document.createElement("option");  // a "spare", never shown DOM element, serves as a helper below
    const $exportHelper = document.createElement("a");   // a "spare", never shown DOM element, used for CSV export

    const CIDRmasks = [...Array(32).keys()].map(bits => ~(0xFFFFFFFF >>> bits) >>> 0);
    const cidr2long = (suffix) => (suffix > 0 && suffix < 32) ? CIDRmasks[suffix] : 0xFFFFFFFF;

    const isoDateRE = new RegExp(/^\d{4}-\d{2}-\d{2}$/);
    const op = {"==": 3, "=": 3, "!=": 3, "~": 3, "!~": 3, "@=": 3, "<": 3, ">": 3, "AND": 2, "OR": 1};
    const filterTokens = {word: [], nonWord: []};

    const setFilterBit = 0b100000000000000000000;         // 21st bit IS set
    const setViewBit = 0b1000000000000000000000;          // 22nd bit IS set
    const renderBits = setFilterBit | setViewBit;         // either 21st or 22nd bit ARE set
    const clearFilterBit = ~setFilterBit;                 // 21st bit is NOT set
    const clearViewBit = ~setViewBit;                     // 22nd bit is NOT set
    const clearBothBits = clearFilterBit & clearViewBit;  // both 21st and 22nd bit are NOT set

    const CSVfieldSeparator = "\t";
    const CSVrecordSeparator = "\r\n";

    const defaultOptions = {
        colGroups: false,
        dateFormat: undefined,
        defColGroups: "none",
        export: true,
        filter: true,
        htmlAlt: undefined,
        sort: true,
    };

    const defaultCssClass = {
        badValue: "-smartable-bad-value",
        export: "-smartable-export",
        filterable: "-smartable-filterable",
        filterApply: "-smartable-filter-apply",
        filterClear: "-smartable-filter-clear",
        filterError: "-smartable-filter-error",
        filterHelp: "-smartable-filter-help",
        filterInput: "-smartable-filter-input",
        help: "-smartable-help",
        smartable: "-smartable",
        sortable: "-smartable-sortable",
        sortAsc: "-smartable-sort-asc",
        sortDesc: "-smartable-sort-desc"
    };

    const defaultHtml = {
        // help text for the query syntax
        helpHtml: `<p>Filter should contain one or more conditional statements. Each statement should contain three elements:</p>
        <ul>
            <li>
                <strong>Field Name</strong><br/>
                Can be obtained by hovering cursor over the column heading or simply by clicking inside a particular table cell.
            </li>
            <li>
                <strong>Comparison Operator</strong>
                <ul>
                    <li><var>=</var> or <var>==</var> (complete string match, case insensitive)</li>
                    <li><var>!=</var> (does not equal, case insensitive)</li>
                    <li><var>~</var> (matches regex, case insensitive)</li>
                    <li><var>!~</var> (does not match regex, case insensitive)</li>
                    <li><var>&gt;</var> (greater than)</li>
                    <li><var>&lt;</var> (less than)</li>
                    <li><var>@=</var> (contains IP address, only applicable to the IPv4 fields)</li>
                </ul>
            </li>
            <li>
                <strong>Possible Value</strong><br/>
                An arbitrary value (string, number, regular expression, IP address, date, version) that will be used for comparison.<br/>
                If the value contains whitespace, it should be put into double-quotes.<br/>
                Dates should be given in YYYY-MM-DD format.
            </li>
        </ul>
        <p>
            Multiple conditional statements can be combined together with the help of
            <var>AND</var>, <var>OR</var> and parentheses <var>(</var> <var>)</var>.<br/>
            It is also possible to combine statements using SHIFT / CTRL + click on table cells.<br/>
            ALT + click on a table cell causes filter expression to use regular expression operator.
        </p>
        <p>
            Finally, there is a special form of parenthesized expression that performs logical 'not',
            if parentheses are prepended by <var>NOT</var> or <var>!</var> suffix.<br/>
            Note that there must be no space between the <var>NOT</var> and the opening parenthesis.
        </p>
        <p>Below are the examples of valid filter expressions:</p>
        <ul>
            <li><code>src = 10.250.1.0/24 AND dst = 10.136.159.0/25</code></li>
            <li><code>srcIdent ~ ^XBID-PRD OR dstIdent ~ ^XBID-PRD</code></li>
            <li><code>requestor = "John Doe" AND dstLabel !~ ^M7</code></li>
            <li><code>src @= 10.136.31.12 AND (date &gt; 2018-12-01 OR date &lt; 2019-01-01)</code></li>
            <li><code>requestor = "John Doe" AND NOT(date &gt; 2018-12-01 OR date &lt; 2019-01-01)</code></li>
        </ul>`,

        error:       $("output:not([name='badfilter'])") || document.body.appendChild(document.createElement("output")) || $htmlVoid,
        export:      $("button[name='export']") || $htmlVoid,
        filterApply: $("button[name='submit']") || $htmlVoid,
        filterClear: $("button[name='reset']") || $htmlVoid,
        filterError: $("output[name='badfilter'") || $htmlVoid,
        filterHelp:  $("button[name='help']") || $htmlVoid,
        filterInput: $("input[type='search']") || $htmlVoid,
        help:        $("article") || $htmlVoid,
        table:       $("table") || document.body.appendChild(document.createElement("table")) || $htmlVoid,
    };

    defaultHtml.table.setAttribute("hidden", "");
    defaultHtml.error.setAttribute("hidden", "");
    defaultHtml.error.classList.add("-smartable-error");

    // additional table elements
    defaultHtml.caption = $("caption", defaultHtml.table) || defaultHtml.table.appendChild(document.createElement("caption")) || $htmlVoid;
    defaultHtml.thead = $("thead", defaultHtml.table) || defaultHtml.table.appendChild(document.createElement("thead")) || $htmlVoid;
    defaultHtml.tbody = $("tbody", defaultHtml.table) || defaultHtml.table.appendChild(document.createElement("tbody")) || $htmlVoid;

    const defaultCallback = {
        applyState: undefined,
        applyView: undefined,
        clearFilter: undefined,
        initData: undefined,
        initRender: undefined,
        postFilter: undefined,
        postRender: undefined,
        postSort: undefined,
        preFilter: undefined,
        preRender: undefined,
        preSort: undefined
    };

    // the "super-global" that encompasses all of the critical framework instance details
    // which will be passed to every custom callback handler
    const tbl = {
        callback: {...defaultCallback, ...(custom.callback || {})},
        converter: custom.converter === undefined ? ((x, y) => y.push(...x.data)) : custom.converter,
        cssClass: {...defaultCssClass, ...(custom.cssClass || {})},
        data: [],
        display: [],
        html: {...defaultHtml, ...(custom.html || {})},
        options: {...defaultOptions, ...(custom.options || {})},
        render: {},
        source: custom.source === undefined ? {data: "data.yml"} : custom.source,
        specs: custom.specs === undefined && custom.table === undefined ? "specs.yml" : custom.specs,
        state: {},
        table: custom.table,
        trigger: {updateView},
        views: custom.views
    };


    // converts a string into another string that is safe to inject into HTML attributes' values
    function escapeHtml(html) {
        $htmlVoid.textContent = html;
        return $htmlVoid.innerHTML;
    }


    // converts HTML text string into a pure text that would be visible in a browser (stripping tags, etc.)
    function html2text(html) {
        $htmlVoid.innerHTML = html;
        return $htmlVoid.textContent;
    }


    // converts given property of the object into array, if it's not already an array
    function value2array(obj, prop) {
        if (!Array.isArray(obj[prop])) {
            obj[prop] = ($typeOf(obj[prop]) === "String" && obj[prop].length)
                ? [obj[prop]]
                : [];
        }
    }


    // converts an IPv4 address (string) into an integer that represents the same IP address as 'longint'
    function ip2long(ip) {
        const octet = String(ip).split(".");
        return octet.length === 4
            ? ((((((+octet[0]) * 256) + (+octet[1])) * 256) + (+octet[2])) * 256) + (+octet[3])
            : 0;
    }


    // converts version string x.x.x.x.x.x-blah-x into a special hash that can be used for string comparison
    function ver2hash(ver) {

        // how many dot separated groups of characters to consider (before optional dash)
        const groups = 6;

        // max amount of characters for each of the dot separated groups (will be cut or padded to this amount)
        const padNum = 6;

        // max amount of characters for the string after optional dash (like -release, -beta, etc.)
        const padAlph = 2;

        // padding characters for dotted groups and string after optional dash
        const padChrLo = " ";
        const padChrHi = "~";

        // set maximum lengths of final hash parts using parameters above
        const hl = groups * padNum;
        const hlExt = hl + padAlph;
        const hlFull = hlExt + padNum;

        // start with empty values that will change and grow over time
        let hash = "";
        let group = "";
        let char = "";

        // if the version string is empty or non-existent, immediately return 'empty' hash
        if (!ver) {
            return padChrLo.repeat(hl) + padChrHi.repeat(padAlph) + padChrLo.repeat(padNum);
        }

        // 'for' loops are bad, but the 'for..of' is tolerated as a performance optimisation.
        // iterate over each character of the original version string
        // (note that unlike all other possible for() and forEach iterators,
        // the for..of loop actually takes care of UTF* encoding and multibyte characters!)
        for (char of String(ver)) {

            // if the main hash length (before the dash) hasn't been reached, do these steps
            if (hash.length < hl) {

                // if a dot character has been reached, add new group to the hash
                if (char === ".") {
                    // cut and pad current group as required
                    hash += group.substring(0, padNum).padStart(padNum, padChrLo);
                    // reset group for next possible iteration after dot
                    group = "";

                // if a dash character has been reached, finalize main hash
                } else if (char === "-") {

                    // first dump the current group into the main hash
                    hash += group.substring(0, padNum).padStart(padNum, padChrLo);

                    // if the hash is still not full length, then pad it to the maximum length
                    if (hash.length < hl) {
                        hash = hash.padEnd(hl, padChrLo);
                    }

                    // reset group for next possible iteration
                    group = "";

                // keep adding characters to the current group until something special happens
                } else {
                    group += char;
                }

            // the full hash is now there (the part before dash, so take care about what's after the dash)
            } else {

                // as long as the hash length hasn't been reached (includes the keyword after dash)
                if (hash.length < hlExt) {

                    // check for first numeric character after dash, but until it's not there, keep adding chars
                    if (char < "0" || char > "9") {
                        group += char;
                    // when the first numeric char after dash is encountered, accept the accumulated suffix string
                    } else {
                        // add suffix to the hash (pad and cut accordingly)
                        hash += group.substring(0, padAlph).padEnd(padAlph, padChrHi);
                        // keep the numeric char for the final group
                        group = char;
                    }

                // keep adding the characters to the current group
                } else {
                    group += char;
                }
            }
        }

        // iterating over the version string is done but has the final hash length been reached yet?
        if (hash.length < hl) {
            // if the version string did not contain max amount of dotted groups possible,
            // the hash would be incomplete and the there would be remaining chars in the group
            // variable, so dump them into the hash now
            hash += group.substring(0, padNum).padStart(padNum, padChrLo);

            // check if the final hash length hasn't been reached; if so, pad the hash to its maximum
            if (hash.length < hl) {
                hash = hash.padEnd(hl, padChrLo) + padChrHi.repeat(padAlph) + padChrLo.repeat(padNum);
            }
        }

        // there may still be some chars remaining in a group (the final one, after dash, after suffix)
        if (hash.length < hlFull) {
            hash += group.substring(0, padNum).padStart(padNum, padChrLo);
        }

        // happy hashing
        return hash;
    }


    // formats date according to custom formatting in specs or falls back to a simple YYYY-MM-DD,
    // assumes valid date object is provided
    function formatDate(date, dateFormat) {
        if ((dateFormat || tbl.options.dateFormat) && tbl.DateTime) {
            return tbl.DateTime.fromJSDate(date).toFormat(dateFormat || tbl.options.dateFormat);
        } else {
            return date.toISOString().replace(/T.*/, "");
        }
    }


    // helper function that applies a bitmask to all values in the display[] array
    // needed for resetting rows filtering
    function applyBitmask(mask) {
        let i = tbl.display.length;
        while (i--) {
            tbl.display[i] &= mask;
        }
    }


    // initialize page state using URI fragment identifier as the state source
    function url2state() {

        // initialize 'state' object with possible data coming from the URI fragment identifier
        if (window.location.hash) {

            window.location.hash.substring(1).split("&").forEach(component => {
                const part = component.split("=");
                tbl.state[part[0]] = decodeURIComponent(part[1]);
            });

            if (tbl.state.colgrp) {
                tbl.state.colgrp = tbl.state.colgrp.split(",");
            }
        }

        // initialize filter input
        tbl.html.filterInput.value = tbl.state.filter || "";
    }


    // update URL with current state coming from the 'state' object (strings and arrays values only)
    // normally should be called only when page really changes the view that reflects new state of things
    // 'state' keys with empty string values or empty arrays will not propagate to the URL
    function state2url(newState, replace = false) {

        // extend current state object with the updated information
        Object.assign(tbl.state, newState || {});

        // clear state keys where value has been set to 'undefined'
        Object.keys(newState || {}).filter(key => $typeOf(tbl.state[key]) === "Undefined").forEach(key => delete tbl.state[key]);

        // construct new URL hash
        const hash = Object.keys(tbl.state)
            .filter(key =>
                ($typeOf(tbl.state[key]) === "String" && tbl.state[key] !== "") ||
                ($typeOf(tbl.state[key]) === "Array" && tbl.state[key].length > 0)
            )
            .map(key => ($typeOf(tbl.state[key]) === "String")
                ? key + "=" + encodeURIComponent(tbl.state[key])
                : key + "=" + encodeURIComponent(tbl.state[key].join(",")).replace(/%2C/g, ",")
            ).join("&");

        // store new URL in browser history (i.e., "navigate to new fake URL") if the hash really changed
        if (document.location.hash.substring(1) !== hash) {
            if (replace) {
                history.replaceState(null, $("title").textContent, hash ? ("#" + hash) : ".");
            } else {
                history.pushState(null, $("title").textContent, hash ? ("#" + hash) : ".");
            }
        }
    }


    // splits the text string from the 'input' field into array of recognised filter tokens
    // should correctly identify known tokens even without whitespace in between (where applicable)
    // correctly deals with parameters in double quotes that should be treated as a single token
    // also correctly parses unquoted parameters (that should not contain whitespace)
    // takes the input string as the first argument and two arrays of strings for all possible tokens
    // the wordTokens[] should contain all recognized tokens that start with alphanumeric characters
    // the nonWordTokens should contain all recognized tokens that do NOT start
    // both token arrays must be ordered by token length in the reverse order,
    // i.e. array's zero element should be the longest token and the last element - the shortest
    function getTokens(input, wordTokens = [], nonWordTokens = []) {

        // resulting array of all detected filter tokens
        const tokens = [];

        // check that the supplied token arrays are not empty
        if (wordTokens.length === 0 || nonWordTokens.length === 0) {
            return tokens;
        }

        // prepare three RegExp objects to lookup possible tokens in several different ways
        const regex = {
            words: new RegExp("^\\b\\s*(" + wordTokens.join("|") + ")\\s*\\b", "i"),
            nonWords: new RegExp("^\\s*(\"[^\"]*\"|" + nonWordTokens.join("|") + "|!\\(|NOT\\(|\\)|\\()\\s*"),
            unquoted: /^\s*([^\s()]+)/
        };

        // keep track of the current offset in the input string and the remainder of the string
        let offset = 0;
        let str = input.substring(offset);
        let token, match;

        // repeat, as long as there are any characters remaining to be parsed in the input string
        while (str) {

            // try checking whether current string starts with one of the non-word tokens
            match = str.match(regex.nonWords);

            // if there is a match, consume the token and increase the offset pointer accordingly
            if (match !== null) {
                offset += match[0].length;
                token = match[0].trim();

            // if there was no match above, do more checking
            } else {

                // try checking whether current string starts with a word token or quoted string
                match = str.match(regex.words);

                // if there was a match, consume the token and increase the offset pointer
                if (match !== null) {
                    offset += match[0].length;
                    token = match[0].trim();

                // if there was still no match, it must be some arbitrary unquoted value
                } else {

                    // check for the unquoted value (everything until next whitespace or parenthesis)
                    match = str.match(regex.unquoted);

                    if (match !== null) {
                        offset += match[0].length;
                        token = match[0].trim();

                    // in case the above does not produce valid token, gobble the rest of the string
                    } else if (str) {
                        offset += str.length;
                        token = str.trim();
                    }
                }
            }

            // push newly obtained token into the result array
            tokens.push(token);

            // move the offset pointer along the input string
            str = input.substring(offset);
        }

        // return the resulting array of tokens
        return tokens;
    }


    // converts existing array of tokens (operand, operator, value, ...) into Reverse Polish Notation
    // the output is a rearranged tokens array that takes into account operator precedence
    // the RPN tokens array will be used to apply the actual filtering rules to each table row
    // this function implements a particular case of the Edsger W. Dijkstra's 'Shunting-yard algorithm'
    function tokensToRPN(tokens) {

        // the Shunting-yard algorithm requires a LIFO stack to achieve the result
        const stack = [];
        // also needs a helper function to check the top value in the stack without actual retrieval
        const peek = (x) => x[x.length - 1];

        // loop through the input tokens array using the reduce() JS method
        // returns another array where the final result will be accumulated output
        return tokens.reduce((output, token) => {

            // create uppercase version of the current token
            const tokenUpper = token.toUpperCase();

            // handle the case when the current token is one of the known operators
            if ($hasProp(op, tokenUpper)) {

                while ($hasProp(op, peek(stack)) && op[tokenUpper] <= op[peek(stack)]) {
                    output.push(stack.pop());
                }

                stack.push(tokenUpper);

            // handle the case when the token is one of the parentheses operators
            } else if (token === "(" || token === "!(" || tokenUpper === "NOT(") {
                stack.push(token);

            // handle the case when the token is one of the parentheses operators
            } else if (token === ")") {

                while (peek(stack) !== "(" && peek(stack) !== "!(" && peek(stack) !== "NOT(") {
                    output.push(stack.pop());
                }

                if (stack.pop() !== "(") {
                    output.push("!");
                }

            // this is not an operator, just a simple operand, so put it into result array
            } else {
                output.push(token);
            }

            // proceed to the next loop iteration and next token while accumulating the overall result
            return output;

        // once the loop is over, add the remaining stack contents to the result (in reverse order)
        }, []).concat(stack.reverse());
    }


    // performs the 'dry-run' on the filter expression that should already be in Reverse Polish Notation
    // this serves two purposes: one is to check filter for syntax correctness and report possible errors
    // second is to perform possible conversion of some operands (like RegExp strings or IPs or Dates)
    // this is done to speed-up the filtering process that will be repeated many real data rows
    // the converted values will be written back to the filterRPN[] array that is given as the argument
    // returns boolean 'true' if all is well or 'false' if any of the checks have failed
    function checkFilter(filterRPN) {

        // result will be either Boolean true, or an actual error message String
        let result = true;

        // a LIFO result stack for evaluating the Reverse Polish Notation expression
        const stack = [];

        // loop through each token in the filter expression RPN array and determine the overall result
        // the .every() method will ensure that ALL checks must succeed, otherwise the loop will terminate
        filterRPN.every((token, index) => {

            // operands and their data type will be determined later
            let o1, o2, type;

            // if the current filter token is one of the known operators, check its validity
            if ($hasProp(op, token)) {

                // first get two items from the stack to, hopefully, perform the operation on
                o2 = stack.pop();
                o1 = stack.pop();

                // if one of the operands is missing, then the expression was wrong (syntax error)
                if (o1 === undefined || o2 === undefined) {
                    result = "Filter syntax error (1)";
                    return false;
                } else {

                    // if the 1st operand is NOT the result of previous (nested) operation
                    // and if the 1st operand does not look like it is a valid column key,
                    // then it is a syntax error, i.e. non-existing field name
                    if (o1.idx !== -1 && !tbl.table.has(o1.token)) {
                        result = "Invalid field name: " + o1.token;
                        return false;
                    }

                    // if the 2nd operand starts with a double quote, it is assumed it ends with it too
                    // the quotes are dropped and the operand value in the RPN filter expression is updated
                    if (String(o2.token).charAt(0) === "\"") {
                        o2.token = o2.token.substring(1, o2.token.length - 1);
                        filterRPN[o2.idx] = o2.token;
                    }

                    // if the operator is straight comparison, the 2nd operand should be converted to uppercase
                    // this is due to the case-insensitive comparison promise that shall be kept
                    if (token === "==" || token === "=" || token === "!=") {
                        filterRPN[o2.idx] = String(o2.token).toUpperCase();

                    // if the operator does regex matching, the 2nd operand is assumed to be a user supplied regex
                    // the 2nd operand has to be converted to JS RegExp object to be reused during actual filtering
                    // if the conversion fails due to bad RegExp syntax, then it is a full stop here
                    } else if (token === "~" || token === "!~") {
                        try {
                            o2.regexp = new RegExp(o2.token, "i");
                        } catch (e) {
                            result = "Invalid regular expression: " + o2.token;
                            return false;
                        }
                        filterRPN[o2.idx] = o2.regexp;

                    // 'greater/less than' comparison is by far the most 'interesting' operator
                    // each data type requires different approach for comparing values so there is a lot of 'if' here
                    } else if (token === "<" || token === ">") {

                        // determine the data type by looking at the first operand
                        type = tbl.table.get(o1.token).type || "str";

                        // for the 'ip' data type the comparison shall be done using long int representation
                        // the 2nd operand shall be converted, therefore, and the RPN expression updated
                        if (type === "ip") {

                            o2.value = ip2long(o2.token);

                            if (!o2.value) {
                                result = "Bad IP address: " + o2.token;
                                return false;
                            } else {
                                filterRPN[o2.idx] = o2.value;
                            }

                        // if the data type is 'date', the 2nd operand needs to be Unix Time obtained from 'YYYY-MM-DD' string
                        } else if (type === "date") {

                            // first check the validity of the user supplied date string generally speaking
                            if (!String(o2.token).match(/^\d{4}-\d{2}-\d{2}$/)) {
                                result = "Bad date format (use YYYY-MM-DD): " + o2.token;
                                return false;
                            }

                            // then try and convert the 2nd operand into the JavaScript date object and get its Unix Time
                            o2.value = new Date(String(o2.token) + "T12:00:00Z").getTime();

                            // check the allowed range for the supplied date that should be a valid integer and a sane value
                            if (!o2.value || o2.value < 934366740000 || o2.value > 2147483647000) {
                                result = "Unsupported date: " + o2.token;
                                return false;
                            }

                            // update the RPN expression with the converted value
                            filterRPN[o2.idx] = o2.value;

                        // for numeric types the 2nd operand should simply be whatever parseFloat() returns (or zero if NaN)
                        } else if (type === "num" || type === "range") {
                            filterRPN[o2.idx] = parseFloat(o2.token) || 0;

                        // version shall be compared as a hash
                        } else if (type === "ver") {
                            filterRPN[o2.idx] = ver2hash(o2.token);

                        // strings shall be compared case insensitive, so get the uppercase version of the string
                        } else if (type === "str") {
                            filterRPN[o2.idx] = String(o2.token).toUpperCase();
                        }

                    // if the operator is a special 'IP belongs to subnet', the 2nd operand needs to converted to longint
                    } else if (token === "@=") {

                        // first make sure that the filed type is actually 'ip' because the @= operator cannot be used otherwise
                        if (tbl.table.get(o1.token).type !== "ip") {
                            result = "@= operator can only be used with IP-like fields";
                            return false;

                        // do the same routine as above for '< >' operator and 'ip' data type
                        } else {

                            o2.value = ip2long(o2.token);

                            if (!o2.value) {
                                result = "Bad IP address: " + o2.token;
                                return false;
                            } else {
                                filterRPN[o2.idx] = o2.value;
                            }
                        }
                    }

                    // no real operation will be done because the actual result does not matter during dry run
                    // push value placeholder into the stack in case it is needed for nested filters with AND/OR/() operators
                    stack.push({token: "", idx: -1});
                }

            // if it is a known unary operator, like "NOT(" or "!(", then check for a single operand
            } else if (token === "!") {

                o1 = stack.pop();

                // if the operand is missing, then the expression was wrong (syntax error)
                if (o1 === undefined) {
                    result = "Filter syntax error (2)";
                    return false;
                }

                // no real operation will be done because the actual result does not matter during dry run
                // push value placeholder into the stack in case it is needed for nested filters with AND/OR/() operators
                stack.push({token: "", idx: -1});

            } else {

                // if the current filter token is not an operator, then it is an operand
                // keep it in stack for now and use it later, when an actual operator is encountered
                stack.push({token: token, idx: index});
            }

            // if nothing broke so far, proceed to the next filter token
            return true;
        });


        // if the 'result' is still 'true' (as set at the very beginning of this function),
        // it means all the checking until now was successful; but there is one more thing to verify:
        // there should be precisely one item in the stack, not less, not more
        if (result === true && stack.length !== 1) {
            result = "Filter syntax error (3)";
        }

        return result;
    }


    // performs actual data filtering using the filter expression in the Reverse Polish Notation
    // loops through the display[] array and checks each matching data row against filter expression
    // if filter expression returns 'true' then the control bit of the value is unset, otherwise it is set
    // the tables rows with the IDs from the display[] array with one of the control bits set will not be rendered
    function runFilter(filterRPN, controlBit) {

        // result will be either Boolean true, or an actual error message String
        let result = true;

        // resolving expression in RPN notation requires a LIFO helper stack
        const stack = [];

        // loop through each display[] array item but stop if at least one error is encountered
        // this is ensured by the .every() method that will break the loop if the callback returns false
        tbl.display.every((rowID, key) => {

            // reset the helper LIFO stack
            stack.length = 0;

            // unset the control bits in the rowID (might be there from previous filtering run)
            rowID &= clearBothBits;

            // apply filtering expression to the current data row by looping through each filter token
            filterRPN.forEach(token => {

                // operands and result of the operation will be determined later
                let o1, o2, res;

                // if the current filter token is one of the known operators, perform that operation
                if ($hasProp(op, token)) {

                    // to perform the operation two operands are required, so get them from the stack
                    // it is already been ensured by checkFilter() that there must be at least two items available
                    o2 = stack.pop();
                    o1 = stack.pop();

                    // act according to the requested operator
                    // o2 (operand #2) should already be set to correct value
                    // o1 (operand #1) is the name of the column key at this stage
                    // so the actual o1 value needs to be pulled out of the data[] array using current rowID
                    // the 'flavour' of the data value (text, number, ...) depends on the operator
                    if (token === "=" || token === "==") {
                        res = (tbl.data[rowID][o1].match === o2);

                    } else if (token === "!=") {
                        res = (tbl.data[rowID][o1].match !== o2);

                    } else if (token === "~") {
                        res = o2.test(String(tbl.data[rowID][o1].match));

                    } else if (token === "!~") {
                        res = ! o2.test(String(tbl.data[rowID][o1].match));

                    } else if (token === "@=") {
                        res = (tbl.data[rowID][o1].cmpMin === ((o2 & tbl.data[rowID][o1].mask) >>> 0));

                    } else if (token === "<") {
                        if ($hasProp(tbl.data[rowID][o1], "cmpMax")) {
                            o1 = tbl.data[rowID][o1].cmpMax;
                        } else {
                            o1 = tbl.data[rowID][o1].cmp;
                        }
                        res = (o1 < o2);

                    } else if (token === ">") {
                        if ($hasProp(tbl.data[rowID][o1], "cmpMin")) {
                            o1 = tbl.data[rowID][o1].cmpMin;
                        } else {
                            o1 = tbl.data[rowID][o1].cmp;
                        }
                        res = (o1 > o2);

                    } else if (token === "AND") {
                        res = (o1 & o2);

                    } else if (token === "OR") {
                        res = (o1 | o2);
                    }

                    // push the result of the operation into the stack to be used later again
                    stack.push(res);

                } else if (token === "!") {
                    o1 = stack.pop();
                    stack.push(!o1);

                // if the current filter token is not an operator, then it is an operand
                // keep it in stack for now and use it later, when an actual operator is encountered
                } else {
                    stack.push(token);
                }
            });

            // there should be exactly one item in the stack, i.e., the result of filtering for this row
            if (stack.length === 1) {

                // if the result is 'true', the control bit of the row ID shall be unset, otherwise it is set
                tbl.display[key] = stack.pop()
                    ? tbl.display[key] & ~controlBit
                    : tbl.display[key] | controlBit;

                // filtering of the current row is finished now, nothing is broken, so go ahead to next row
                return true;

            // if there were more (or less) than 1 items in the stack, something went wrong with RPN
            } else {
                result = "Filter syntax error (4)";
                return false;
            }
        });

        // return either Boolean true or a String (error message)
        return result;
    }


    // handle the complete process of data rows filtering with the filter string given as a parameter
    // returns boolean value where 'false' means filter parsing/usage error or 'true' in case of success
    // the main task here is to modify the display[] array that will be used to redraw the filtered table
    function filterData(filter, controlBit) {

        // assume nothing is going to happen if conditions are not met
        let result = false;

        // proceed if the input string is not empty
        if (filter !== "") {

            // if there was never words token list generated before, do it now (once only, for the app lifetime)
            if (filterTokens.word.length === 0) {

                // loop through the specs entries and pick all the column 'key' identifiers
                filterTokens.word = [...tbl.table.keys()]
                    // append word-like operators to that list of 'keys' (i.e. 'AND' and 'OR' operators)
                    .concat(Object.keys(op).filter(token => token.match(/^[a-z]/i)))
                    // sort the complete list in the order of descending token length
                    .sort((a, b) => {
                        const x = a.length, y = b.length;
                        return (x > y ? -1 : (x < y ? 1 : 0));
                    });
            }

            // if there was never a non-words token list generated before, do it now (once only)
            if (filterTokens.nonWord.length === 0) {

                // from the operators list pick only those operators that are not word-like
                filterTokens.nonWord = Object.keys(op).filter(token => !token.match(/^[a-z]/i))
                    // sort the list in the order of descending token length
                    .sort((a, b) => {
                        const x = a.length, y = b.length;
                        return (x > y ? -1 : (x < y ? 1 : 0));
                    });
            }

            // try to parse the input filter string into valid tokens using the known token lists
            const tokens = getTokens(filter, filterTokens.word, filterTokens.nonWord);

            // if the string was parsed into at least 3 tokens then there might be a valid filter expression
            if (tokens && tokens.length > 2) {

                // try and convert the current tokens list into Reverse Polish Notation
                const filterRPN = tokensToRPN(tokens);

                // perform a dry-run on the tokenized filter to check for possible errors before filtering
                // result will be either Boolean true or a String (error message)
                result = checkFilter(filterRPN);

                // if the syntax was correct run actual filtering routine on all table rows and return its result
                if (result === true) {
                    // result will be either Boolean true or a String (error message)
                    result = runFilter(filterRPN, controlBit);
                }
            }
        }

        return result;
    }


    // perform row filtering routine on table data and re-render table, when appropriate
    function filterRows(event = {target: {}}) {

        // get the current filter text from the 'input' HTML element
        const filter = tbl.html.filterInput.value.trim();

        // fire the pre-filtering custom callback
        if ($typeOf(tbl.callback.preFilter) === "Function") {
            tbl.callback.preFilter(tbl);
        }

        // try applying the filter to the display[] array
        const filterResult = filterData(filter, setFilterBit);

        // if filtering was successful, proceed with repainting the table
        if (filterResult === true) {

            // fire the post-filtering custom callback
            if ($typeOf(tbl.callback.postFilter) === "Function") {
                tbl.callback.postFilter(tbl);
            }

            // change page state only if the event came from actual button click
            if (event.composed) {

                // modify the URL in the browser address bar to reflect current filter
                state2url({filter: filter});

                // reset error message placeholder
                tbl.html.filterError.setAttribute("hidden", "");

                // if applying the filter succeeded (i.e. filter syntax was OK)
                // then re-render table body using updated display[] array
                render("filter");
            }

        // if the returned value is a string, it must be the error message, so display it
        } else if ($typeOf(filterResult) === "String") {
            tbl.html.filterError.innerHTML = escapeHtml(filterResult);
            tbl.html.filterError.removeAttribute("hidden");
        }
    }


    // clicking on any table cell should auto create filters by using information about column and cell value
    // also takes into account if SHIFT or CTRL key was pressed to allow multiple AND / OR conditions
    function createFilter(event = {target: {}}) {

        // check that the event was triggered on the actual table cell (vs link inside a table cell)
        if (event.target.localName !== "td") {
            return;
        }

        // determine field 'key' from the 'specs' by using the index of the target view column
        const field = [...tbl.render.view.keys()][event.target.cellIndex];

        // determine the actual value held in the table cell
        const value = event.target.textContent;

        // check the value for presence of whitespace and other operator-like characters
        const quote = (!value || value.match(/[\s<>()!=~@]/)) ? "\"" : "";

        // if the value contained special characters then use quotes around it
        const filter = field + (event.altKey ? " ~ " : " = ") + quote + value + quote;

        // if there was a CTRL key pressed during mouse click, append filter part with the AND condition
        if (event.ctrlKey) {
            tbl.html.filterInput.value = tbl.html.filterInput.value + (tbl.html.filterInput.value ? " AND " : "") + filter;

        // if there was a SHIFT key pressed during mouse click, append filter part with the OR condition
        } else if (event.shiftKey) {
            tbl.html.filterInput.value = tbl.html.filterInput.value + (tbl.html.filterInput.value ? " OR " : "") + filter;

        // if this was an ordinary mouse click, then replace current filter value with the new one
        } else {
            tbl.html.filterInput.value = filter;
        }

        // hide error message placeholder
        tbl.html.filterError.setAttribute("hidden", "");
    }


    // reset all filtering and update table view accordingly
    function clearFilter() {

        // clear current filter value in the HTML 'input' element
        tbl.html.filterInput.value = "";

        // reset error message placeholder
        tbl.html.filterError.setAttribute("hidden", "");

        // remove 21st bit from every value in the display[] array to indicate 'no filtering'
        applyBitmask(clearFilterBit);

        // update global state
        state2url({filter: undefined});

        // fire the clear-filtering custom callback
        if ($typeOf(tbl.callback.clearFilter) === "Function") {
            tbl.callback.clearFilter(tbl);
        }

        // re-render table body
        render("filter");
    }


    // perform column sorting routine on table data and re-render table, when appropriate
    function sortColumn(event) {

        // determine column index and column data key, also set the default sort order
        const colIdx = event.target.cellIndex;
        const colKey = [...tbl.render.view.keys()][colIdx];

        let order = "asc";

        // if this was true mouse click on table header (and not a triggered/simulated event handler)
        if (event.composed) {

            // clear relevant CSS classes from previously sorted column (if such column existed)
            $$("th." + tbl.cssClass.sortAsc + ", th." + tbl.cssClass.sortDesc, tbl.html.thead)
                .forEach($th => $th.classList.remove(tbl.cssClass.sortAsc, tbl.cssClass.sortDesc));

            // figure out new sorting order (depends if the same column was sorted-by previously or not)
            if (tbl.state.sort && tbl.state.sort === colKey) {
                order = tbl.state.order === "asc" ? "desc" : "asc";
            }

        // if this was a simulated click event (due to new page load with pre-existing state)
        } else if (event.detail === "asc" || event.detail === "desc") {

            order = event.detail;
        }

        Object.assign(tbl.render, {sortColIdx: colIdx, sortColKey: colKey, sortOrder: order});

        // fire user-defined pre-sorting callback
        if ($typeOf(tbl.callback.preSort) === "Function") {
            tbl.callback.preSort(tbl);
        }

        // assign new CSS class to the current column depending on the sort order
        event.target.classList.add(order === "asc" ? tbl.cssClass.sortAsc : tbl.cssClass.sortDesc);

        // sort the display[] array using the callback function that will determine new order
        tbl.display.sort((a, b) => {

            // clear all filtering bits (operate on all rows, ignoring filtering)
            a &= clearBothBits;
            b &= clearBothBits;

            // if the data type has 'min/max' representation (range), use those for comparison
            if ($hasProp(tbl.data[a][colKey], "cmpMin")) {

                // for ascending direction use min values for port ranges
                if (order === "asc") {
                    a = tbl.data[a][colKey].cmpMin;
                    b = tbl.data[b][colKey].cmpMin;
                // for descending direction use max values for port ranges
                } else {
                    a = tbl.data[a][colKey].cmpMax;
                    b = tbl.data[b][colKey].cmpMax;
                }

            // otherwise, compare according to data type
            } else {
                a = tbl.data[a][colKey].cmp;
                b = tbl.data[b][colKey].cmp;
            }

            // compare values corresponding to the current sort direction
            if (order === "asc") {
                return (a > b) ? 1 : ((a < b) ? -1 : 0);
            } else {
                return (b > a) ? 1 : ((b < a) ? -1 : 0);
            }
        });

        // fire user-defined post-sorting callback
        if ($typeOf(tbl.callback.postSort) === "Function") {
            tbl.callback.postSort(tbl);
        }

        // change page state only if the event came from actual column header click
        if (event.composed) {

            // modify the URL in the browser address bar to reflect current sort field and sort order
            state2url({sort: colKey, order: order});

            // redraw table body because the order of rows might have changed
            render("sort");
        }
    }


    // creates a 'tab-separated CSV-like' text document that is served to the client
    // simulates file download behaviour that forces browser to download a text file
    function exportData() {

        // first get the list of header cells that are currently visible
        const visibleCols = Array
            .from($$("th", tbl.html.thead))
            .filter(el => el.offsetHeight || el.offsetWidth);

        // create header row out of the header cells that are currently visible
        const headerRow = visibleCols.map(el => el.innerText).join(CSVfieldSeparator);

        // iterate through each row and filter our hidden rows
        // then, for each row iterate through the list of cells as per 'visibleCols' above
        // return tab separated text values (obtained from .html representation) joined into rows
        const bodyRows = tbl.display
            .filter(rowID => !(rowID & renderBits))
            .map(rowID => visibleCols
                .map(el => html2text(tbl.data[rowID][el.title].html || ""))
                .join(CSVfieldSeparator)
            ).join(CSVrecordSeparator);

        // construct final payload for downloading
        const exportedData = headerRow + CSVrecordSeparator + bodyRows;

        // simulate file download behaviour using 'Data URL' browser feature
        $exportHelper.href = "data:text/csv," + encodeURIComponent(exportedData);
        $exportHelper.download = "export.txt";
        $exportHelper.dispatchEvent(new MouseEvent("click", {bubbles: true, cancelable: true}));
    }


    // check if a partial or full column set needs to be displayed using 'view' property defined in global state,
    // use view rules from specs, including the 'default' view that should be displayed when no view is chosen
    function applyView() {

        tbl.render.view = null;

        // check if a 'view', i.e., a set of columns, has to be displayed
        if (tbl.views) {

            // if no view was selected, check if default view is defined and if it is, then choose it instead
            if (!tbl.state.view && tbl.views.default && tbl.views[tbl.views.default]) {
                state2url({view: tbl.views.default}, true); // 'true' causes History.replaceState()
            }

            // check if the view exists (and is not 'full') and is an array; if so construct new array of table columns
            if (tbl.state.view && tbl.state.view !== "full" && $typeOf(tbl.views[tbl.state.view]?.cols) === "Map") {
                tbl.render.view = tbl.views[tbl.state.view].cols;
            }
        }

        if (tbl.render.view === null || !tbl.views[tbl.state.view]?.rows) {
            applyBitmask(clearViewBit);
        } else {
            filterData(tbl.views[tbl.state.view].rows, setViewBit);
        }

        // if no special view is selected, use the complete table definition
        if (tbl.render.view === null) {
            tbl.render.view = new Map(tbl.table);
        }

        // check if colGroups feature is on, reduce column set according to the 'colgroup' property in global state
        if (tbl.options.colGroups === true) {

            if (!Array.isArray(tbl.state.colgrp)) {
                tbl.state.colgrp = [];
            }

            // a special value "all" means that no column reduction should take place
            // a special value of "none" means that
            if (tbl.state.colgrp[0] !== "all") {

                // remove columns that shouldn't be shown due to the current colGroup layout
                [...tbl.render.view.keys()].forEach(column => {

                    const colGroup = tbl.render.view.get(column).colGroup;

                    if ((colGroup && !tbl.state.colgrp.includes(colGroup)) || (tbl.state.colgrp[0] === "none" && colGroup)) {
                        tbl.render.view.delete(column);
                    }
                });
            }
        }

        // hide the columns that must always stay concealed due to their possible 'hidden' attribute
        [...tbl.render.view.keys()].forEach(column => {

            if (tbl.render.view.get(column).hidden === true) {
                tbl.render.view.delete(column);
            }

        });
    }


    // triggers the routine to completely redraw the table with a different view (i.e. some columns hidden)
    // it is expected that the 'spec' would be an object with properties like {"view": ..., "cols": ...}
    function updateView(spec) {

        const newState = {};

        let viewChanged = false;

        // assign new view (if given)
        if ($hasProp(spec, "view")) {

            newState.view = spec.view ? spec.view : undefined;

            if (tbl.state.view !== newState.view) {

                viewChanged = true;

                if ($hasProp(spec, "filter")) {
                    tbl.state.filter = spec.filter;
                }
            }
        }

        // assign new colGroup list (if given)
        if (tbl.options.colGroups === true) {

            newState.colgrp = (Array.isArray(spec.colgrp) && spec.colgrp.length > 0)
                ? spec.colgrp
                : undefined;

            if (tbl.state.colgrp !== newState.colgrp) {
                viewChanged = true;
            }
        }

        // if there is something to change in the current view, then change it
        if (viewChanged) {
            state2url(newState);
            render("view");
        }
    }


    // create main table's header HTML code and custom CSS styles that apply to each column
    // using the data from the 'specs' that defines the order of columns with optional 'views' and CSS rules
    function renderHeader() {

        // iterate through the specs and build the table header HTML
        const thead = "<tr>" + Array.from(tbl.render.view, ([key, prop]) =>
            "<th title=\"" + escapeHtml(key) + "\"" +
                (prop.cssClass.length ? " class=\"" + prop.cssClass.join(" ") + "\"" : "") + ">" +
                escapeHtml(prop.header || key) + "</th>"
        ).join("") + "</tr>";

        // inject the table header HTML into the actual table
        tbl.html.thead.innerHTML = thead;

        // if table sorting is enabled in the global settings, assign table header handlers
        if (tbl.options.sort !== false) {

            // apply the appropriate CSS class to the table
            tbl.html.table.classList.add(tbl.cssClass.sortable);

            // register handler for the 'click' event on every table header element
            $$("th", tbl.html.thead).forEach(el => el.addEventListener("click", sortColumn));
        }
    }


    // prepare all HTML code needed for rendering table rows using the data array
    // this basically acts as a HTML 'cache' so that the renderBody() can rely on it every time
    function preRenderBody() {

        // loop through each data row
        tbl.data.forEach(row => {

            // loop through each column in the current view
            const cellsHTML = Array.from(tbl.render.view, ([key, prop]) => {

                // the final CSS classes list for a cell is a join of 'specs' and custom list from 'data'
                const cssClasses = [...prop.cssClass, ...row[key].cssClass].join(" ").trim();

                // return the complete HTML row <td>...</td> as a string to be joined later into final HTML code
                return "<td" + (cssClasses ? " class=\"" + cssClasses + "\"" : "") + ">" + row[key].html + "</td>";

            }).join("");

            // assign the entire row HTML (<tr><td>...</td></tr>) to each row in the 'data' array
            const rowCssClasses = row._row.cssClass.join(" ").trim();
            row._row.html = "<tr" + (rowCssClasses ? " class=\"" + rowCssClasses + "\"" : "") + ">" + cellsHTML + "</tr>";
        });
    }


    // apply filtering, sorting and optional custom transformations to data using current 'state'
    // (useful for initial page load, change of views and during back/forward navigation)
    function applyState() {

        // if there is a filter present, it needs to be applied
        if (tbl.state.filter) {
            filterRows();
        }

        // if there is sorting to be done, do it on the appropriate column
        if (tbl.state.sort) {

            // check if sorted column is declared (sanity checking for column name)
            const colIndex = [...tbl.render.view.keys()].findIndex(col => col === tbl.state.sort);

            if (colIndex > -1) {

                const $th = $("th:nth-child(" + (colIndex + 1) + ")", tbl.html.thead);

                // when changing the view but keeping sorting by column,
                // it can happen that the column is gone, therefore sort only real columns
                if ($th) {
                    sortColumn({target: $th, detail: tbl.state.order});
                }
            }
        }

        // fire custom callback
        if ($typeOf(tbl.callback.applyState) === "Function") {
            tbl.callback.applyState(tbl);
        }
    }


    // create main table's body HTML code using the following components:
    //    - display[] array as the guide (what rows should be displayed and in what order)
    //    - data[] array as the source of the actual data to be placed in table rows
    function renderBody() {

        // filter out only those rows where the "skip render" bits are unset for their rowID,
        // meaning that only the rows passing the current filter should be displayed
        const visibleRows = tbl.display.filter(rowID => !(rowID & renderBits));

        // loop through the visible rows and use the pre-rendered HTML from the _row.html property
        // to inject the resulting long HTML string into the actual DOM
        tbl.html.tbody.innerHTML = visibleRows.map(rowID =>tbl.data[rowID]._row.html).join("\n");

        // keep track of useful stats
        Object.assign(tbl.render, {rowsCount: visibleRows.length});
    }


    // handle table redrawing (partial or full depending on what event triggers it)
    function render(trigger) {

        // assign the current reason for table redrawing to the render property
        // because it could also be used by custom callbacks
        Object.assign(tbl.render, {trigger});

        // fire custom callback
        if ($typeOf(tbl.callback.preRender) === "Function") {
            tbl.callback.preRender(tbl);
        }

        if (trigger !== "filter" && trigger !== "sort" && trigger !== "partialNavigation") {

            // decide what part of a table should be displayed
            applyView();

            // fire a custom handler after the table has been redrawn
            if ($typeOf(tbl.callback.applyView) === "Function") {
                tbl.callback.applyView(tbl);
            }

            // output HTML table header using the data from 'specs'
            renderHeader();

            // prepare all table body HTML for future (re-)rendering
            preRenderBody();
        }

        if (trigger !== "filter" && trigger !== "sort") {
            // all data has been initialized, including the idea about its filtering/sorting state, so apply it now
            applyState();
        }

        // draw data table with all its state applied
        renderBody();

        // fire custom callback
        if ($typeOf(tbl.callback.postRender) === "Function") {
            tbl.callback.postRender(tbl);
        }
    }


    // the data for the table cell may come from 'untrusted' source and in somewhat 'relaxed' format
    // it needs to be normalized using: a) 'specs' b) common sense  c) some JavaScript types voodoo
    function normalizeValue(row, col, colSpec) {

        // check if supplied value is already an object
        if ($typeOf(row[col]) === "Object") {

            // if .value was not provided but .html was, convert 'html' to 'value'
            if (!$hasProp(row[col], "value") &&
                    $hasProp(row[col], "html") &&
                    $typeOf(row[col].html) === "String") {
                row[col].value = html2text(row[col].html);
            }

        // if a 'shorthand' syntax was used to supply initial value
        // (i.e. just the value given directly not embedded inside an object),
        // re-create current cell's data as an object with a single .value property
        } else {
            row[col] = {value: row[col]};
        }

        // use shortcuts to get to most commonly used properties and values
        const cell = row[col];
        cell.type = $typeOf(cell.value);

        // normalize cssClass into array (if not already)
        value2array(cell, "cssClass");

        // create colGroup-like CSS classes
        if (colSpec.colGroup) {
            cell.cssClass.push("-smartable-colgrp-" + String(colSpec.colGroup));
        }

        // process 'num' data type
        if (colSpec.type === "num") {

            // check if the actually supplied value is true 'numeric'
            if (cell.type === "Number" && !isNaN(cell.value)) {

                if (!$hasProp(cell, "html") || $typeOf(cell.html) !== "String") {
                    cell.html = cell.value.toString();
                }

                if (!$hasProp(cell, "cmp") || $typeOf(cell.cmp) !== "Number" || isNaN(cell.cmp)) {
                    cell.cmp = cell.value;
                }

                if (!$hasProp(cell, "match") || $typeOf(cell.match) !== "String") {
                    cell.match = cell.value.toString().toUpperCase();
                }

            // last chance for a string to become a number
            } else if (cell.type === "String") {

                if (!isNaN(cell.value)) {
                    cell.html = parseFloat(cell.value).toString();
                    cell.cmp = parseFloat(cell.value);
                    cell.match = cell.cmp;
                } else {
                    cell.html = escapeHtml(cell.value);
                    cell.cmp = Number.NEGATIVE_INFINITY;
                    cell.match = html2text(cell.html).toUpperCase();
                    cell.cssClass.push(tbl.cssClass.badValue);
                }

            // the value is 'bad' (non-scalar type, null, undefined, etc.)
            } else {
                cell.html = undefined;
                cell.cmp = Number.NEGATIVE_INFINITY;
                cell.match = undefined;
            }

        // process 'range' data type
        } else if (colSpec.type === "range") {

            // check if the actually supplied value is true 'numeric'
            // in which case the 'range' is simply a single numeric value
            if (cell.type === "Number" && !isNaN(cell.value)) {

                if (!$hasProp(cell, "html") || $typeOf(cell.html) !== "String") {
                    cell.html = cell.value.toString();
                }

                if (!$hasProp(cell, "cmpMin") || $typeOf(cell.cmpMin) !== "Number" || isNaN(cell.cmpMin)) {
                    cell.cmpMin = cell.value;
                }

                if (!$hasProp(cell, "cmpMax") || $typeOf(cell.cmpMax) !== "Number" || isNaN(cell.cmpMax)) {
                    cell.cmpMax = cell.value;
                }

                if (!$hasProp(cell, "match") || $typeOf(cell.match) !== "String") {
                    cell.match = cell.value.toString().toUpperCase();
                }


            // normally a 'range' would be represented by a properly formatted string
            // where two positive integers are separated by non-numeric characters
            } else if (cell.type === "String") {

                const intrangeRegex = RegExp("([0-9]+)([^0-9]+([0-9]+))?");
                const matches = intrangeRegex.exec(cell.value);

                if (matches !== null) {
                    const rangeMin = parseInt(matches[1]);
                    const rangeMax = matches[3] !== undefined ? parseInt(matches[3]) : rangeMin;

                    if (!$hasProp(cell, "html") || $typeOf(cell.html) !== "String") {
                        cell.html = escapeHtml(cell.value);
                    }

                    if (!$hasProp(cell, "cmpMin") || $typeOf(cell.cmpMin) !== "Number" || isNaN(cell.cmpMin)) {
                        cell.cmpMin = rangeMin;
                    }

                    if (!$hasProp(cell, "cmpMax") || $typeOf(cell.cmpMax) !== "Number" || isNaN(cell.cmpMax)) {
                        cell.cmpMax = rangeMax;
                    }

                    if (!$hasProp(cell, "match") || $typeOf(cell.match) !== "String") {
                        cell.match = cell.value.toUpperCase();
                    }

                // the value does not look like a correctly formatted range string
                } else {
                    cell.html = escapeHtml(cell.value);
                    cell.cmpMin = Number.NEGATIVE_INFINITY;
                    cell.cmpMax = Number.NEGATIVE_INFINITY;
                    cell.match = html2text(cell.html).toUpperCase();
                    cell.cssClass.push(tbl.cssClass.badValue);
                }

            // the value is 'bad' (non-scalar type, null, undefined, etc.)
            } else {
                cell.html = undefined;
                cell.cmpMin = Number.NEGATIVE_INFINITY;
                cell.cmpMax = Number.NEGATIVE_INFINITY;
                cell.match = undefined;
            }

        // process 'ip' data type
        } else if (colSpec.type === "ip") {

            // normally an 'ip' would be represented by a properly formatted string
            // either in 'x.x.x.x' form or 'x.x.x.x /x' or 'x.x.x.x /x.x.x.x'
            if (cell.type === "String") {

                if (!$hasProp(cell, "html") || $typeOf(cell.html) !== "String") {
                    cell.html = escapeHtml(cell.value);
                }

                if (!$hasProp(cell, "match") || $typeOf(cell.match) !== "String") {
                    cell.match = html2text(cell.html).toUpperCase();
                }

                // good luck deciphering this one... ( it is basically what is stated above about the expected IP/MASK string formatting)
                const intrangeRegex = RegExp("(\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}(?!\\d))(\\s*\\/((\\d{1,3})(\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3})?)?)?");
                const matches = intrangeRegex.exec(cell.value);
                const ipAddr = (matches !== null) ? ip2long(matches[1]) : 0;
                const maskStr = (matches !== null && matches[3] !== undefined) ? matches[3] : "32";
                const ipMask = maskStr.includes(".") ? ip2long(maskStr) : cidr2long(parseInt(maskStr));

                if (!$hasProp(cell, "cmpMin") || $typeOf(cell.cmpMin) !== "Number" || isNaN(cell.cmpMin)) {
                    cell.cmpMin = (ipAddr & ipMask) >>> 0;
                }

                if (!$hasProp(cell, "cmpMax") || $typeOf(cell.cmpMax) !== "Number" || isNaN(cell.cmpMax)) {
                    cell.cmpMax = (ipAddr | ~ipMask) >>> 0;
                }

                if (!$hasProp(cell, "mask") || $typeOf(cell.cmpMax) !== "Number" || isNaN(cell.mask)) {
                    cell.mask = ipMask;
                }

                // the value does not look like a correctly formatted IP string
                if (!ipAddr) {
                    cell.cssClass.push(tbl.cssClass.badValue);
                }

            // the value is 'bad' (non-string or non-scalar type, null, undefined, etc.)
            } else {
                cell.html = undefined;
                cell.cmpMin = Number.NEGATIVE_INFINITY;
                cell.cmpMax = Number.NEGATIVE_INFINITY;
                cell.match = undefined;
            }

        // process 'date' data type
        } else if (colSpec.type === "date") {

            // if JavaScript Date object is given, have it as is,
            // if a number is given, treat it as Unix time stamp (allow both seconds or milliseconds)
            if ((cell.type === "Date" && !isNaN(cell.value)) || (cell.type === "Number" && cell.value > 0)) {

                // get date object (if needed, convert Unix timestamp)
                const date = (cell.type === "Date")
                    ? cell.value
                    // assume Unix time stamp in seconds if the numeric value is reasonably low
                    : (new Date((cell.value < 10000000000) ? cell.value * 1000 : cell.value));

                if (!$hasProp(cell, "html") || $typeOf(cell.html) !== "String") {
                    cell.html = escapeHtml(formatDate(date, colSpec.dateFormat));
                }

                if (!$hasProp(cell, "cmp") || $typeOf(cell.cmp) !== "Number" || isNaN(cell.cmp)) {
                    cell.cmp = date.getTime();
                }

                if (!$hasProp(cell, "match") || $typeOf(cell.match) !== "String") {
                    cell.match = html2text(cell.html).toUpperCase();
                }

            // if a string is given, try and treat it as an ISO 8601 formatted date string
            } else if (cell.type === "String") {

                const date = new Date(isoDateRE.test(cell.value) ? (cell.value + "T12:00:00Z") : cell.value);

                // if date formatting wasn't OK
                if (isNaN(date)) {

                    if (!$hasProp(cell, "html") || $typeOf(cell.html) !== "String") {
                        cell.html = escapeHtml(cell.value);
                    }

                    cell.cmp = 0;
                    cell.cssClass.push(tbl.cssClass.badValue);

                // if date string got converted to a native JS Date object, treat it as such
                } else {

                    if (!$hasProp(cell, "html") || $typeOf(cell.html) !== "String") {
                        cell.html = escapeHtml(formatDate(date, colSpec.dateFormat));
                    }

                    if (!$hasProp(cell, "cmp") || $typeOf(cell.cmp) !== "Number" || isNaN(cell.cmp)) {
                        cell.cmp = date.getTime();
                    }
                }

                if (!$hasProp(cell, "match") || $typeOf(cell.match) !== "String") {
                    cell.match = html2text(cell.html).toUpperCase();
                }

            // the value is 'bad' (non-string or non-scalar type, null, undefined, etc.)
            } else {
                cell.cmp = 0;
                cell.match = undefined;
                cell.html = undefined;
            }

        // process 'ver' data type
        } else if (colSpec.type === "ver") {

            // check if the actually supplied value is string or a positive number
            if (cell.type === "String" || (cell.type === "Number" && cell.value > 0)) {

                if (!$hasProp(cell, "html") || $typeOf(cell.html) !== "String") {
                    cell.html = escapeHtml(cell.value);
                }

                if (!$hasProp(cell, "cmp") || $typeOf(cell.cmp) !== "String") {
                    cell.cmp = ver2hash(cell.value);
                }

                if (!$hasProp(cell, "match") || $typeOf(cell.match) !== "String") {
                    cell.match = html2text(cell.html).toUpperCase();
                }

            // the value is 'bad' (non-scalar type, null, undefined, etc.)
            } else {
                cell.cmp = "";
                cell.match = undefined;
                cell.html = undefined;
            }

        // fallback to 'str' data type
        // (in case some weird/unknown type was given in 'specs' for a column)
        } else {

            // check if the actually supplied value is a string
            if (cell.type === "String") {

                if (!$hasProp(cell, "html") || $typeOf(cell.html) !== "String") {
                    cell.html = escapeHtml(cell.value);
                }

                if (!$hasProp(cell, "cmp") || $typeOf(cell.cmp) !== "String") {
                    cell.cmp = cell.value.toUpperCase();
                }

                if (!$hasProp(cell, "match") || $typeOf(cell.match) !== "String") {
                    cell.match = html2text(cell.html).toUpperCase();
                }

            // last chance for a sane numeric / boolean value to become a string
            } else if ((cell.type === "Number" && !isNaN(cell.value)) || cell.type === "Boolean") {
                cell.html = escapeHtml(cell.value.toString());
                cell.cmp = cell.value.toString().toUpperCase();
                cell.match = cell.cmp;

            // the value is 'bad' (non-scalar type, null, undefined, etc.)
            } else {
                cell.cmp = "";
                cell.match = undefined;
                cell.html = undefined;
            }
        }

        // handle 'bad' value situation (mismatched value type vs declared type)
        // set .html and then .match accordingly using all possible fallback .htmlAlt possibilities
        if (cell.html === undefined) {

            if ($hasProp(cell, "htmlAlt") && $typeOf(cell.htmlAlt) === "String") {
                cell.html = cell.htmlAlt;
            } else if ($hasProp(colSpec, "htmlAlt") && $typeOf(colSpec.htmlAlt) === "String") {
                cell.html = colSpec.htmlAlt;
            } else if ($typeOf(tbl.options.htmlAlt) === "String") {
                cell.html = tbl.options.htmlAlt;
            } else {
                cell.html = cell.type;
            }

            cell.match = html2text(cell.html).toUpperCase();

            cell.cssClass.push(tbl.cssClass.badValue);
        }

        // cleansing operation to make sure that what shouldn't exist, does not (even if supplied by the user)
        if (colSpec.type === "range" || colSpec.type === "ip") {
            if ($hasProp(cell, "cmp")) {
                delete cell.cmp;
            }
        } else {
            if ($hasProp(cell, "cmpMin")) {
                delete cell.cmpMin;
            }

            if ($hasProp(cell, "cmpMax")) {
                delete cell.cmpMax;
            }
        }

        if ($hasProp(cell, "mask") && colSpec.type !== "ip") {
            delete cell.mask;
        }
    }


    // redraw the page due to back / forward browser page navigation event (triggered by user)
    function pageNavigation() {

        // keep the idea of the current view (in case it should change)
        const oldView = tbl.state.view;
        const oldCols = String((tbl.state.colgrp || []).sort());

        // clear state object
        Object.keys(tbl.state).forEach(key => delete tbl.state[key]);

        // clear filtering that may have already been applied
        tbl.html.filterInput.value = "";
        tbl.html.filterError.setAttribute("hidden", "");
        applyBitmask(clearFilterBit);

        // clear relevant CSS classes from previously sorted column (if such column existed)
        $$("th." + tbl.cssClass.sortAsc + ", th." + tbl.cssClass.sortDesc, tbl.html.thead)
            .forEach($th => $th.classList.remove(tbl.cssClass.sortAsc, tbl.cssClass.sortDesc));

        // recover state from URI fragment identifier
        url2state();

        if ((tbl.state.view !== oldView) || (String((tbl.state.colgrp || []).sort()) !== oldCols)) {
            render("navigation");
        } else {
            render("partialNavigation");
        }
    }


    // main initialiser block that run once only
    // creates initial table view and assigns event handlers to HTML page elements (buttons, table cells)
    // runs only after all external sources have finished loading
    async function init(srcData) {

        // the raw data coming from external source(s) will be stored in 'raw' until converted
        const raw = {};

        // assign resources loaded from source data to the global object
        srcData.forEach(d => {
            if (d.key === "@specs" && d.response) {
                if ($typeOf(d.response.table) === "Array" && $typeOf(tbl.table) !== "Array") {
                    tbl.table = d.response.table;
                }
                if ($typeOf(d.response.options) === "Object") {
                    tbl.options = {...defaultOptions, ...d.response.options, ...(custom.options || {})};
                }
                if ($typeOf(d.response.cssClass) === "Object") {
                    tbl.cssClass = {...defaultCssClass, ...d.response.cssClass, ...(custom.cssClass || {})};
                }
                if ($typeOf(d.response.views) === "Object") {
                    tbl.views = {...d.response.views, ...(custom.views || {})};
                }
            } else {
                raw[d.key] = d.response;
            }
        });

        // sanitize global date format, if supplied in 'specs'
        if ($typeOf(tbl.options.dateFormat) !== "String") {
            delete tbl.options.dateFormat;
        }

        // apply generic smartable classes to the HTML
        tbl.html.filterInput.classList.add(tbl.cssClass.filterInput);
        tbl.html.filterApply.classList.add(tbl.cssClass.filterApply);
        tbl.html.filterClear.classList.add(tbl.cssClass.filterClear);
        tbl.html.filterHelp.classList.add(tbl.cssClass.filterHelp);
        tbl.html.filterError.classList.add(tbl.cssClass.filterError);
        tbl.html.help.classList.add(tbl.cssClass.help);
        tbl.html.export.classList.add(tbl.cssClass.export),
        tbl.html.table.classList.add(tbl.cssClass.smartable);

        // create table columns Map
        tbl.table = new Map((tbl.table || []).map(col => {
            if (col !== null && $typeOf(col) === "Object") {
                const arr = Object.entries(col)[0];
                return (arr[1] !== null && $typeOf(arr[1]) === "Object")
                    ? arr
                    : [arr[0], {}];
            } else {
                return [String(col), {}];
            }
        }));

        // normalize & sanitize CSS class definitions and date format strings from 'specs'
        for (const prop of tbl.table.values()) {
            value2array(prop, "cssClass");
            if ($hasProp(prop, "dateFormat") && $typeOf(prop.dateFormat) !== "String") {
                delete prop.dateFormat;
            }
        }

        // if custom Date/Time formatting has been configured in the specs, load the Luxon module
        if (tbl.options.dateFormat || [...tbl.table].some(col => col[1].dateFormat)) {
            await import(luxonUrl).then((luxon) => tbl.DateTime = luxon.DateTime, ()=>{});
        }

        // freeze root properties of the main object to protect adding/deleting unsanctioned things
        Object.freeze(tbl);

        // freeze the callbacks and triggers (shouldn't be redefined beyond the table init)
        Object.freeze(tbl.callback);
        Object.freeze(tbl.trigger);

        // call custom user function that should populate the 'data' array
        if ($typeOf(tbl.converter) === "Function") {
            tbl.converter(raw, tbl.data);
        }

        // for each data row and for each data cell run the normalization procedure to make sure the data is legit
        tbl.data.forEach(row => {

            for (const [col, colSpec] of tbl.table.entries()) {
                normalizeValue(row, col, colSpec);
            }

            // check if ._row property exists for each row, and if not then create it now
            if (!$hasProp(row, "_row")) {
                row._row = {};
            }

            // normalize ._row's cssClass into array (if not already)
            value2array(row._row, "cssClass");
        });

        // fill the display[] array with initial values that correspond (one to one) to the data[] array keys
        // i.e., the initial table look will reflect 'src' order as it was loaded from files (no sorting, no filtering)
        tbl.display.push(...tbl.data.keys());

        // initialize 'state' object with possible data coming from the URI fragment identifier
        url2state();

        // call custom user function that can act on the normalized data values in the data array
        // this is also a chance to programmatically manipulate specs (that are typically static) into a desired shape
        if ($typeOf(tbl.callback.initData) === "Function") {
            tbl.callback.initData(tbl);
        }

        // if colGroups feature is enabled, check for default column group settings
        if (tbl.options.colGroups === true) {

            // check if no column group at all is currently requested
            if ((!tbl.state.colgrp || !tbl.state.colgrp.length || tbl.state.colgrp[0] === "")) {

                // check if a default column group setting is provided in 'specs'
                const groups = (tbl.options.defColGroups && tbl.options.defColGroups.length)
                    ? (Array.isArray(tbl.options.defColGroups) ? tbl.options.defColGroups : [tbl.options.defColGroups])
                    : "none";

                // make a state jump to the default column selection (also perform page history change)
                state2url({colgrp: groups}, true); // 'true' causes History.replaceState()
            }
        }

        // create a Map of columns for each defined view (if any)
        for (const [id, view] of Object.entries(tbl.views || {})) {
            if (Array.isArray(view.cols)) {
                view.cols = new Map(view.cols
                    .filter(col => tbl.table.has(col))
                    .map(col => [col, tbl.table.get(col)])
                );
            } else if (id !== "default") {
                if ($typeOf(view) !== "Object") {
                    view = {};
                }
                view.cols = new Map(tbl.table);
            }
        }

        // handle standard init steps for view/state/rendering
        render("init");

        // if table filtering is enabled in the global settings, attach necessary event listeners to the HTML elements
        if (tbl.options.filter !== false) {

            // if the help container element needs to be created because it wasn't there, insert it before the table
            if (tbl.html.help === $htmlVoid) {

                const tableParent = tbl.html.table.parentNode;

                if (tableParent) {
                    tbl.html.help = tableParent.insertBefore(document.createElement("article"), tbl.html.table);
                }
            }

            tbl.html.help.setAttribute("hidden", "");
            tbl.html.help.innerHTML = tbl.html.helpHtml;

            // register handler for the 'click' event on the 'Filter' button
            tbl.html.filterApply.addEventListener("click", filterRows);

            // register handler for the 'keyup' event on the 'input' element to catch the Enter keypress and trigger filtering
            tbl.html.filterInput.addEventListener("keyup", (event) => {
                if (event.key === "Enter") {
                    event.preventDefault();
                    tbl.html.filterApply.click();
                }
            });

            // register handler for the 'click' event on the 'Clear' button
            // removes 'input' field text and re-renders table body with no filters applied
            tbl.html.filterClear.addEventListener("click", clearFilter);

            // register handler for the 'click' event on each table cell so that filters could be created easily with a mouse click
            tbl.html.tbody.addEventListener("click", createFilter);

            // apply the appropriate CSS class to the table
            tbl.html.table.classList.add(tbl.cssClass.filterable);

            // register handler for the 'click' event on the 'Help' button to toggle the display of the 'help text'
            tbl.html.filterHelp.addEventListener("click", () => {
                if (tbl.html.help.hidden) {
                    tbl.html.help.removeAttribute("hidden");
                } else {
                    tbl.html.help.setAttribute("hidden", "");
                }
            });
        }

        // if data exporting is enabled in the global settings, show the button and enable behaviour
        if (tbl.options.export !== false) {
            tbl.html.export.addEventListener("click", exportData);
            tbl.html.export.removeAttribute("hidden");
        }

        // navigation (page back / page forward) callback
        window.addEventListener("popstate", pageNavigation);

        // fire custom event that allows to perform final one-time-only init user action before the table is revealed
        if ($typeOf(tbl.callback.initRender) === "Function") {
            tbl.callback.initRender(tbl);
        }

        // reveal the table that may have been hidden via the 'hidden' HTML attribute
        tbl.html.table.removeAttribute("hidden");
    }


    // creates error message about what went wrong during YAML/JSON loading and injects it into HTML
    async function error(e) {

        // YAML data could not be parsed
        if (e.name === "YAMLException") {
            tbl.html.error.innerHTML = "YAML error while loading source data.<br /><br />" +
                `${escapeHtml(e.responseURL)}<br /><br /><pre>${escapeHtml(e.message)}</pre>`;

        // JSON data could not be parsed
        } else if (e.name === "SyntaxError") {
            tbl.html.error.innerHTML = "JSON error while loading source data.<br /><br />" +
                `${escapeHtml(e.responseURL)}<br /><br />${escapeHtml(e.message)}`;

        // if HTTP status code is greater than 0, HTTP response was received but it wasn't successful
        } else if ($typeOf(e) === "XMLHttpRequest") {
            tbl.html.error.innerHTML = `HTTP Error [${e.status}] while loading source data.<br /><br />${escapeHtml(e.responseURL)}`;

        // ES module could not be loaded, most likely (or some other weird error)
        } else if ($typeOf(e) === "Error") {
            tbl.html.error.innerHTML = `[${e.name}] ${escapeHtml(e.message)}`;
        }

        tbl.html.error.removeAttribute("hidden");
    }


    // loads YAML or JSON file via XMLHttpRequest asynchronously (returns Promise),
    // the resolved Promise returns an object with source data and the corresponding key name
    async function httpGet(key, src) {

        // the only thing this function does is to return new Promise
        return new Promise((resolve, reject) => {

            // if the source is not given, there would be nothing to do
            if (!src) {
                resolve({key, data: null});
            }

            // the Promise will be either resolved or rejected only after the XMLHttpRequest is done
            const req = new XMLHttpRequest();

            // the callback function that will be fired once XMLHttpRequest has been performed successfully
            req.onload = function (event) {

                // check the response HTTP status code for success (200)
                if (event.target.status === 200) {

                    const contentType = req.getResponseHeader("content-type") || "";

                    const type = /json/.test(contentType)
                        ? "json"
                        : (/ya?ml/.test(contentType)
                            ? "yaml"
                            : "text");

                    // return data that should be converted from JSON or YAML
                    resolve({
                        key,
                        response: event.target.response,
                        responseURL: event.target.responseURL,
                        type
                    });

                // if HTTP response was NOT 200, reject the Promise defined above
                } else {
                    reject(event.target);
                }
            };

            // the event that will be fired in case XMLHttpRequest fails (before any server response) is the same as the success
            req.onerror = req.onload;

            // prepare the URL for the GET XMLHttpRequest
            const url = src + (src.includes("?") ? "&_=" : "?_=") + Date.now();
            req.open("GET", url);

            // perform XMLHttpRequest (.onload() and .onerror() callbacks defined above will be fired upon completion)
            req.send();
        });
    }


    // checks if any of the loaded files need conversion from YAML (JSON conversion is built in with JavaScript)
    // if YAML converter is needed then load extra jsYaml module and use it for conversion
    async function transformData(srcData) {

        let proceed = true;

        if (srcData.length && srcData.some(d => d.type === "yaml")) {

            await import(jsYamlUrl).then(

                (jsYaml) => {

                    proceed = srcData.every(d => {
                        if (d.response && d.type === "yaml") {
                            try {
                                d.response = jsYaml.load(d.response);
                            } catch (err) {
                                // throw YAML data conversion error
                                err.responseURL = d.responseURL;
                                error(err);
                                return false;
                            }
                        }
                        return true;
                    });
                },

                // throw Error for loading jsYaml ES module
                (err) => {
                    error(err)
                    proceed = false;
                }
            );
        }

        if (proceed && srcData.every(d => {

            if (d.response && d.type === "json") {

                try {
                    d.response = JSON.parse(d.response);
                } catch (err) {
                    // throw JSON data conversion error
                    err.responseURL = d.responseURL;
                    error(err);
                    return false;
                }

            }
            return true;
        })
        ){
            init(srcData);
        }
    }


    // load all YAML/JSON source files asynchronously,
    // wait until all requests are done using Promise.all() technique,
    // if all requests were successful, then call prepareData(), otherwise call error()
    Promise.all(
        [...Object.entries({
            ...(($typeOf(tbl.specs) === "String" && tbl.specs.length > 0) ? {"@specs": tbl.specs} : {}),
            ...tbl.source
        })].map(src => httpGet(...src))
    ).then(transformData, error);

};
