#!/usr/bin/env node

var jsdawg = require("../index");
var readline = require("readline");
var minimist = require("minimist");
var fs = require("fs");

var argv = require('minimist')(process.argv.slice(2));

var input = (argv._.length == 0 || argv._[0] == "-") ? process.stdin : fs.createReadStream(argv._[0]);
var output = (argv._.length < 2 || argv._[1] == "-") ? process.stdout : fs.createWriteStream(argv._[1]);

var dawg = new jsdawg.Dawg();

var rl = readline.createInterface({
    input: input,
    output: process.stdout,
    terminal: false
});

rl.on('line', function(line) {
    line = line.trim();
    if (line.length) {
        dawg.insert(line);
    }
});

rl.on('close', function() {
    dawg.finish();
    output.write(dawg.toCompactDawgBuffer());
});