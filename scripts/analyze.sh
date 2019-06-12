#!/usr/bin/env bash

surya inheritance dist/Contributions.dist.sol | dot -Tpng > analysis/inheritance-tree/Contributions.png
surya inheritance dist/TokenDealer.dist.sol | dot -Tpng > analysis/inheritance-tree/TokenDealer.png

surya graph dist/Contributions.dist.sol | dot -Tpng > analysis/control-flow/Contributions.png
surya graph dist/TokenDealer.dist.sol | dot -Tpng > analysis/control-flow/TokenDealer.png

surya mdreport analysis/description-table/Contributions.md dist/Contributions.dist.sol
surya mdreport analysis/description-table/TokenDealer.md dist/TokenDealer.dist.sol
