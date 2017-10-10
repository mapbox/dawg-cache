var binding = require("./lib/binding/jsdawg.node");
var assert = require("assert");
var Symbol = require("es6-symbol");

function validate(buf) {
    // validate data
    var magic = buf.slice(0, 4).toString();
    var version = buf[4];
    var charWidth = buf[5];
    var nodeWidth = buf[6];
    var offsetWidth = buf[7];
    var size = buf.readUInt32LE(8);
    var checksum = buf.readUInt32LE(12);

    var structure = buf.slice(16);
    var actualSize = structure.length;
    var actualChecksum = binding.crc32c(structure);

    assert(magic == "dawg", "dawg magic phrase is incorrect");
    assert(version == 1, "dawg version should be 1");
    assert(charWidth == 1, "only dawgs with one-byte chars are supported");
    assert(nodeWidth == 1 || nodeWidth == 5, "only dawgs with one- or five-byte edge count widths are supported");
    assert(offsetWidth == 4, "only dawgs with four-byte offset widths are supported");
    assert(size == actualSize, "dawg size is not as expected");
    assert(checksum == actualChecksum, "dawg checksum is not correct");
    return buf;
}

var EDGE_COUNT_ONLY = 1,
    INCLUDES_ENTRY_COUNT = 5;

binding.Dawg.prototype.toCompactDawg = function(preserveCounts) {
    return new binding.CompactDawg(validate(this.toCompactDawgBuffer(preserveCounts)));
}

binding.CompactDawg.prototype.lookupPrefix = function(prefix) {
    return this._lookup(prefix) != 0;
}

binding.CompactDawg.prototype.lookup = function(prefix) {
    var lookup = this._lookup(prefix);
    return lookup == 2 || lookup[0] == 2;
}

binding.CompactDawg.prototype.lookupPrefixCounts = function(prefix) {
    var result = this._lookup(prefix);
    if (result != 0) {
        return {found: true, index: result[1], suffixCount: result[2], text: result[3] ? result[3] : prefix};
    } else {
        return {found: false}
    }
}

binding.CompactDawg.prototype.lookupCounts = function(prefix) {
    var result = this._lookup(prefix);
    if (result != 0 && result[0] == 2) {
        return {found: true, index: result[1], suffixCount: result[2], text: result[3] ? result[3] : prefix};
    } else {
        return {found: false}
    }
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

module.exports = {
    Dawg: binding.Dawg,
    CompactDawg: binding.CompactDawg
};
