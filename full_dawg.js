var binding = require("./lib/jsdawg.node");
var CompactDawg = require("./compact_dawg");

console.log('imported');

binding.Dawg.prototype.toCompactDawg = function() {
    return new CompactDawg(this.toCompactDawgBuffer());
}

module.exports = binding.Dawg;