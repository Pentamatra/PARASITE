// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @notice Valueless test token. Fixed supply; no administrator or withdrawal powers.
contract DemoToken is ERC20 {
    constructor(address demoOwner) ERC20("Parasite Demo Token", "PDEM") {
        require(demoOwner != address(0), "Zero demo owner");
        _mint(demoOwner, 10_000 * 10 ** decimals());
    }
}
