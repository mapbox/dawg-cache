module.exports = {};
module.exports.CompactDawg = require("./compact_dawg");

// make the full dawg implementation be lazy-loaded so C++ code isn't needed in production
module.exports.__defineGetter__("Dawg", function() { return require("./full_dawg"); });