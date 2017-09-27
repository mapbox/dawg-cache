#!/usr/bin/env node

var jsdawg = require("../index");
var minimist = require("minimist");
var fs = require("fs");
var forOf = require("es6-iterator/for-of");

var argv = require('minimist')(process.argv.slice(2));

var input = (argv._.length == 0 || argv._[0] == "-") ? process.stdin : fs.createReadStream(argv._[0]);
var output = (argv._.length < 2 || argv._[1] == "-") ? process.stdout : fs.createWriteStream(argv._[1]);

var chunks = [];
input.on('data', function(chunk) { chunks.push(chunk); });
input.on('end', function() {
    var data = Buffer.concat(chunks);
    var compactDawg = new jsdawg.CompactDawg(data);
    forOf(compactDawg, function(value) {
        console.log(value);
    })
});
