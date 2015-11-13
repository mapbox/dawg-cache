var binding = require("./lib/jsdawg.node");

binding.Dawg.prototype.toCompactDawg = function() {
    return new CompactDawg(this.toCompactDawgBuffer());
}

var CompactDawg = function(buf) {
    this.data = buf;
}

CompactDawg.prototype.lookupPrefix = function(prefix) {
    return binding.compactDawgBufferLookupPrefix(this.data, prefix);
}

module.exports = {
    Dawg: binding.Dawg,
    CompactDawg: CompactDawg
};
