// based on python code by Steve Hanov, 2011

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

    std::string to_string() {
        std::string out = "";
        if (final) {
            out += "1_";
        } else {
            out += "0_";
        }

        for (auto const& edge : edges) {
            out.push_back(edge.first);
            out.push_back('_');
            out += std::to_string(edge.second->id);
            out.push_back('_');
        }

        // remove final _
        out.pop_back();
        return out;
    }
};

DawgNode::DawgNode() {
    id = 0;
    final = false;

    // Number of end nodes reachable from this one.
    count = 0;
}

uint DawgNode::num_reachable() {
    // if a count is already assigned, return it
    if (count) return count;

    // count the number of final nodes that are reachable from this one.
    // including self
    int counter = 0;
    if (final) counter += 1;
    for (auto const& edge : edges) {
        counter += edge.second->num_reachable();
    }

    count = counter;
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
        bool insert(const char * data, std::size_t len);
        void finish();
        bool lookup(std::string word);
        bool lookup_prefix(std::string word);
        uint edge_count();
        uint node_count();
    private:
        void _minimize(int down_to);
};

Dawg::Dawg() {
    previous_word = "";
    node_counter = 1;
    root = std::make_shared<DawgNode>();
}

bool Dawg::insert(const char* data, std::size_t len) {
    std::string word(data,len);
    // This does lexigraphical compare
    // http://en.cppreference.com/w/cpp/algorithm/lexicographical_compare
    if (word <= previous_word) {
        return false;
    }

    // find common prefix between word and previous word
    unsigned int common_prefix = 0;
    unsigned int range = std::min(len, previous_word.length());
    for (uint i = 0; i < range; i++) {
        if (word[i] != previous_word[i]) {
            break;
        }
        common_prefix += 1;
    }

    // Check the unchecked_nodes for redundant nodes, proceeding from last
    // one down to the common prefix size. Then truncate the list at that
    // point.
    _minimize(common_prefix);

    // add the suffix, starting from the correct node mid-way through the
    // graph
    std::shared_ptr<DawgNode> node;
    if (unchecked_nodes.empty()) {
        node = root;
    } else {
        node = unchecked_nodes.back().child;
    }

    DawgNodeCheckEntry check_entry;
    for (size_t i = common_prefix; i < len; i++) {
        char letter = word[i];

        std::shared_ptr<DawgNode> next_node = std::make_shared<DawgNode>();
        next_node->id = node_counter;
        node_counter++;

        node->edges[letter] = next_node;

        check_entry.parent = node;
        check_entry.letter = letter;
        check_entry.child = next_node;
        unchecked_nodes.push_back(check_entry);

        node = next_node;
    }

    node->final = true;
    previous_word = std::move(word);

    return true;
}

void Dawg::finish() {
    // minimize all unchecked_nodes
    _minimize(0);

    // go through entire structure and assign the counts to each node.
    root->num_reachable();
}

void Dawg::_minimize(int down_to) {
    // proceed from the leaf up to a certain point

    for (int i = unchecked_nodes.size() - 1; i >= down_to; i--) {
        DawgNodeCheckEntry & to_check = unchecked_nodes[i];
        std::string child_string = to_check.child->to_string();
        if (minimized_nodes.count(child_string) > 0) {
            // replace the child with the previously encountered one
            to_check.parent->edges[to_check.letter] = minimized_nodes[child_string];
        } else {
            // add the state to the minimized nodes.
            minimized_nodes[child_string] = to_check.child;
        }
        unchecked_nodes.pop_back();
    }
}

bool Dawg::lookup(std::string word) {
    std::shared_ptr<DawgNode> node = root;

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

bool Dawg::lookup_prefix(std::string word) {
    std::shared_ptr<DawgNode> node = root;

    for (uint i = 0; i < word.length(); i++) {
        char letter = word[i];
        if (node->edges.count(letter) == 0) {
            return false;
        } else {
            node = node->edges[letter];
        }
    }

    return true;
}

uint Dawg::node_count() {
    return minimized_nodes.size();
}

uint Dawg::edge_count() {
    uint count = 0;
    for (auto const& min_node : minimized_nodes) {
        count += min_node.second->edges.size();
    }
    return count;
}