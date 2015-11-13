var test = require('tape');
var request = require('request');
var queue = require('queue-async');
var zlib = require('zlib');
require('collections/collections.js');

var jsdawg = require("../jsdawg");

test('DAWG test', function (t) {
    var q = queue(1);
    var resp, dawg, words, wordSet;
    q.defer(function(callback) {
        request.get({url: "http://mapbox.s3.amazonaws.com/apendleton/test_words.txt.gz", encoding: null}, function(err, response, body) {
            if (err) throw "S3 fetch failed";
            zlib.gunzip(body, function(err, data) {
                if (err) throw ("Zlib decompression failed: " + err);
                resp = data.toString();
                callback();
            })
        })
    });
    q.defer(function(callback) {
        words = resp.trim().split("\n");
        wordSet = FastSet(words);

        dawg = new jsdawg.Dawg();
        for (var i = 0; i < words.length; i++) {
            dawg.insert(words[i]);
        }
        t.pass("dawg created");

        var exactLookup = true;
        for (var i = 0; i < words.length; i++) {
            exactLookup = exactLookup && dawg.lookup(words[i]);
        }
        t.assert(exactLookup, "dawg contains all words");

        var prefixLookup = true;
        for (var i = 0; i < words.length; i++) {
            prefixLookup = prefixLookup && dawg.lookupPrefix(words[i]);
        }
        t.assert(prefixLookup, "dawg contains all words as prefixes");

        var prefixLookup = true;
        for (var i = 0; i < words.length; i++) {
            if (words[i].length == 1) continue;

            var prefix = words[i].substring(0, words[i].length - 1);
            prefixLookup = prefixLookup && dawg.lookupPrefix(prefix);
        }
        t.assert(prefixLookup, "dawg contains prefixes of all words as prefixes");

        var lookupFailure = true;
        for (var i = 0; i < words.length; i++) {
            lookupFailure = lookupFailure && (!dawg.lookup(words[i]) + "q");
            lookupFailure = lookupFailure && (!dawg.lookupPrefix(words[i]) + "q");
        }
        t.assert(lookupFailure, "dawg does not contain any words with 'q' added to the end as term or prefix");

        var prefixLookup = true;
        for (var i = 0; i < words.length; i++) {
            if (words[i].length == 1) continue;

            var prefix = words[i].substring(0, words[i].length - 1);
            // if this prefix is also a word, skip
            if (wordSet.contains(prefix)) continue;
            prefixLookup = prefixLookup && (!dawg.lookup(prefix));
        }
        t.assert(prefixLookup, "dawg does not contain prefixes of all words as terms");

        t.assert(!dawg.lookup(""), "dawg does not contain the empty string as a term");
        t.assert(dawg.lookupPrefix(""), "dawg does contain the empty string as a prefix");

        callback();
    });

    q.defer(function(callback) {
        var compactDawg = dawg.toCompactDawg();
        t.pass("compact dawg created")

        var exactLookup = true;
        for (var i = 0; i < words.length; i++) {
            exactLookup = exactLookup && compactDawg.lookup(words[i]);
        }
        t.assert(exactLookup, "compact dawg contains all words");

        var prefixLookup = true;
        for (var i = 0; i < words.length; i++) {
            prefixLookup = prefixLookup && compactDawg.lookupPrefix(words[i]);
        }
        t.assert(prefixLookup, "compact dawg contains all words as prefixes");

        var prefixLookup = true;
        for (var i = 0; i < words.length; i++) {
            if (words[i].length == 1) continue;

            var prefix = words[i].substring(0, words[i].length - 1);
            prefixLookup = prefixLookup && compactDawg.lookupPrefix(prefix);
        }
        t.assert(prefixLookup, "compact dawg contains prefixes of all words as prefixes");

        var lookupFailure = true;
        for (var i = 0; i < words.length; i++) {
            lookupFailure = lookupFailure && (!compactDawg.lookup(words[i]) + "q");
            lookupFailure = lookupFailure && (!compactDawg.lookupPrefix(words[i]) + "q");
        }
        t.assert(lookupFailure, "compact dawg does not contain any words with 'q' added to the end as term or prefix");

        var prefixLookup = true;
        for (var i = 0; i < words.length; i++) {
            if (words[i].length == 1) continue;

            var prefix = words[i].substring(0, words[i].length - 1);
            // if this prefix is also a word, skip
            if (wordSet.contains(prefix)) continue;
            prefixLookup = prefixLookup && (!compactDawg.lookup(prefix));
        }
        t.assert(prefixLookup, "compact dawg does not contain prefixes of all words as terms");

        t.assert(!compactDawg.lookup(""), "compact dawg does not contain the empty string as a term");
        t.assert(compactDawg.lookupPrefix(""), "compact dawg does contain the empty string as a prefix");

        callback();
    })

    q.defer(function(callback) {
        t.end();
    });
});