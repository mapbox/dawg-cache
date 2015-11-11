#include <time.h>
#include <iostream>
#include <unordered_map>
#include <memory>
#include "dawg.cpp"

using namespace std;

void write_node(shared_ptr<DawgNode> node, std::vector<unsigned char>* output, std::vector<unsigned int>* edge_locs, std::unordered_map<unsigned int, unsigned int>* node_locs) {
    if (node_locs->count(node->id) > 0) {
        // already visited
        return;
    }

    int offset = output->size();
    (*node_locs)[node->id] = offset;

    output->push_back(static_cast<unsigned char>(node->edges.size()));

    std::vector<std::shared_ptr<DawgNode> > nodes_to_process;
    std::shared_ptr<DawgNode> child;
    int i = 0;
    for (std::map<unsigned char, std::shared_ptr<DawgNode> >::iterator it = node->edges.begin(); it != node->edges.end(); ++it) {
        char edge_key = it->first;
        child = it->second;

        int edge_offset = (i * 5) + offset + 1;
        unsigned int node_id;

        if (child->edges.size() == 0) {
            node_id = 0;
        } else {
            nodes_to_process.push_back(child);
            node_id = child->id;
        }

        output->push_back(edge_key);

        int cur_size = output->size();
        output->resize(cur_size + sizeof(unsigned int));
        memcpy(&((*output)[cur_size]), &node_id, sizeof(unsigned int));

        edge_locs->push_back(edge_offset);
        i++;
    }

    for (size_t i = 0; i < nodes_to_process.size(); i++) {
        write_node(nodes_to_process[i], output, edge_locs, node_locs);
    }
}

bool build_dawg(std::istream *input_stream, std::ostream *output_stream, bool verbose) {
    Dawg dawg;
    std::string word;
    int word_count = 0;
    time_t start = time(NULL);

    while (std::getline(*input_stream, word)) {
        if (!word.length()) {
            continue;
        }
        word_count += 1;

        if (!dawg.insert(word)) return false;

        if (verbose && word_count % 100 == 0) {
            cout << word_count << "\r";
        }
    }

    if (verbose) {
        cout << "Finalizing structures...\n";
    }

    dawg.finish();

    if (verbose) {
        cout << "Dawg creation took " << (time(NULL) - start) << " s\n";
        cout << "Read " << word_count << " words into " << dawg.node_count() << " nodes and " << dawg.edge_count() << " edges\n";
    }

    std::vector<unsigned char> output;
    std::vector<unsigned int> edge_locs;

    // this maps from a dawgdic node index to an offset in the compressed DAWG
    std::unordered_map<unsigned int, unsigned int> node_locs;

    if (verbose) {
        cout << "Starting serialization...\n";
    }

    write_node(dawg.root, &output, &edge_locs, &node_locs);

    if (verbose) {
        cout << "Rewriting offsets...\n";
    }

    for (size_t i = 0; i < edge_locs.size(); i++) {
        unsigned int edge_offset = edge_locs[i];

        int node_id;
        memcpy(&node_id, &output[edge_offset + 1], sizeof(unsigned int));

        if (node_id == 0) {
            continue;
        }
        memcpy(&output[edge_offset + 1], &node_locs[node_id], sizeof(unsigned int));
    }
    cout << "Done; writing " << output.size() << " bytes of output\n";

    output_stream->write((const char*)&output[0], output.size());

    return true;
}