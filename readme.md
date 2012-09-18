This is a wrapper library for the Mediawiki API.

It is woefully incomplete, and will likely remain that way. Should you want a
function or capability added, just ask or send a pull request.

## Installation

Currently, only up on GitHub.

## Logging In/Out

```javascript
var MediaWikiApi = require('MediaWikiApi');

wiki = new MediaWikiApi('example-wiki.org/');

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

Yes. Callbacks are used for everything. The library used to send and receive
data allows both futures and events, so I might set up events at some point.

As of right now, there's no function other than the private _request method
that can handle things you usually have to be logged in to do.

```javascript
_request(options, callback, method, body)
```

options is an object representation of the URL parameters.

callback is the function to execute after the result is obtained.

method is the HTTP method. I.E. GET or POST.

body is the body of the message as a JS object. I'm not sure if it is working.

## Responses

Responses are given as JSON. 

The callback takes three parameters: err, res, ahr.

* err is the Error, either from Node or from MediaWiki.
* res is the result.
* ahr is the internal ahr object, used when you want to see what's going on
under the wrapper. Useful for debugging, but shouldn't be used in production.
