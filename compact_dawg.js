var CompactDawg = function(buf) {
    this.data = buf;
    this.root = this.readNode(0);
}

CompactDawg.prototype.readNode = function(offset) {
    if (offset == null) {
        return {};
    }

    var count = this.data[offset];
    var edges = {};
    for (var i = 0; i < count; i++) {
        var edgeOffset = offset + 1 + (5 * i);
        var letter = this.data[edgeOffset];
        var next_node_offset = this.data.readUInt32LE(edgeOffset + 1);
        edges[letter] = next_node_offset == 0 ? null : next_node_offset;
    }
    return edges;
}

CompactDawg.prototype.lookupPrefix = function(prefix) {
    var search = new Buffer(prefix);
    var node = this.root;
    for (var i = 0; i < search.length; i++) {
        if (node[search[i]] !== undefined) {
            node = this.readNode(node[search[i]]);
        } else {
            return false;
        }
    }
    return true;
}

module.exports = CompactDawg;