// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title FraudRegistry
 * @notice Records fraud flags, quarantine events, and product recalls on-chain.
 */
contract FraudRegistry is AccessControl {
    bytes32 public constant FRAUD_REPORTER_ROLE = keccak256("FRAUD_REPORTER_ROLE");

    enum FlagType { FRAUD, QUARANTINE, RELEASED, COUNTERFEIT, RECALL }

    struct FraudEvent {
        string identifier;   // packageCode or batchNumber
        FlagType flagType;
        string reason;
        address reportedBy;
        uint256 timestamp;
    }

    FraudEvent[] private _events;
    mapping(string => bool) private _quarantined;
    mapping(string => bool) private _recalled;

    event PackageFlagged(string indexed identifier, FlagType flagType, string reason);
    event PackageQuarantined(string indexed packageCode, string reason);
    event PackageReleased(string indexed packageCode);
    event RecallInitiated(string indexed batchNumber, string reason);

    constructor(address admin) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(FRAUD_REPORTER_ROLE, admin);
    }

    function flagPackage(string calldata packageCode, string calldata reason)
        external onlyRole(FRAUD_REPORTER_ROLE)
    {
        _events.push(FraudEvent(packageCode, FlagType.FRAUD, reason, msg.sender, block.timestamp));
        emit PackageFlagged(packageCode, FlagType.FRAUD, reason);
    }

    function quarantinePackage(string calldata packageCode, string calldata reason)
        external onlyRole(FRAUD_REPORTER_ROLE)
    {
        _quarantined[packageCode] = true;
        _events.push(FraudEvent(packageCode, FlagType.QUARANTINE, reason, msg.sender, block.timestamp));
        emit PackageQuarantined(packageCode, reason);
    }

    function releasePackage(string calldata packageCode)
        external onlyRole(FRAUD_REPORTER_ROLE)
    {
        _quarantined[packageCode] = false;
        _events.push(FraudEvent(packageCode, FlagType.RELEASED, "", msg.sender, block.timestamp));
        emit PackageReleased(packageCode);
    }

    function reportCounterfeit(string calldata batchNumber, string calldata reason)
        external onlyRole(FRAUD_REPORTER_ROLE)
    {
        _recalled[batchNumber] = true;
        _events.push(FraudEvent(batchNumber, FlagType.RECALL, reason, msg.sender, block.timestamp));
        emit RecallInitiated(batchNumber, reason);
    }

    function isQuarantined(string calldata packageCode) external view returns (bool) {
        return _quarantined[packageCode];
    }

    function isRecalled(string calldata batchNumber) external view returns (bool) {
        return _recalled[batchNumber];
    }

    function totalEvents() external view returns (uint256) {
        return _events.length;
    }
}
