// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title ShipmentContract
 * @notice Tracks shipments and custody transfers on-chain.
 */
contract ShipmentContract is AccessControl {
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    struct Shipment {
        string shipmentNumber;
        string originOrg;
        string destinationOrg;
        address createdBy;
        uint256 createdAt;
        bool exists;
    }

    struct CustodyEvent {
        string packageCode;
        string fromOrg;
        string toOrg;
        uint256 timestamp;
        address performedBy;
    }

    mapping(string => Shipment) private _shipments;
    mapping(string => CustodyEvent[]) private _packageJourney; // packageCode => events

    event ShipmentCreated(string indexed shipmentNumber, string originOrg, string destinationOrg);
    event CustodyTransferred(string indexed packageCode, string fromOrg, string toOrg, uint256 timestamp);

    constructor(address admin) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(OPERATOR_ROLE, admin);
    }

    function createShipment(
        string calldata shipmentNumber,
        string calldata originOrg,
        string calldata destinationOrg
    ) external onlyRole(OPERATOR_ROLE) {
        require(!_shipments[shipmentNumber].exists, "ShipmentContract: already exists");
        _shipments[shipmentNumber] = Shipment({
            shipmentNumber: shipmentNumber,
            originOrg: originOrg,
            destinationOrg: destinationOrg,
            createdBy: msg.sender,
            createdAt: block.timestamp,
            exists: true
        });
        emit ShipmentCreated(shipmentNumber, originOrg, destinationOrg);
    }

    function transferCustody(
        string calldata packageCode,
        string calldata fromOrg,
        string calldata toOrg,
        uint256 timestamp
    ) external onlyRole(OPERATOR_ROLE) {
        _packageJourney[packageCode].push(CustodyEvent({
            packageCode: packageCode,
            fromOrg: fromOrg,
            toOrg: toOrg,
            timestamp: timestamp,
            performedBy: msg.sender
        }));
        emit CustodyTransferred(packageCode, fromOrg, toOrg, timestamp);
    }

    function getJourney(string calldata packageCode) external view returns (CustodyEvent[] memory) {
        return _packageJourney[packageCode];
    }
}
