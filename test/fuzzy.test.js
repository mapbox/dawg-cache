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
    console.log('** edgeCount: ', dawg.edgeCount());
    console.log('** nodeCount: ', dawg.nodeCount());

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
        if (dawg.lookup(words[i] + "qzz") || dawg.lookupPrefix(words[i] + "qzz")) console.log(words[i]);
        lookupFailure = lookupFailure && (!dawg.lookup(words[i] + "qzz"));
        lookupFailure = lookupFailure && (!dawg.lookupPrefix(words[i] + "qzz"));
    }
    t.assert(lookupFailure, "dawg does not contain any words with 'qzz' added to the end as term or prefix");

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
