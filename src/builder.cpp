#include "crc32c.hpp"
#include "dawg.cpp"
#include <cstring>
#include <ctime>
#include <iostream>
#include <memory>
#include <unordered_map>

using namespace std;

const unsigned int IS_FINAL_FLAG = 0x80000000;
const unsigned int NOT_FINAL_FLAG = 0;
const unsigned int FINAL_MASK = 0x7fffffff;

const unsigned int DAWG_HEADER_SIZE = 16;

const unsigned int EDGE_COUNT_ONLY = 1;
const unsigned int INCLUDES_ENTRY_COUNT = 5;

/* header format 16 bytes, consisting of:
    * the string "dawg" (4 bytes)
    * version number (1 byte) - currently 1
    * size in bytes of each character (1 byte) - currently always 1
    * size in bytes of each node structure (1 byte):
    *   either 1 byte if it's just an edge count
    *   or 5 if it's an edge count (1 byte) and an entry count (4 bytes)
    * size in bytes of each node offset (1 byte) - currently always 4
    * size in bytes of the datastructure (does not include this header)
    * the crc32c checksum of the datastructure (does not include this header)
*/
const char* DAWG_DEFAULT_HEADER = "dawg\x01\x01\x01\x04\0\0\0\0\0\0\0\0";

void write_node(shared_ptr<DawgNode> node, std::vector<unsigned char>* output, std::vector<unsigned int>* edge_locs, std::unordered_map<unsigned int, unsigned int>* node_locs, unsigned int node_size)
{
    if (node_locs->count(node->id) > 0)
    {
        // already visited
        return;
    }

    int offset = output->size();
    (*node_locs)[node->id] = offset;

    output->push_back(static_cast<unsigned char>(node->edges.size()));
    if (node_size == INCLUDES_ENTRY_COUNT)
    {
        int cur_size = output->size();
        output->resize(cur_size + sizeof(unsigned int));
        memcpy(&((*output)[cur_size]), &(node->count), sizeof(unsigned int));
    }

    std::vector<std::shared_ptr<DawgNode>> nodes_to_process;
    std::shared_ptr<DawgNode> child;
    int i = 0;
    for (auto const& edge : node->edges)
    {
        char edge_key = edge.first;
        child = edge.second;

        int edge_offset = (i * 5) + offset + node_size;
        unsigned int node_id, flagged_id;

        if (child->edges.size() == 0 && node_size == EDGE_COUNT_ONLY)
        {
            node_id = 0;
        }
        else
        {
            nodes_to_process.push_back(child);
            node_id = child->id;
        }

        flagged_id = (node_id & FINAL_MASK) | (child->final ? IS_FINAL_FLAG : NOT_FINAL_FLAG);

        output->push_back(edge_key);

        int cur_size = output->size();
        output->resize(cur_size + sizeof(unsigned int));
        memcpy(&((*output)[cur_size]), &flagged_id, sizeof(unsigned int));

        edge_locs->push_back(edge_offset);
        i++;
    }

    size_t num_nodes = nodes_to_process.size();
    for (size_t i = 0; i < num_nodes; i++)
    {
        write_node(nodes_to_process[i], output, edge_locs, node_locs, node_size);
    }
}

void build_compact_dawg(Dawg* dawg, std::vector<unsigned char>* output, bool verbose, unsigned int node_size)
{
    // write the header
    output->resize(output->size() + DAWG_HEADER_SIZE);
    memcpy(&((*output)[0]), DAWG_DEFAULT_HEADER, DAWG_HEADER_SIZE);

    std::vector<unsigned int> edge_locs;

    // this maps from a dawgdic node index to an offset in the compressed DAWG
    std::unordered_map<unsigned int, unsigned int> node_locs;

    if (verbose)
    {
        cout << "Starting serialization...\n";
    }

    write_node(dawg->root, output, &edge_locs, &node_locs, node_size);

    if (verbose)
    {
        cout << "Rewriting offsets...\n";
    }

    size_t num_edges = edge_locs.size();
    for (size_t i = 0; i < num_edges; i++)
    {
        unsigned int edge_offset = edge_locs[i];

        unsigned int flagged_id;
        memcpy(&flagged_id, &((*output)[edge_offset + 1]), sizeof(unsigned int));

        unsigned int node_id = flagged_id & FINAL_MASK;

        if (node_id == 0)
        {
            continue;
        }

        unsigned int adjusted_loc = node_locs[node_id] - DAWG_HEADER_SIZE;

        // copy the flag bit from node_id to the offset
        int flagged_offset = (adjusted_loc & FINAL_MASK) | (flagged_id & IS_FINAL_FLAG);

        memcpy(&((*output)[edge_offset + 1]), &flagged_offset, sizeof(unsigned int));
    }

    if (verbose)
    {
        cout << "Rewriting metadata\n";
    }

    (*output)[6] = static_cast<unsigned char>(node_size);

    unsigned int data_size = ((unsigned int)output->size()) - DAWG_HEADER_SIZE;
    memcpy(&((*output)[8]), &data_size, sizeof(unsigned int));

    unsigned int checksum = crc32c(&((*output)[DAWG_HEADER_SIZE]), data_size);
    memcpy(&((*output)[12]), &checksum, sizeof(unsigned int));

    if (verbose)
    {
        cout << "Done; generated " << output->size() << " bytes of output\n";
    }
}

bool build_compact_dawg_full(std::istream* input_stream, std::ostream* output_stream, bool verbose, unsigned int node_size)
{
    Dawg dawg;
    std::string word;
    int word_count = 0;
    time_t start = time(NULL);

    while (std::getline(*input_stream, word))
    {
        if (word.empty())
        {
            continue;
        }
        word_count += 1;

        if (!dawg.insert(word.data(), word.size())) return false;

        if (verbose && word_count % 100 == 0)
        {
            cout << word_count << "\r";
        }
    }

    if (verbose)
    {
        cout << "Finalizing structures...\n";
    }

    dawg.finish();

    if (verbose)
    {
        cout << "Dawg creation took " << (time(NULL) - start) << " s\n";
        cout << "Read " << word_count << " words into " << dawg.node_count() << " nodes and " << dawg.edge_count() << " edges\n";
    }

    std::vector<unsigned char> output;

    build_compact_dawg(&dawg, &output, verbose, node_size);

    output_stream->write((const char*)&output[0], output.size());

    return true;
}