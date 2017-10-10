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
    t.throws(function() { dawg.insert(null) }, /first argument must be a String/, "validates inserted null value");
    t.throws(function() { dawg.insert({}) }, /first argument must be a String/, "validates inserted {} value");
    t.throws(function() { dawg.insert(1.0) }, /first argument must be a String/, "validates inserted 1.0 value");
    t.throws(function() { dawg.insert(function(){}) }, /first argument must be a String/, "validates inserted function value");
    t.throws(function() { dawg.lookup(null) }, /first argument must be a String/, "validates null lookup value");
    t.throws(function() { dawg.lookupPrefix(null) }, /first argument must be a String/, "validates null lookupPrefix value");
    t.throws(function() { dawg.insert('') }, /empty string passed to insert/, "validates inserted empty string value");
    dawg.finish();
    var compactDawg = dawg.toCompactDawg();
    t.assert(compactDawg.lookup() == '', 'lookup empty string');
    t.assert(compactDawg.lookupPrefix() == '', 'lookup empty string prfix');
    t.assert(compactDawg.lookup({}) == '', 'lookup object');
    t.assert(compactDawg.lookupPrefix({}) == '', 'lookup object prefix');
    t.end();
});

var resp, dawg, wordSet;
var words = [];

test('Prepare for DAWG test', function (t) {
    var q = queue();
    ['test_words.txt.gz', 'nonlatin_words.txt.gz'].forEach(function(file) {
        q.defer(function(callback) {
            request.get({url: "http://mapbox.s3.amazonaws.com/apendleton/" + file, encoding: null}, function(err, response, body) {
                if (err) throw new Error ("S3 fetch failed");
                zlib.gunzip(body, function(err, data) {
                    if (err) throw new Error("Zlib decompression failed: " + err);
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

// Test that dawg contains all words
    var exactLookup = true;
    for (var i = 0; i < words.length; i++) {
        exactLookup = exactLookup && dawg.lookup(words[i]);
    }
    t.assert(exactLookup, "dawg contains all words");

// Search for a word not, in the structure, but the structure contains a matching word missing a letter
    var lookupFailure = true;
    for (var i = 0; i < words.length; i++) {
        if (dawg.lookup(words[i] + "abq") || dawg.lookupPrefix(words[i] + "abq")) console.log(words[i]);
        lookupFailure = lookupFailure && (!dawg.lookup(words[i] + "abq"));
        lookupFailure = lookupFailure && (!dawg.lookupPrefix(words[i] + "abq"));
    }

    t.assert(lookupFailure, "dawg does not contain any words with 'abq' added to the end as term or prefix");

//Search for a word, not in the structure, but contains an extra letter
    var lookupActual = true;
    for (var i = 0; i < words.length; i++) {
        if (dawg.lookup(words[i] + "abc") || dawg.lookupPrefix(words[i] + "abc")) console.log('words[i]',words[i]);
        lookupActual = lookupActual && (!dawg.lookup(words[i] + "abc"));
        lookupActual = lookupActual && (!dawg.lookupPrefix(words[i] + "abc"));
    }
    t.assert(lookupActual, "dawg does not contain any words with 'abc' added to the end as term or prefix");

//Search for a word, not in the structure, but the structure contains 1)a word with an extra letter and 2_ a word missing a letter
// In this instance we need to decide which should return.
    var lookupActual = true;
    for (var i = 0; i < words.length; i++) {
        if (dawg.lookup(words[i] + "abc") || dawg.lookupPrefix(words[i] + "abc")) console.log('words[i]',words[i]);
        lookupActual = lookupActual && (!dawg.lookup(words[i] + "abc"));
        lookupActual = lookupActual && (!dawg.lookupPrefix(words[i] + "abc"));
    }
    t.assert(lookupActual, "dawg does not contain any words with 'abc' added to the end as term or prefix");

    t.end();
});
