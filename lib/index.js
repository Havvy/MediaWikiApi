"use strict";

var request = require('ahr2');
var crypto = require('crypto');

var md5 = function (text) {
    return crypto.createHash('md5').update(text).digest('hex');
}

function MediaWikiApi (site) {
    if (!site) {
        throw new Error("MediaWikiAPI needs a site to query.");
    }

    this.site = site;
    this.api = '/w/api.php';
    this.isBot = true;

    this.loggedIn = false;
    this.cookies = {
        prefix: "",
        map: {},
        parse: function () {
            var header = "";
            for (var key in this.map) {
                header += this.prefix + key + '=' + this.map[key] + "; ";
            }
            return header.slice(0, -2); // drop the final '; '
        }
    };

    this.tokens = {};
}

MediaWikiApi.prototype = {
    /**
     * @param category: String - Name of category to get members of.
     * @param query: Object - Other properties of the mediawiki api for
     *  the categorymembers query.
     */
    categorymembers: function (category, query, callback) {
        var cmoptions = {
            list: 'categorymembers',
            cmtitle: 'Category:' + category,
            cmlimit: 50
        };

        for (var option in query) {
            cmoptions['cm' + option] = query[option];
        }

        if (cmoptions.cmcontinue === undefined) {
            delete cmoptions.cmcontinue;
        }

        this._query(cmoptions, callback);
    },

    /**
     * @param user: User to login.
     * @param pass: Plaintext password of user.
     * @param callback: Function to execute after logged in.
     */
    login: function (user, pass, callback) {
        var that = this;

        this._post({
            action: 'login',
            lgname: user,
            lgpassword: pass
        }, {}, function (err, data, ahr) {
            if (err) {
                return callback(err, undefined, ahr);
            }

            that.cookies.prefix = data.login.cookieprefix;
            that.cookies.map['_session'] = data.login.sessionid;

            that._post({
                action: 'login',
                lgname: user,
                lgpassword: pass,
                lgtoken: data.login.token
            }, {}, function (err, data, ahr) {
                if (err) {
                    callback(err, undefined, ahr);
                    return;
                }

                if (data && data.login) {
                    that.loggedIn = true;
                    that.cookies.map['UserName'] = data.login.lgusername;
                    that.cookies.map['UserID'] = data.login.lguserid;
                    that.cookies.map['Token'] = data.login.lgtoken;
                }

                callback(err, data);
            });
        });
    },

    // This function is a mess.
    /**
     * @param title Either article name (String) or article id (Number)
     * @param text Contents to replace the edited section/page.
     * @param options Other options.
     * @param callback Function to call after the results of the operation.
     */
    edit: function (title, body, callback) {
        var that = this;

        // Handle the title.
        if (typeof title === "string") {
            body.title = title;
        } else if (typeof title === "number") {
            body.pageid = title;
        } else {
            throw new Error("Title must be a String (name of page) or Number"
                + "(page id).");
        }

        // Handle md5 and existence of an edit.
        if (body.appendtext || body.prependtext) {
            body.md5 = md5((body.prependtext || "") + (body.appendtext || ""));
        } else if (body.text) {
            body.md5 = md5(body.text);
        } else {
            throw new Error("Body must have textual content of some sort." +
                "See http://www.mediawiki.org/wiki/API:Edit for details.");
        }

        // Handle not creating new pages.
        body.nocreate = 'true';

        // Handle making sure these are counted as bot edits, if they are.
        if (this.isBot) {
            body.bot = 'true';
        }

        // Handle getting the token.
        this._getToken('edit', function (err, token) {
            body.token = token;

            // Turn the body into a String.
            body = that._makeQueryString(body);

            // Send the request off.
            that._post({action: 'edit'}, body, callback);
        });
    },

    // TODO: Allow article to be a string or number
    getArticleContents: function (article, callback) {
        this._query({
            prop: 'revisions',
            rvprop: 'content',
            titles: article
        }, function (err, data, ahr) {
            var contents = "";
            if (data) {
                for (var page in data.query.pages) {
                    // Yes. This really is the location of the contents of
                    // the article. Why do you ask?
                    contents = data.query.pages[page].revisions[0]['*'];
                }
            }

            callback(err, contents, ahr);
        });
    },

    logout: function (callback) {
        this.loggedIn = false;
        delete this.cookies.map['UserName'];
        delete this.cookies.map['UserID'];
        delete this.cookies.map['Token'];
        delete this.cookies.map['_session'];

        this._get({
            action: 'logout'
        }, callback);
    },

    _getToken: function (tokenType, callback) {
        var that = this;

        if (this.tokens[tokenType]) {
            return callback(undefined, this.tokens[tokenType], null);
        }

        this._query({
            prop: 'info',
            intoken: tokenType,
            titles: "Main Page"
        }, function (err, data) {
            var token;

            if (!err) {
                for (var page in data.query.pages) {
                    token = data.query.pages[page][tokenType + 'token'];
                }

                that.tokens[tokenType] = token;
            }

            callback(err, token);
        });
    },

    _request: function (query, callback, method, body) {
        if (typeof callback !== 'function') {
            throw new Error('Callback is not a function.');
        }

        query.format = 'json';

        var req = {
            method: method,
            hostname: this.site,
            port: 80,
            pathname: this.api,
            query: query,
            headers: {
                'Cookie': this.cookies.parse()
            }
        };

        if (body) {
            if (typeof body === "string") {
                req.encodedBody = body;
                req.headers['Content-Type'] = "application/x-www-form-urlencoded";
            } else {
                req.body = body;
            }
        }

        request(req).when(function (err, ahr, data) {
            // If there's an error according to the headers, treat it as one.
            // Otherwise, the error will end up in the data section, which is
            // not wanted.
            if (ahr.headers['mediawiki-api-error']) {
                if (ahr.headers['mediawiki-api-error'] === 'help') {
                    callback({ 
                        code: 'help', 
                        info: 'The help page was shown instead of any ' +
                            'specific error message. This usually happens ' +
                            'when the action is left off. If you want to ' +
                            'see this page, the wikimedia one is at ' +
                            'http://en.wikipedia.org/w/api.php?action=help'
                     }, undefined, ahr);
                } else {
                    callback(data.error, undefined, ahr);
                }
            } else {
                callback(err, data, ahr);
            }
        });
    },

    _post: function (query, body, callback) {
        if (typeof body === "string") {

        }
        this._request(query, callback, 'POST', body);
    },

    _get: function (query, callback) {
        this._request(query, callback, 'GET');
    },

    _query: function (query, callback) {
        query.action = 'query';

        this._get(query, callback);
    },

    _makeQueryString: function (body) {
        var parts = [];
        var token;
        for (var field in body) {
            parts.push(field + "=" + body[field]);
        }

        return encodeURI(parts.join('&')).replace(/\+/g, "%2B");
    }
};

module.exports = MediaWikiApi;