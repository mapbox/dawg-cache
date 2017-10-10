#include "builder.cpp"
#include <fstream>
#include <iostream>

int main(int argc, char* argv[]) {
    if (argc != 3) {
        std::cout << "Wrong number of arguments";
        return -1;
    }

    std::fstream infile, outfile;
    infile.open(argv[1], std::fstream::in);
    outfile.open(argv[2], std::fstream::out | std::fstream::binary);

    build_compact_dawg_full(&infile, &outfile, true, EDGE_COUNT_ONLY);
}