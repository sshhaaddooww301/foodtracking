// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title BatchRegistry
 * @notice Registers pharmaceutical/food product batches on-chain.
 * Each batch gets an immutable record with product SKU, quantity and expiry.
 */
contract BatchRegistry is AccessControl, ReentrancyGuard {
    bytes32 public constant REGISTRAR_ROLE = keccak256("REGISTRAR_ROLE");

    struct BatchRecord {
        string batchNumber;
        string productSku;
        uint256 quantity;
        uint256 expiryTimestamp;
        address registeredBy;
        uint256 registeredAt;
        bool exists;
    }

    // batchNumber => BatchRecord
    mapping(string => BatchRecord) private _batches;
    string[] private _batchNumbers;

    event BatchRegistered(
        string indexed batchNumber,
        string productSku,
        uint256 quantity,
        uint256 expiryTimestamp,
        address indexed registeredBy
    );

    constructor(address admin) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(REGISTRAR_ROLE, admin);
    }

    function registerBatch(
        string calldata batchNumber,
        string calldata productSku,
        uint256 quantity,
        uint256 expiryTimestamp
    ) external onlyRole(REGISTRAR_ROLE) nonReentrant {
        require(!_batches[batchNumber].exists, "BatchRegistry: already registered");
        require(bytes(batchNumber).length > 0, "BatchRegistry: empty batch number");
        require(quantity > 0, "BatchRegistry: zero quantity");

        _batches[batchNumber] = BatchRecord({
            batchNumber: batchNumber,
            productSku: productSku,
            quantity: quantity,
            expiryTimestamp: expiryTimestamp,
            registeredBy: msg.sender,
            registeredAt: block.timestamp,
            exists: true
        });
        _batchNumbers.push(batchNumber);

        emit BatchRegistered(batchNumber, productSku, quantity, expiryTimestamp, msg.sender);
    }

    function getBatch(string calldata batchNumber) external view returns (BatchRecord memory) {
        require(_batches[batchNumber].exists, "BatchRegistry: not found");
        return _batches[batchNumber];
    }

    function batchExists(string calldata batchNumber) external view returns (bool) {
        return _batches[batchNumber].exists;
    }

    function totalBatches() external view returns (uint256) {
        return _batchNumbers.length;
    }
}
