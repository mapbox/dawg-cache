// based on python code by Steve Hanov, 2011

#include <exception>
#include <algorithm>
#include <map>
#include <unordered_map>
#include <vector>
#include <memory>

class DawgNode {
    public:
        unsigned int id;
        bool final;
        std::map<unsigned char, std::shared_ptr<DawgNode> > edges;
        unsigned int count;
        DawgNode();
        uint num_reachable();

    operator std::string() {
        std::string out = "";
        if (this->final) {
            out += "1_";
        } else {
            out += "0_";
        }

        char label;
        std::shared_ptr<DawgNode> child;
        for (std::map<unsigned char, std::shared_ptr<DawgNode> >::iterator it = this->edges.begin(); it != this->edges.end(); ++it) {
            label = it->first;
            child = it->second;

            out.push_back(label);
            out.push_back('_');

            out += std::to_string(child->id);
            out.push_back('_');
        }

        // remove final _
        out.pop_back();
        return out;
    }
};

DawgNode::DawgNode(void) {
    this->id = 0;
    this->final = false;

    // Number of end nodes reachable from this one.
    this->count = 0;
}

uint DawgNode::num_reachable(void) {
    // if a count is already assigned, return it
    if (this->count) return this->count;

    // count the number of final nodes that are reachable from this one.
    // including self
    int counter = 0;
    if (this->final) counter += 1;
    for (std::map<unsigned char, std::shared_ptr<DawgNode> >::iterator it=this->edges.begin(); it!=this->edges.end(); ++it) {
        counter += it->second->num_reachable();
    }

    this->count = counter;
    return counter;
}

class DawgNodeCheckEntry {
    public:
        std::shared_ptr<DawgNode> parent;
        char letter;
        std::shared_ptr<DawgNode> child;
};

class Dawg {
    public:
        std::string previous_word;
        std::shared_ptr<DawgNode> root;
        std::vector<DawgNodeCheckEntry> unchecked_nodes;
        std::unordered_map<std::string, std::shared_ptr<DawgNode> > minimized_nodes;
        int node_counter;
        Dawg();
        bool insert(std::string word);
        void finish();
        bool lookup(std::string word);
        uint edge_count();
        uint node_count();
    private:
        void _minimize(int down_to);
};

Dawg::Dawg(void) {
    this->previous_word = "";
    this->node_counter = 1;
    this->root = std::make_shared<DawgNode>();
}

bool Dawg::insert(std::string word) {
    if (word <= this->previous_word) {
        return false;
    }

    // find common prefix between word and previous word
    unsigned int common_prefix = 0;
    unsigned int range = std::min(word.length(), this->previous_word.length());
    for (uint i = 0; i < range; i++) {
        if (word[i] != this->previous_word[i]) {
            break;
        }
        common_prefix += 1;
    }

    // Check the unchecked_nodes for redundant nodes, proceeding from last
    // one down to the common prefix size. Then truncate the list at that
    // point.
    this->_minimize(common_prefix);

    // add the suffix, starting from the correct node mid-way through the
    // graph
    std::shared_ptr<DawgNode> node;
    if (this->unchecked_nodes.empty()) {
        node = this->root;
    } else {
        node = this->unchecked_nodes.back().child;
    }

    DawgNodeCheckEntry check_entry;
    for (size_t i = common_prefix; i < word.length(); i++) {
        char letter = word[i];

        std::shared_ptr<DawgNode> next_node = std::make_shared<DawgNode>();
        next_node->id = this->node_counter;
        this->node_counter++;

        node->edges[letter] = next_node;

        check_entry.parent = node;
        check_entry.letter = letter;
        check_entry.child = next_node;
        this->unchecked_nodes.push_back(check_entry);

        node = next_node;
    }

    node->final = true;
    this->previous_word = word;

    return true;
}

void Dawg::finish() {
    // minimize all unchecked_nodes
    this->_minimize(0);

    // go through entire structure and assign the counts to each node.
    this->root->num_reachable();
}

void Dawg::_minimize(int down_to) {
    // proceed from the leaf up to a certain point
    DawgNodeCheckEntry to_check;
    std::string child_string;

    for (int i = this->unchecked_nodes.size() - 1; i >= down_to; i--) {
        to_check = this->unchecked_nodes[i];
        child_string = (*(to_check.child)).operator std::string();
        if (this->minimized_nodes.count(child_string) > 0) {
            // replace the child with the previously encountered one
            to_check.parent->edges[to_check.letter] = this->minimized_nodes[child_string];
        } else {
            // add the state to the minimized nodes.
            this->minimized_nodes[child_string] = to_check.child;
        }
        this->unchecked_nodes.pop_back();
    }
}

bool Dawg::lookup(std::string word) {
    std::shared_ptr<DawgNode> node = this->root;

    char letter;
    for (uint i = 0; i < word.length(); i++) {
        letter = word[i];
        if (node->edges.count(letter) == 0) {
            return false;
        } else {
            node = node->edges[letter];
        }
    }

    if (node->final) {
        return true;
    }
    return false;
}

uint Dawg::node_count() {
    return this->minimized_nodes.size();
}

uint Dawg::edge_count() {
    uint count = 0;
    std::shared_ptr<DawgNode> node;
    std::string label;
    for (std::unordered_map<std::string, std::shared_ptr<DawgNode> >::iterator it = this->minimized_nodes.begin(); it != this->minimized_nodes.end(); ++it) {
        label = it->first;
        node = it->second;
        count += node->edges.size();
    }
    return count;
}