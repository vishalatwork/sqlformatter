define(function(require, exports, module){
    var StringTokenizer = require('./StringTokenizer');

    var BEGIN_CLAUSES = {
        "left" : true,
        "right" : true,
        "inner" : true,
        "outer" : true,
        "group" : true,
        "order" : true
    };
    var END_CLAUSES = {
        "where" : true,
        "set" : true,
        "having" : true,
        "join" : true,
        "from" : true,
        "by" : true,
        "into" : true,
        "union" : true
    };
    var LOGICAL = {
        "and" : true,
        "or" : true,
        "when" : true,
        "else" : true,
        "end" : true
    };
    var QUANTIFIERS = {
        "in" : true,
        "all" : true,
        "exists" : true,
        "some" : true,
        "any" : true
    };
    var DML = {
        "insert" : true,
        "update" : true,
        "delete" : true
    };
    var MISC = {
        "select" : true,
        "on" : true
    };
    var INDENT_STRING = "    ";
    var INITIAL = "\n    ";
    var WHITESPACE = " \n\r\f\t";

    function FormatProcess(sql) {
        this.beginLine = true;
        this.afterBeginBeforeEnd = false;
        this.afterByOrSetOrFromOrSelect = false;
        this.afterOn = false;
        this.afterBetween = false;
        this.afterInsert = false;
        this.inFunction = null;
        this.parensSinceSelect = 0;
        this.parenCounts = [];
        this.afterByOrFromOrSelects = [];
        this.indent = 1;
        this.result = "";
        this.tokens = null;
        this.lastToken = "";
        this.token = "";
        this.lcToken = "";
        this.parenCounts = [];
        this.afterByOrFromOrSelects = [];
        this.tokens = new StringTokenizer(sql, /(\(|\)|\+|\*|\/|-|=|<|>|'|`|"|\[|]| |\n|\r|\f|\t)/g);
    }


    FormatProcess.prototype.perform = function() {
        var t;
        this.result += INITIAL;

        while (this.tokens.hasMoreTokens()) {
            this.token = this.tokens.nextToken();
            this.lcToken = this.token.toLowerCase();

            if ("'" === this.token) {
                do {
                    t = this.tokens.nextToken();
                    this.token += t;
                }
                // cannot handle single quotes
                while ("'" !== t && this.tokens.hasMoreTokens());
            }
            else if ("\"" === this.token) {
                do {
                    t = this.tokens.nextToken();
                    this.token += t;
                }
                while ("\"" !== t);
            }

            if (this.afterByOrSetOrFromOrSelect && "," === this.token) {
                this.commaAfterByOrFromOrSelect();
            }
            else if (this.afterOn && "," === this.token) {
                this.commaAfterOn();
            }
            else if ("(" === this.token) {
                this.openParen();
            }
            else if (")" === this.token) {
                this.closeParen();
            }
            else if (BEGIN_CLAUSES[this.lcToken]) {
                this.beginNewClause();
            }
            else if (END_CLAUSES[this.lcToken]) {
                this.endNewClause();
            }
            else if ("select" === this.lcToken) {
                this.select();
            }
            else if (DML[this.lcToken]) {
                this.updateOrInsertOrDelete();
            }
            else if ("values" === this.lcToken) {
                this.values();
            }
            else if ("on" === this.lcToken) {
                this.on();
            }
            else if (this.afterBetween && this.lcToken === "and") {
                this.misc();
                this.afterBetween = false;
            }
            else if (LOGICAL[this.lcToken]) {
                this.logical();
            }
            else if (this.isWhitespace(this.token)) {
                this.white();
            }
            else {
                this.misc();
            }
            if (!this.isWhitespace(this.token)) {
                this.lastToken = this.lcToken;
            }
        }
        return this.result;
    };

    FormatProcess.prototype.commaAfterOn = function() {
        this.out();
        this.indent--;
        this.newline();
        this.afterOn = false;
        this.afterByOrSetOrFromOrSelect = true;
    };

    FormatProcess.prototype.commaAfterByOrFromOrSelect = function() {
        this.out();
        this.newline();
    };

    FormatProcess.prototype.logical = function() {
        if ("end" === this.lcToken) {
            this.indent--;
        }
        this.newline();
        this.out();
        this.beginLine = false;
    };

    FormatProcess.prototype.on = function() {
        this.indent++;
        this.afterOn = true;
        this.newline();
        this.out();
        this.beginLine = false;
    };

    FormatProcess.prototype.misc = function() {
        this.out();
        if ("between" === this.lcToken) {
            this.afterBetween = true;
        }
        if (this.afterInsert) {
            this.newline();
            this.afterInsert = false;
        }
        else {
            this.beginLine = false;
            if ("case" === this.lcToken) {
                this.indent++;
            }
        }
    };

    FormatProcess.prototype.white = function() {
        if (!this.beginLine) {
            this.result += " ";
        }
    };

    FormatProcess.prototype.updateOrInsertOrDelete = function() {
        this.out();
        this.indent++;
        this.beginLine = false;
        if ("update" === this.lcToken) {
            this.newline();
        }
        if ("insert" === this.lcToken) {
            this.afterInsert = true;
        }
    };

    FormatProcess.prototype.select = function() {
        this.out();
        this.indent++;
        this.newline();
        this.parenCounts.push(this.parensSinceSelect);
        this.afterByOrFromOrSelects.push(this.afterByOrSetOrFromOrSelect);
        this.parensSinceSelect = 0;
        this.afterByOrSetOrFromOrSelect = true;
    };

    FormatProcess.prototype.out = function() {
        this.result += this.token;
    };

    FormatProcess.prototype.endNewClause = function() {
        if (!this.afterBeginBeforeEnd) {
            this.indent--;
            if (this.afterOn) {
                this.indent--;
                this.afterOn = false;
            }
            this.newline();
        }
        this.out();
        if ("union" !== this.lcToken) {
            this.indent++;
        }
        this.newline();
        this.afterBeginBeforeEnd = false;
        this.afterByOrSetOrFromOrSelect = "by" === this.lcToken
        || "set" === this.lcToken
        || "from" === this.lcToken;
    };

    FormatProcess.prototype.beginNewClause = function() {
        if (!this.afterBeginBeforeEnd) {
            if (this.afterOn) {
                this.indent--;
                this.afterOn = false;
            }
            this.indent--;
            this.newline();
        }
        this.out();
        this.beginLine = false;
        this.afterBeginBeforeEnd = true;
    };

    FormatProcess.prototype.values = function() {
        this.indent--;
        this.newline();
        this.out();
        this.indent++;
        this.newline();
    };

    FormatProcess.prototype.closeParen = function() {
        this.parensSinceSelect--;
        if (this.parensSinceSelect < 0) {
            this.indent--;
            this.parensSinceSelect = this.parenCounts.pop();
            this.afterByOrSetOrFromOrSelect = this.afterByOrFromOrSelects.pop();
        }
        if (this.inFunction > 0) {
            this.inFunction--;
            this.out();
        } else {
            if (!this.afterByOrSetOrFromOrSelect) {
                this.indent--;
                this.newline();
            }
            this.out();
        }
        this.beginLine = false;
    };

    FormatProcess.prototype.openParen = function() {
        if (this.isFunctionName(this.lastToken) || this.inFunction > 0) {
            this.inFunction++;
        }
        this.beginLine = false;
        if (this.inFunction > 0) {
            this.out();
        } else {
            this.out();
            if (!this.afterByOrSetOrFromOrSelect) {
                this.indent++;
                this.newline();
                this.beginLine = true;
            }
        }
        this.parensSinceSelect++;
    };

    FormatProcess.prototype.isFunctionName = function(tok) {
        var begin = tok.substring(0, 1);
        var isIdentifier = this.isJavaIdentifierStart(begin) || '"' == begin;
        return isIdentifier && !LOGICAL[tok] && !END_CLAUSES[tok] && !QUANTIFIERS[tok] && !DML[tok] && !MISC[tok];
    };

    FormatProcess.prototype.isJavaIdentifierStart = function(codePoint) {
        return /[a-zA-Z\$_]/.test(codePoint);
    };

    FormatProcess.prototype.isWhitespace = function(token) {
        return WHITESPACE.indexOf(token) !== -1;
    };

    FormatProcess.prototype.newline = function() {
        this.result += "\n";
        for (var i = 0; i < this.indent; i++) {
            this.result += INDENT_STRING;
        }
        this.beginLine = true;
    };

    module.exports.format = function(source) {
        return (new FormatProcess(source)).perform();
    };
});
