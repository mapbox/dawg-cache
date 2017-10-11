var test = require('tape');
var request = require('request');
var queue = require('queue-async');
var zlib = require('zlib');
var forOf = require('es6-iterator/for-of');
require('collections/collections.js');
var binding = require("../lib/jsdawg.node");
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
        exactLookup = exactLookup && dawg.lookup(words[i]);
    }
    t.assert(exactLookup, "dawg contains all words");

// Search for a word, not in the structure, but the structure contains a matching word missing a letter at the beginning/middle/end of the word
    // beginning
    exactLookup = true;
    exactLookup = exactLookup && dawg.lookup("tyeomaness");
    t.assert(exactLookup, "Search 'tyeomaness' returns 'yeomaness'");
    // middle
    exactLookup = true;
    exactLookup = exactLookup && dawg.lookup("yeomtaness");
    t.assert(exactLookup, "Search 'yeomtaness' returns 'yeomaness'");
    // end
    exactLookup = true;
    exactLookup = exactLookup && dawg.lookup("yeomanesst");
    t.assert(exactLookup, "Search 'yeomanesst' returns 'yeomaness'");

//Search for a word, not in the structure, but contains an extra letter at the beginning/middle/end of the word
    // beginning
    exactLookup = true;
    exactLookup = exactLookup && dawg.lookup("tyeniseian");
    t.assert(exactLookup, "Search 'tyeniseian' returns 'yeniseian'");
    // middle
    exactLookup = true;
    exactLookup = exactLookup && dawg.lookup("yenisteian");
    t.assert(exactLookup, "Search 'yenisteian' returns 'yeniseian");
    // end 
    exactLookup = true;
    exactLookup = exactLookup && dawg.lookup("yeniseiant");
    t.assert(exactLookup, "Search 'yeniseiant' returns 'yeniseian");

//Search for a word, not in the structure, but the structure contains 1)a word with an extra letter and 2) a word missing a letter at the beginning/middle/end of the word
// In this instance we need to decide which should return.
    exactLookup = true;
    exactLookup = exactLookup && dawg.lookup("dogtg");
    t.assert(exactLookup, "Search 'dogtg' returns 'dog' instead of 'dogg'");

// Search for a word, not in the structure, but the structure contains multiple options
    exactLookup = true;
    exactLookup = exactLookup && dawg.lookup("cat");
    t.assert(exactLookup, "Search 'cat' returns 'cart' instead of 'cast'");

//more than one occurence of a character should return null, which is falsey
    exactLookup = true;
    exactLookup = exactLookup && dawg.lookup("wrongheeeeadedness");
    t.assert(!exactLookup, "Search 'wrongheeeeadedness' returns null");

//deletion of a correct character should retrurn null, which is falsey
    exactLookup = true;
    exactLookup = exactLookup && dawg.lookup("wrog");
    t.assert(!exactLookup, "Search 'wrogheadness' returns null");

    t.end();
});

