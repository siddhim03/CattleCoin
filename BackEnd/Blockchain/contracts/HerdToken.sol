 // SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract HerdToken is ERC20, Ownable {
    uint256 public herdId;

    constructor(
        string memory name,
        string memory symbol,
        uint256 _herdId,
        uint256 initialSupply,
        address owner
    )
        ERC20(name, symbol)
        Ownable()   // ✅ FIXED (no args)
    {
        herdId = _herdId;

        _mint(owner, initialSupply);

        transferOwnership(owner); // ✅ set owner explicitly
    }
}