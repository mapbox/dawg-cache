var binding = require("./lib/jsdawg.node");
var crc32c = require("fast-crc32c");
var assert = require("assert");

binding.Dawg.prototype.toCompactDawg = function() {
    return new CompactDawg(this.toCompactDawgBuffer());
}

var CompactDawg = function(buf) {
    this.data = buf;

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
    var actualChecksum = crc32c.calculate(structure, 0);

    assert(magic == "dawg", "dawg magic phrase is incorrect");
    assert(version == 1, "dawg version should be 1");
    assert(charWidth == 1, "only dawgs with one-byte chars are supported");
    assert(edgeCountWidth == 1, "only dawgs with one-byte edge count widths are supported");
    assert(offsetWidth == 4, "only dawgs with four-byte offset widths are supported");
    assert(size == actualSize, "dawg size is not as expected");
    assert(checksum == actualChecksum, "dawg checksum is not correct");
}

CompactDawg.prototype.lookupPrefix = function(prefix) {
    return binding.compactDawgBufferLookup(this.data, prefix) != 0;
}

CompactDawg.prototype.lookup = function(prefix) {
    return binding.compactDawgBufferLookup(this.data, prefix) == 2;
}

module.exports = {
    Dawg: binding.Dawg,
    CompactDawg: CompactDawg
};
