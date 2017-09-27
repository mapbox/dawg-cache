# dawg-cache

[![Build Status](https://travis-ci.org/mapbox/dawg-cache.svg?branch=master)](https://travis-ci.org/mapbox/dawg-cache)

This is a package that implements two variants of a [directed acyclic word graph](https://en.wikipedia.org/wiki/Deterministic_acyclic_finite_state_automaton) in C++ with a node.js wrapper. One representation is mutable, and ported from a Python implementation [here](https://gist.github.com/smhanov/94230b422c2100ae4218), and the other is a very compact read-only representation meant to be used as an alternative to a hash table as a first-line membership cache in [carmen](https://github.com/mapbox/carmen/). The full version (the "Dawg" class) allows for insertion of keys, testing of set membership, and testing of a key being a prefix of a set member. The compact version allows only the latter two operations.

- Setup
  - Background on Tools
  - Detailed steps for setup
    - include code examples
- Configuration Options
- Reference on what the repo is doing and how
  - This is where a visual pipeline of the repo would come in handy
  - Point out some key functions, and what they do
- Limitations
  - Compatibility issues
- Contribution guidelines
- Workflow
  - Detailed steps on how to work using this repo.
    - include code examples
    - include the expected results of each step, and how those results will be used
- Testing
  - Details steps on how to test
  - Breakdown different potential bugs, why . you run into them, and steps for debugging the cause
    - provide code examples
    - point to specific places where the bug may have gone wrong
- Resources
