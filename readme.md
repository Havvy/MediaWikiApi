This is a wrapper library for the Mediawiki API.

This library is woefully incomplete. The only parts implemented were those
necessary to collect all the pages in a category and append text to it.

If you need more functionality, file an issue, and it'll get fixed, fix it
yourself and send a push request, or use the internal _request method that
is explained later in this article.

It is likely that in the future the callback that every function requires will
become optional.

## Installation

```
npm install mediawiki-api
```

### Usage

```javascript
var MediaWikiApi = require('mediawiki-api');

wiki = new MediaWikiApi('example-wiki.org');
```

All actions happen over HTTP.

### Configuration

The only configurable property is ''isBot'', which is true by default.

```javascript
wiki.isBot = (true || false);
```

### Callbacks

Every function requires a callback when the operation is done performing. When
the wrapper moves to using events, those callbacks will become optional.

The callback takes three parameters: err, res, ahr.

* '''err''' is the Error, either from Node or from MediaWiki.
* '''res''' is the result.
* '''ahr''' is the internal abstract-http-request object that the library uses
and can be used in debugging.

Both '''err''' and '''res''' are JSON object.

## Functionality

### Logging In/Out

Logging in is important for making sure your edits are done under a bot
account.

```javascript
wiki.login(username, password, callback)
```

Logging out is less important, but it is a good idea not to leave sessions
open longer than necessary. You also cannot use the session after the wrapper
is closed, so there's little reason not to logout after you are done.

```javascript
wiki.logout(callback)
```

#### Example

Here's an example of logging in and then logging out.

```javascript
wiki.login('user', 'mysecret', function (err, res) {
    if (err) {
        console.log(err);
        return;
    }

    // We are currently logged in.

    // Do stuff logged in.

    wiki.logout(function (err, res) {
        if (err) {
            console.log(err);
            return;
        }

        // We are now logged out.
    });
});
```

### Getting Article Contents

```javascript
wiki.getArticleContents(article, callback)
```

'''article''' is the title of the article.

This method returns the contents of the article as a string.

### Editing Pages

```javascript
wiki.edit(article, body, callback)
```

The '''article''' can be either a string for the page name or a number for its
id.

The '''body''' can contain all of the parameters found at
https://www.mediawiki.org/wiki/API:Edit. Even so, it requires one of the
following properties: text, appendtext, prependtext

If ''appendtext'' or ''prependtext'' are set, then the ''text'' parameter is
ignored.

The edit token and md5 are automatically handled for you.

Edits done by this method will not create new pages.

### Getting Category Members

```javascript
wiki.categorymembers(category, query, callback)
```

You can pass any parameter that starts with 'cm' into the query, but don't
include the 'cm' in it. This query is limited to 50 by default. The results
are not cleaned up, and you'll get the raw response.

#### Example

This script will get the first 500 articles in the Author category in the main
namespace, put their titles into an array, and then print the array to the
console.

```javascript
wiki.getCategoryMembers("Author", {
    limit: 500,
    prop: 'title',
    namespace: 0,
}, function (err, res) {
    if (err) {
        console.log(err);
        return;
    }

    for (page in res.query.categorymembers) {
        var article = res.query.categorymembers[page];
        output.push(article.title);
    }
    
    console.log(output);
});
```

## Unimplemented Functionality

If you use any of the methods described here, file an issue explaining what
you used them for.

### Tokens

Other than edit tokens being handled by the edit method, you'll need to get
and inject the other tokens. The _getToken private method will do that.

```javascript
wiki._getToken(tokenType, callback)
```

### Generic POST, GET, and Requests

```javascript
wiki._post(query, body, callback)
wiki._get(query, callback)
wiki._query(query, callback)
wiki._request(query, callback, method, body)

As of right now, there's no function other than the private _request method
that can handle things you usually have to be logged in to do.

'''query''' is an object representation of the URL parameters. For example,
{
    action: 'query',
    list: 'categorymembers'
    cmtitle: 'Category:Author'
    cmlimit: 50
}

By default, format: 'json' will be added to all queries.

If you use, _query, then the method is get, and action: 'query' is set by
default.

'''callback''' is explained eariler.

'''method''' is the HTTP method. I.E. GET or POST.

'''body''' is the body of the message as a JS object. Only use for HTTP
methods that have a body.

## Final Words

Again, the features that exist here exist because they were needed for a very
specific itch. If you need any additional features, they can be added.

At some point, the wrapper will be event driven instead of futures driven. The
events will pass the same information as the callbacks already present.