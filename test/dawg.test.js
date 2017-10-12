var test = require('tape');
var request = require('request');
var queue = require('queue-async');
var zlib = require('zlib');
var forOf = require('es6-iterator/for-of');
require('collections/collections.js');

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

    dawg.insert('z');
    t.throws(function() { dawg.insert('a'); }, 'words must be inserted in lexicographical order');
    dawg.finish();

    var compactDawg = dawg.toCompactDawg();
    t.equals(compactDawg.lookup(), null);
    t.equals(compactDawg.lookupPrefix(), null);
    t.equals(compactDawg.lookup({}), null);
    t.equals(compactDawg.lookupPrefix({}), null);

    // ensure a non-construct call also works
    t.doesNotThrow(function() { jsdawg.Dawg(); });

    // test compact dawg constructor directly
    t.throws(function() { jsdawg.CompactDawg(); })
    t.throws(function() { new jsdawg.CompactDawg(); });
    t.throws(function() { new jsdawg.CompactDawg(42); })
    t.throws(function() { new jsdawg.CompactDawg({}); });

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

    dawg.finish();

    // I don't care about the values these functions return at all... they exist
    // only for debugging and are not exercised ever in typical usage.
    // but, run them anyway, and ensure that, I dunno, they don't crash? so that
    // the coverage tool shuts up
    t.ok(dawg.edgeCount(), "edge count works");
    t.ok(dawg.nodeCount(), "node count works");

    t.end();
});

test('Compact DAWG test', function(t) {
    var compactDawg = dawg.toCompactDawg(false);
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
        lookupFailure = lookupFailure && (!compactDawg.lookup(words[i] + "qzz"));
        lookupFailure = lookupFailure && (!compactDawg.lookupPrefix(words[i] + "qzz"));
    }
    t.assert(lookupFailure, "compact dawg does not contain any words with 'qzz' added to the end as term or prefix");

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

    t.equals(compactDawg.lookup(new Array(2048).fill('a').join('')), null, 'searches for very long strings behave themselves');

    t.end();
});

test('Compact DAWG test with embedded counts', function(t) {
    var compactDawg = dawg.toCompactDawg(true);
    t.pass("compact dawg created with counts")

    var exactLookup = true;
    var exactIndexes = true;
    for (var i = 0; i < words.length; i++) {
        var match = compactDawg.lookup(words[i]);
        exactLookup = exactLookup && match && (typeof match.index !== "undefined");
        exactIndexes = exactIndexes && (match.index == i);
    }
    t.assert(exactLookup, "compact dawg contains all words");
    t.assert(exactIndexes, "compact dawg's indexes match insertion word order");

    var inverseLookup = true;
    var inverseText = true;
    for (var i = 0; i < words.length; i++) {
        var match = compactDawg.lookup(i);
        inverseLookup = inverseLookup && match && (typeof match.index !== "undefined");
        inverseText = inverseText && (match.text == words[i]);
    }
    t.assert(inverseLookup, "compact dawg lookup by index retrieves all words");
    t.assert(inverseText, "compact dawg retrieved word text is correct");

    var prefixLookup = true;
    var prefixIndexes = true;
    for (var i = 0; i < words.length; i++) {
        var match = compactDawg.lookupPrefix(words[i]);
        prefixLookup = prefixLookup && match && (typeof match.index !== "undefined");
        prefixIndexes = prefixIndexes && (match.index == i);
    }
    t.assert(prefixLookup, "compact dawg contains all words as prefixes");
    t.assert(prefixIndexes, "compact dawg's indexes match insertion word order on prefix lookup");

    var prefixLookup = true;
    var prefixIndexes = true;
    for (var i = 0; i < words.length; i++) {
        if (words[i].length == 1) continue;

        var prefix = words[i].substring(0, words[i].length - 1);
        var match = compactDawg.lookupPrefix(prefix);

        // here we would expect either the indexes to match, or the index that is returned
        // to be lower and to point to a word that shares a prefix
        prefixIndexes = prefixIndexes && (
            match.index == i ||
            (match.index < i && words[match.index].substring(0, prefix.length) == prefix)
        );

        prefixLookup = prefixLookup && match;
    }
    t.assert(prefixLookup, "compact dawg contains prefixes of all words as prefixes");
    t.assert(prefixIndexes, "compact dawg prefixes have expected indexes");

    var testMatch = compactDawg.lookupPrefix("test");
    t.assert(testMatch, "'test' found");
    t.assert(testMatch.index == words.indexOf("test"), "'test' index is correct");
    t.assert(testMatch.suffixCount == 82, "'test' has 82 suffixes");

    var blea_idx;
    for (blea_idx = 0; blea_idx < words.length; blea_idx++) {
        if (words[blea_idx].substr(0, 4) == 'blea') break;
    }
    var blea_count = 0;
    while (words[blea_idx + blea_count].substr(0, 4) == 'blea') blea_count += 1;

    testMatch = compactDawg.lookupPrefix("blea");
    t.assert(testMatch, "'blea' found");
    t.assert(testMatch.index == blea_idx, "'blea' index is correct");
    t.assert(testMatch.suffixCount == blea_count, "'blea' has correct number of suffixes");

    var compactDawgWords = [];
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
    var priNext = prefixIterator.next();
    while (!priNext.done) {
        prefixWords.push(priNext.value);
        priNext = prefixIterator.next();
    }
    t.equal(prefixWords.length, 9, "got 9 results for prefix '阿'");
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
        lookupFailure = lookupFailure && (!compactDawg.lookup(words[i] + "qzz"));
        lookupFailure = lookupFailure && (!compactDawg.lookupPrefix(words[i] + "qzz"));
    }
    t.assert(lookupFailure, "compact dawg does not contain any words with 'qzz' added to the end as term or prefix");

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
    var emptyPrefix = compactDawg.lookupPrefix("");
    t.assert(emptyPrefix, "compact dawg does contain the empty string as a prefix");
    t.deepEquals(
        emptyPrefix,
        { final: false, index: 0, suffixCount: words.length, text: ''},
        "compact dawg empty string prefix search returns a suffix count equal to the total number of words"
    );

    t.end();
});