var binding = require("./lib/jsdawg.node");

binding.Dawg.prototype.toCompactDawg = function() {
    return new CompactDawg(this.toCompactDawgBuffer());
}

var CompactDawg = function(buf) {
    this.data = buf;
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
