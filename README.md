# dawg-cache

[![Build Status](https://travis-ci.org/mapbox/dawg-cache.svg?branch=master)](https://travis-ci.org/mapbox/dawg-cache)
[![codecov](https://codecov.io/gh/mapbox/dawg-cache/branch/master/graph/badge.svg)](https://codecov.io/gh/mapbox/dawg-cache)

This is a package that implements two variants of a [directed acyclic word graph](https://en.wikipedia.org/wiki/Deterministic_acyclic_finite_state_automaton) in C++ with a node.js wrapper. One representation is mutable, and ported from a Python implementation [here](https://gist.github.com/smhanov/94230b422c2100ae4218), and the other is a very compact read-only representation meant to be used as an alternative to a hash table as a first-line membership cache in [carmen](https://github.com/mapbox/carmen/). The full version (the "Dawg" class) allows for insertion of keys, testing of set membership, and testing of a key being a prefix of a set member. The compact version allows only the latter two operations.
