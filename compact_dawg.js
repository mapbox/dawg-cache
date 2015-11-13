var CompactDawg = function(buf) {
    this.data = buf;
}

CompactDawg.prototype.lookupPrefix = function(prefix) {
    var search = new Buffer(prefix);
    var nodeOffset = 0;
    var data = this.data;

    for (var i = 0; i < search.length; i++) {
        // binary search over the node edges
        var match = false;
        var searchLetter = search[i];

        if (nodeOffset != null) {
            var edgeCount = data[nodeOffset];

            var min = 0;
            var max = edgeCount - 1;
            var guess;

            while (min <= max) {
                guess = (min + max) >> 1;
                var edgeOffset = nodeOffset + 1 + (5 * guess);
                var letter = data[edgeOffset];
                if (letter === searchLetter) {
                    match = true;
                    break;
                }
                else {
                    if (letter < searchLetter) {
                        min = guess + 1;
                    } else {
                        max = guess - 1;
                    }
                }
            }
        }
        if (match) {
            nodeOffset = data.readUInt32LE(edgeOffset + 1);
            if (nodeOffset == 0) nodeOffset = null;
        } else {
            return false;
        }
    }
    return true;
}

module.exports = CompactDawg;