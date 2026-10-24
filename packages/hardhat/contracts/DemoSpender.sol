// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @notice Demonstrates an allowance relationship, not an exploitable withdrawal.
/// Intentionally has no transferFrom capability or token withdrawal functions.
contract DemoSpender {
    string public constant purpose = "PARASITE testnet allowance demonstration";
}
