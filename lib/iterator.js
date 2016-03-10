var IS_FINAL_FLAG = 0x80000000,
    NOT_FINAL_FLAG = 0,
    FINAL_MASK = 0x7fffffff;

var CompactIterator = function(buff) {
    this.data = buff.slice(16);
    this.currentWord = [];
    this.stack = [];

    this.stack.push({
        nodeOffset: 0,
        edgeIdx: 0,
        visited: false
    });
}

CompactIterator.prototype.next = function() {
    var flaggedOffset, nextFinal = 0;
    var nextOffset = 0, edgeCount, edgeOffset;
    var letter;

    var output;
    var hasOutput = false;

    while (this.stack.length > 0 && !hasOutput) {
        var currentPosition = this.stack[this.stack.length - 1];

        edgeOffset = currentPosition.nodeOffset + 1 + (5 * currentPosition.edgeIdx);
        letter = String.fromCharCode(this.data[edgeOffset]);

        flaggedOffset = this.data.readUInt32LE(edgeOffset + 1);
        nextOffset = flaggedOffset & FINAL_MASK;
        nextFinal = flaggedOffset & IS_FINAL_FLAG;

        if (nextFinal && !currentPosition.visited) {
            hasOutput = true;
            output = this.currentWord.join("") + letter;
        }

        if (nextOffset == 0 || currentPosition.visited) {
            this.stack.pop();

            if (this.stack.length) this.stack[this.stack.length - 1].visited = true;

            edgeCount = this.data[currentPosition.nodeOffset];
            if (currentPosition.edgeIdx < edgeCount - 1) {
                // done with the children, but still have siblings so move laterally
                this.stack.push({
                    nodeOffset: currentPosition.nodeOffset,
                    edgeIdx: currentPosition.edgeIdx + 1,
                    visited: false
                });
            } else {
                // otherwise we'll move back up the tree
                this.currentWord.pop();
            }
        } else {
            // "recurse" down
            this.stack.push({
                nodeOffset: nextOffset,
                edgeIdx: 0,
                visited: false
            });
            this.currentWord.push(letter);
        }
    }

    if (hasOutput) {
        return output;
    }

    return;
}

module.exports = CompactIterator
