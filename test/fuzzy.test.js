var test = require('tape');
var request = require('request');
var queue = require('queue-async');
var zlib = require('zlib');
var forOf = require('es6-iterator/for-of');
require('collections/collections.js');
var binding = require("../lib/binding/jsdawg.node");
var fs = require("fs");
var jsdawg = require("../index");

var resp, dawg, wordSet;
var words = [];

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
        exactLookup = exactLookup && compactDawg.lookup(words[i]);
    }
    t.assert(exactLookup, "dawg contains all words");

// Search for a word, not in the structure, but the structure contains a matching word missing a letter at the beginning/middle/end of the word
    // beginning
    var fuzzed = compactDawg.lookup("eomaness", false);
    t.assert(fuzzed, "Search 'eomaness' returns 'yeomaness'");
    // t.equals(fuzzed.exact_match, false, "exact_match equals false")
    // middle
    fuzzed = compactDawg.lookup("yeoaness", true);
    t.assert(fuzzed, "Search 'yeoaness' returns 'yeomaness'");
    // t.equals(fuzzed.exact_match, false, "exact_match equals false")
    // end
    fuzzed = compactDawg.lookup("yeomanes", true);
    t.assert(fuzzed, "Search 'yeomanes' returns 'yeomaness'");
    // t.equals(fuzzed.exact_match, false, "exact_match equals false")

//Search for a word, not in the structure, but contains an extra letter at the beginning/middle/end of the word
    // actual
    fuzzed = compactDawg.lookup("yeniseian", true);
    t.assert(fuzzed, "Search 'yeniseian' returns 'yeniseian'");
    t.equals(fuzzed.exact_match, true, "exact_match equals true")
    // beginning
    fuzzed = compactDawg.lookup("tyeniseian", true);
    t.assert(fuzzed, "Search 'tyeniseian' returns 'yeniseian'");
    t.equals(fuzzed.exact_match, false, "exact_match equals false")
    // middle
    fuzzed = compactDawg.lookup("yenisteian", true);
    t.assert(fuzzed, "Search 'yenisteian' returns 'yeniseian");
    t.equals(fuzzed.exact_match, false, "exact_match equals false")
    // end
    fuzzed = compactDawg.lookup("yeniseiant", true);
    t.assert(fuzzed, "Search 'yeniseiant' returns 'yeniseian");
    t.equals(fuzzed.exact_match, false, "exact_match equals false")
    t.equals(fuzzed.exact_match, false, "exact_match equals false")
//Search for a word, not in the structure, but the structure contains 1)a word with an extra letter and 2) a word missing a letter at the beginning/middle/end of the word
// In this instance we need to decide which should return.
    fuzzed = compactDawg.lookup("dogtg");
    t.assert(fuzzed, "Search 'dogtg' returns 'dog' instead of 'dogg'");

// Search for a word, not in the structure, but the structure contains multiple options
    fuzzed = compactDawg.lookup("cat");
    t.assert(fuzzed, "Search 'cat' returns 'cart' instead of 'cast'");

//more than one occurence of a character should return null, which is falsey
    fuzzed = compactDawg.lookup("wrongheeeeadedness");
    t.assert(!fuzzed, "Search 'wrongheeeeadedness' returns null");

//deletion of a correct character should retrurn null, which is falsey
    fuzzed = compactDawg.lookup("wrogheadness");
    t.assert(!fuzzed, "Search 'wrogheadness' returns null");

    t.end();
});
