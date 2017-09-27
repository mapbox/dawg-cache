# dawg-cache

[![Build Status](https://travis-ci.org/mapbox/dawg-cache.svg?branch=master)](https://travis-ci.org/mapbox/dawg-cache)

This is a package that implements two variants of a [directed acyclic word graph](https://en.wikipedia.org/wiki/Deterministic_acyclic_finite_state_automaton) in C++ with a node.js wrapper. One representation is mutable, and ported from a Python implementation [here](https://gist.github.com/smhanov/94230b422c2100ae4218), and the other is a very compact read-only representation meant to be used as an alternative to a hash table as a first-line membership cache in [carmen](https://github.com/mapbox/carmen/). The full version (the "Dawg" class) allows for insertion of keys, testing of set membership, and testing of a key being a prefix of a set member. The compact version allows only the latter two operations.


## Background

[insert visual pipeline]

dawg-cache begins with 2 different implementations of the same conceptual structure. When we create the structure there is a buildtime conversion made of C++ objects.
The compact version is a formulation of the structure that fits in a single contiguous piece of memory. essentially one giant buffer, allowing us to dump the whole thing to disk and read it back to memory that is really slow.

However, this cannot be built right away. In order to write a single node, there is a number to how many edges, and a slot for each edge + an offset in the array for where the next edge, and immediately after that is the start of the next node. So you have to know in advance what the whole structure will look like, knowing how many edges there will be etc.

Thus the more expanded form is a straight port from the python version. [link]() a lot of the search code is only added to the compact version. eg a lot of the traversal stuff is in the compact version specifically in the binding.cpp file.

Some of the search/traversal are on both for testing purposes.

[insert explanation of key functions]


## Contribution guidelines


## Testing
  - Details steps on how to test
  - Breakdown different potential bugs, why . you run into them, and steps for debugging the cause
    - provide code examples
    - point to specific places where the bug may have gone wrong

## Resources
    - [What's a DAWG?](https://en.wikipedia.org/wiki/Deterministic_acyclic_finite_state_automaton)
    - [NAN](https://github.com/nodejs/nan)
    -
