// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract OffgridSettlementLog {
    event SettlementRecorded(
        bytes32 indexed intentId,
        address indexed payer,
        address indexed payee,
        address token,
        uint256 amount,
        uint256 timestamp
    );

    function recordSettlement(
        bytes32 intentId,
        address payer,
        address payee,
        address token,
        uint256 amount
    ) external {
        emit SettlementRecorded(intentId, payer, payee, token, amount, block.timestamp);
    }
}
