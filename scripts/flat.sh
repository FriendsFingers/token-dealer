#!/usr/bin/env bash

truffle-flattener contracts/utils/Contributions.sol > dist/Contributions.dist.sol
truffle-flattener contracts/dealer/TokenDealer.sol > dist/TokenDealer.dist.sol
