#!/bin/bash

TEST_DIR="$1/test"
CONTRACT_DIR="$1/contracts"
SRC_DIR="/home/trucnguyen/Workspace/TA/Spring-2020/hw1/hw1-source/"

echo "$TEST_DIR"
echo "$CONTRACT_DIR"
echo $SRC_DIR

mkdir -p "$TEST_DIR"
mkdir -p "$CONTRACT_DIR"

cp "$SRC_DIR/test/TestAuction.js" "$TEST_DIR"
cp "$SRC_DIR/contracts/Attacker.sol" "$CONTRACT_DIR"

cd "$1" && truffle test "test/TestAuction.js"
