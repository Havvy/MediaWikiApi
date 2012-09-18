var MediaWikiApi = require('./index.js');

var dnd = new MediaWikiApi('dnd-wiki.org');

dnd.login('havvy_bot', 'lulzsec found me out', function (err, data) {
    if (err) {
        return console.log(err);
    }

    dnd.getArticleContents("User:Havvy/Botground", function (err, contents) {
        if (err) {
            return console.log(err);
        }

        dnd.edit("User:Havvy/Botground", {
            appendtext: "\nsuccess",
            summary: 'Testing API Wrapper',
            minor: 'true'
        }, function (err, data, ahr) {
            if (err) {
                console.log(ahr);
                console.log(err);
                return;
            }

            console.log(data);
        });
    });
});

setTimeout(function () {
    dnd.logout(function () {});
}, 5000)