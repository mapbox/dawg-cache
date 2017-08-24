var test = require('tape');
var request = require('request');
var queue = require('queue-async');
var zlib = require('zlib');
var forOf = require('es6-iterator/for-of');
require('collections/collections.js');
var binding = require("../lib/jsdawg.node");

var jsdawg = require("../index");

test('DAWG test invalid usage', function (t) {
    var dawg = new jsdawg.Dawg();
    t.throws(function() { dawg.insert(null) }, /first argument must be a String/, "validates inserted value");
    t.throws(function() { dawg.insert({}) }, /first argument must be a String/, "validates inserted value");
    t.throws(function() { dawg.insert(1.0) }, /first argument must be a String/, "validates inserted value");
    t.throws(function() { dawg.insert(function(){}) }, /first argument must be a String/, "validates inserted value");
    t.throws(function() { dawg.lookup(null) }, /first argument must be a String/, "validates inserted value");
    t.throws(function() { dawg.lookupPrefix(null) }, /first argument must be a String/, "validates inserted value");
    t.throws(function() { dawg.insert('') }, /empty string passed to insert/, "validates inserted value");
    dawg.finish();
    var compactDawg = dawg.toCompactDawg();
    t.assert(compactDawg.lookup() == '');
    t.assert(compactDawg.lookupPrefix() == '');
    t.assert(compactDawg.lookup({}) == '');
    t.assert(compactDawg.lookupPrefix({}) == '');
    t.end();
});

var resp, dawg, wordSet;
var words = [];

test('Prepare for DAWG tet', function (t) {
    var q = queue();
    ['test_words.txt.gz', 'nonlatin_words.txt.gz'].forEach(function(file) {
        q.defer(function(callback) {
            request.get({url: "http://mapbox.s3.amazonaws.com/apendleton/" + file, encoding: null}, function(err, response, body) {
                if (err) throw "S3 fetch failed";
                zlib.gunzip(body, function(err, data) {
                    if (err) throw ("Zlib decompression failed: " + err);
                    resp = data.toString();
                    words = words.concat(resp.trim().split("\n"));
                    callback();
                })
            })
        });
    });
    q.awaitAll(function() {
        words.sort();
        t.end();
    });
});

test('Read-write DAWG test', function(t) {
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

    t.end();
});

test('Compact DAWG test', function(t) {
    dawg.finish();

    [false, true].forEach(function(preserveCounts) {
        var compactDawg = dawg.toCompactDawg(preserveCounts);
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

        var compactDawgWords = [];
        var compactDawg = dawg.toCompactDawg();
        forOf(compactDawg, function(value) { compactDawgWords.push(value); });
        var iteratorLookup = true;
        for (var i = 0; i < words.length; i++) {
            iteratorLookup = iteratorLookup && (words[i] == compactDawgWords[i]);
        }
        t.assert(iteratorLookup, "compact dawg iterator reproduces original list");

        var prefixWords = [];
        var prefixIterator = compactDawg.iterator("test");
        var priNext = prefixIterator.next();
        while (!priNext.done) {
            prefixWords.push(priNext.value);
            priNext = prefixIterator.next();
        }
        t.equal(prefixWords.length, 82, "got 82 results for prefix 'test'");
        t.assert(prefixWords.indexOf("test") == 0, "submitted prefix 'test' is included in results");

        var prefixWords = [];
        var prefixIterator = compactDawg.iterator("阿");
        console.log(compactDawg.lookupPrefix("阿"))
        var priNext = prefixIterator.next();
        while (!priNext.done) {
            prefixWords.push(priNext.value);
            priNext = prefixIterator.next();
        }
        t.equal(prefixWords.length, 9, "got 82 results for prefix '阿'");
        t.assert(prefixWords.indexOf("阿") == -1, "submitted prefix '阿' is not included in results");

        var prefixWords = [];
        var prefixIterator = compactDawg.iterator("testac");
        var priNext = prefixIterator.next();
        while (!priNext.done) {
            prefixWords.push(priNext.value);
            priNext = prefixIterator.next();
        }
        t.equal(prefixWords.length, 7, "got 7 results for prefix 'testac'");
        t.assert(prefixWords.indexOf("testac") == -1, "submitted prefix 'testac' is not included in results");

        var prefixWords = [];
        var prefixIterator = compactDawg.iterator("testaaa");
        var priNext = prefixIterator.next();
        while (!priNext.done) {
            prefixWords.push(priNext.value);
            priNext = prefixIterator.next();
        }
        t.equal(prefixWords.length, 0, "got 0 results for prefix 'testaaa'");

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
    });


    t.end();
});