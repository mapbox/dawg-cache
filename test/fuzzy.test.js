var test = require('tape');
var request = require('request');
var queue = require('queue-async');
var zlib = require('zlib');
var forOf = require('es6-iterator/for-of');
require('collections/collections.js');
var binding = require("../lib/jsdawg.node");
var fs = require("fs");

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

// test('Prepare for DAWG test', function (t) {
//     var q = queue();
//     var words = fs.readFileSync(__dirname + '/fixtures/words.txt').toString().split('\n');
//     words.sort();
//     ['words.txt'].forEach(function(file) {
//         q.defer(function(callback) {
//             request.get({url: "http://mapbox.s3.amazonaws.com/apendleton/" + file, encoding: null}, function(err, response, body) {
//                 if (err) throw new Error ("S3 fetch failed");
//                 zlib.gunzip(body, function(err, data) {
//                     if (err) throw new Error("Zlib decompression failed: " + err);
//                     resp = data.toString();
//                     words = words.concat(resp.trim().split("\n"));
//                     callback();
//                 })
//             })
//         });
//     });
//     q.awaitAll(function() {
//         words.sort();
//         t.end();
//     });
// });

test('Construct Fuzzy Dawg', function(t) {
    var words = fs.readFileSync(__dirname + '/fixture/words.txt').toString().split('\n');
    words.sort();
    wordSet = FastSet(words);

    dawg = new jsdawg.Dawg();
    for (var i = 0; i < words.length; i++) {
        dawg.insert(words[i]);
    }
    t.pass("dawg created");
    t.end();
});

test('Fuzzy Compact DAWG test', function(t) {
    dawg.finish();

    var compactDawg = dawg.toCompactDawg(false);
    t.pass("compact dawg created")

    var exactLookup = true;
    for (var i = 0; i < words.length; i++) {
        exactLookup = exactLookup && compactDawg.lookup(words[i]);
    }
    t.assert(exactLookup, "compact dawg contains all words");


// Test that dawg contains all words
    var exactLookup = true;
    for (var i = 0; i < words.length; i++) {
        exactLookup = exactLookup && dawg.lookup(words[i]);
    }
    t.assert(exactLookup, "dawg contains all words");

// Search for a word, not in the structure, but the structure contains a matching word missing a letter at the beginning/middle/end of the word
    exactLookup = true;
    exactLookup = exactLookup && dawg.lookup("abramxis");
    t.assert(exactLookup, "Search for a 'abramxis', not in the structure, but the structure contains, 'abramis,' a matching word missing a letter");

//Search for a word, not in the structure, but contains an extra letter at the beginning/middle/end of the word
    exactLookup = true;
    exactLookup = exactLookup && dawg.lookup("abq");
    t.assert(exactLookup, "Search for a word, not in the structure, but contains an extra letter");

//Search for a word, not in the structure, but the structure contains 1)a word with an extra letter and 2) a word missing a letter at the beginning/middle/end of the word
// In this instance we need to decide which should return.
    exactLookup = true;
    exactLookup = exactLookup && dawg.lookup("abq");
    t.assert(exactLookup, "dawg contains 'abq'");

    t.end();
});
