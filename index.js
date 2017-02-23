var binding = require("./lib/jsdawg.node");
var assert = require("assert");
var Symbol = require("es6-symbol");

function validate(buf) {
    // validate data
    var magic = buf.slice(0, 4).toString();
    var version = buf[4];
    var charWidth = buf[5];
    var edgeCountWidth = buf[6];
    var offsetWidth = buf[7];
    var size = buf.readUInt32LE(8);
    var checksum = buf.readUInt32LE(12);

    var structure = buf.slice(16);
    var actualSize = structure.length;
    var actualChecksum = binding.crc32c(structure);

    assert(magic == "dawg", "dawg magic phrase is incorrect");
    assert(version == 1, "dawg version should be 1");
    assert(charWidth == 1, "only dawgs with one-byte chars are supported");
    assert(edgeCountWidth == 1, "only dawgs with one-byte edge count widths are supported");
    assert(offsetWidth == 4, "only dawgs with four-byte offset widths are supported");
    assert(size == actualSize, "dawg size is not as expected");
    assert(checksum == actualChecksum, "dawg checksum is not correct");
    return buf;
}

binding.Dawg.prototype.toCompactDawg = function() {
    return new binding.CompactDawg(validate(this.toCompactDawgBuffer()));
}

binding.Dawg.prototype.toCompactDawgIterator = function() {
    return new CompactDawgIterator(validate(this.toCompactDawgBuffer()));
}

binding.CompactDawg.prototype.lookupPrefix = function(prefix) {
    return this._lookup(prefix) != 0;
}

binding.CompactDawg.prototype.lookup = function(prefix) {
    return this._lookup(prefix) == 2;
}

binding.CompactDawg.prototype.iterator = function(prefix) {
    // implement the ES6 iterator pattern
    var it = prefix ? this._iterator(prefix) : this._iterator();
    return {
        next: prefix ?
            function() {
                var n = it.next();
                out = {done: n === undefined};
                out.value = out.done ? n : prefix + n;
                return out;
            } :
            function() {
                var n = it.next();
                return {value: n, done: n === undefined};
            }
    }
}

binding.CompactDawg.prototype[Symbol.iterator] = binding.CompactDawg.prototype.iterator;

var CompactDawgIterator = function(buf) {
    this.data = buf;
}

CompactDawgIterator.prototype.iterator = function(prefix) {
    // implement the ES6 iterator pattern
    var it = prefix ? new binding.CompactDawgIterator(this.data, prefix) : new binding.CompactDawgIterator(this.data);
    return {
        next: prefix ?
            function() {
                var n = it.next();
                out = {done: n === undefined};
                out.value = out.done ? n : prefix + n;
                return out;
            } :
            function() {
                var n = it.next();
                return {value: n, done: n === undefined};
            }
    }
}

CompactDawgIterator.prototype[Symbol.iterator] = CompactDawgIterator.prototype.iterator;

module.exports = {
    Dawg: binding.Dawg,
    CompactDawg: binding.CompactDawg,
    CompactDawgIterator: CompactDawgIterator
};
