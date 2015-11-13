var request = require('request');
var queue = require('queue-async');
var zlib = require('zlib');
require('collections/collections.js');

var jsdawg = require("../jsdawg");

var q = queue(1);
var resp, dawg, words, compactDawg;
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

    dawg = new jsdawg.Dawg();
    for (var i = 0; i < words.length; i++) {
        dawg.insert(words[i]);
    }
    compactDawg = dawg.toCompactDawg();

    callback();
});

q.defer(function(callback) {
    console.log("starting bench");
    console.time("search");
    for (var j = 0; j < 100; j++) {
        for (var i = 0; i < words.length; i++) {
            compactDawg.lookupPrefix(words[i]);
        }
    }
    console.timeEnd("search");

    callback();
})