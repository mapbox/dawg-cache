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
    var fuzzedDawg = compactDawg.lookup("eomaness", true);
    t.assert(fuzzedDawg, "Search 'eomaness' returns 'yeomaness' -- beginning deletion");
    // t.equals(fuzzedDawg.exact_match, false, "exact_match equals false")
    // middle
    fuzzedDawg = compactDawg.lookup("yeoaness", true);
    t.assert(fuzzedDawg, "Search 'yeoaness' returns 'yeomaness' -- middle deletion");
    // t.equals(fuzzedDawg.exact_match, false, "exact_match equals false")
    // end

    // This test will need to be altered upon a fix for the lookupPrefix fuzziness
    fuzzedDawg = compactDawg.lookup("yeomanes", false);
    t.assert(!fuzzedDawg, "Search 'yeomanes' returns 'yeomaness' -- end deletion");
    // t.equals(fuzzedDawg.exact_match, false, "exact_match equals false")

//Search for a word, not in the structure, but contains an extra letter at the beginning/middle/end of the word
    // actual
    fuzzedDawg = compactDawg.lookup("yeniseian", true);
    t.assert(fuzzedDawg, "Search 'yeniseian' returns 'yeniseian'");
    t.equals(fuzzedDawg.exact_match, true, "exact_match equals true -- exact_match")
    // beginning
    fuzzedDawg = compactDawg.lookup("tyeniseian", true);
    t.assert(fuzzedDawg, "Search 'tyeniseian' returns 'yeniseian'");
    t.equals(fuzzedDawg.exact_match, false, "exact_match equals false -- beginning addition")
    // middle
    fuzzedDawg = compactDawg.lookup("yenisteian", true);
    t.assert(fuzzedDawg, "Search 'yenisteian' returns 'yeniseian");
    t.equals(fuzzedDawg.exact_match, false, "exact_match equals false -- middle addition")
    // end
    fuzzedDawg = compactDawg.lookup("yeniseiant", true);
    t.assert(fuzzedDawg, "Search 'yeniseiant' returns 'yeniseian");
    t.equals(fuzzedDawg.exact_match, false, "exact_match equals false -- end addition")
//Search for a word, not in the structure, but the structure contains 1)a word with an extra letter and 2) a word missing a letter at the beginning/middle/end of the word
// In this instance we need to decide which should return.
    fuzzedDawg = compactDawg.lookup("dogtg", true);
    t.assert(fuzzedDawg, "Search 'dogtg' returns 'dog' instead of 'dogg'");

// Search for a word, not in the structure, but the structure contains multiple options
    fuzzedDawg = compactDawg.lookup("cat", true);
    t.assert(fuzzedDawg, "Search 'cat' returns 'cart' instead of 'cast'");

//more than one occurence of a character should return null, which is falsey
    fuzzedDawg = compactDawg.lookup("wrongheeeeadedness");
    t.assert(!fuzzedDawg, "Search 'wrongheeeeadedness' returns null");

//deletion of a correct character should retrurn null, which is falsey
    fuzzedDawg = compactDawg.lookup("wrogheadness");
    t.assert(!fuzzedDawg, "Search 'wrogheadness' returns null");

//search for something without a space
    fuzzedDawg = compactDawg.lookup("wallst", true);
    t.assert(fuzzedDawg, "Search 'wallst' returns wall st");

//Oklahoma Oakland example -- haven't done
    fuzzedDawg = compactDawg.lookup("okland", true);
    console.log('oakland example', fuzzedDawg);
    // t.assert(fuzzedDawg, "Search 'tyeniseian' returns 'yeniseian'");
    // t.equals(fuzzedDawg.exact_match, false, "exact_match equals false")

    t.end();
});
