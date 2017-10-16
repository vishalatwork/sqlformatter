define(function (require, exports, module) {
	/**
	 * StringTokenizer util for BasicFormatterImpl
	 * Split string using regexp and hasMoreTokens and nextToken token util method
	 */
	function StringTokenizer(str, delim) {
		var that = this;

		this.str = str;
		this.delimiters = delim;
		this.currentPosition = 0;

		this.tokens = [];
		if (str && str.split) {
			var tokens = str.split(delim);
			if (tokens) {
				tokens.forEach(function (token) {
					if (token !== "") {
						that.tokens.push(token);
					}
				});
			}
		}
	}

	StringTokenizer.prototype.hasMoreTokens = function () {
		return this.tokens && this.currentPosition < this.tokens.length;
	};

	StringTokenizer.prototype.nextToken = function () {
		var token = this.tokens[this.currentPosition];
		this.currentPosition++;
		return token;
	};

	module.exports = StringTokenizer;
});