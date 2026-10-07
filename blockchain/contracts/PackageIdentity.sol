// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title PackageIdentity
 * @notice Registers individual package identities on-chain.
 * Each package gets a unique cryptographic identity anchored immutably.
 */
contract PackageIdentity is AccessControl, ReentrancyGuard {
    bytes32 public constant REGISTRAR_ROLE = keccak256("REGISTRAR_ROLE");

    enum PackageState {
        REGISTERED,
        IN_TRANSIT,
        DELIVERED,
        QUARANTINED,
        RECALLED,
        COUNTERFEIT
    }

    struct Package {
        string packageCode;
        string batchNumber;
        bytes32 cryptoHash;        // SHA-256 of package identity
        address registeredBy;
        uint256 registeredAt;
        PackageState state;
        bool exists;
    }

    mapping(string => Package) private _packages;
    mapping(string => string[]) private _batchPackages; // batchNumber => packageCodes[]

    event PackageRegistered(
        string indexed packageCode,
        string indexed batchNumber,
        bytes32 cryptoHash,
        address registeredBy
    );
    event PackageStateChanged(
        string indexed packageCode,
        PackageState oldState,
        PackageState newState
    );

    constructor(address admin) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(REGISTRAR_ROLE, admin);
    }

    function registerPackage(
        string calldata packageCode,
        string calldata batchNumber,
        bytes32 cryptoHash
    ) external onlyRole(REGISTRAR_ROLE) nonReentrant {
        require(!_packages[packageCode].exists, "PackageIdentity: already registered");
        require(bytes(packageCode).length > 0, "PackageIdentity: empty package code");

        _packages[packageCode] = Package({
            packageCode: packageCode,
            batchNumber: batchNumber,
            cryptoHash: cryptoHash,
            registeredBy: msg.sender,
            registeredAt: block.timestamp,
            state: PackageState.REGISTERED,
            exists: true
        });
        _batchPackages[batchNumber].push(packageCode);

        emit PackageRegistered(packageCode, batchNumber, cryptoHash, msg.sender);
    }

    function updateState(
        string calldata packageCode,
        PackageState newState
    ) external onlyRole(REGISTRAR_ROLE) {
        require(_packages[packageCode].exists, "PackageIdentity: not found");
        PackageState oldState = _packages[packageCode].state;
        _packages[packageCode].state = newState;
        emit PackageStateChanged(packageCode, oldState, newState);
    }

    function verifyPackage(
        string calldata packageCode,
        bytes32 cryptoHash
    ) external view returns (bool authentic, PackageState state) {
        Package memory pkg = _packages[packageCode];
        authentic = pkg.exists && pkg.cryptoHash == cryptoHash;
        state = pkg.state;
    }

    function getPackage(string calldata packageCode) external view returns (Package memory) {
        require(_packages[packageCode].exists, "PackageIdentity: not found");
        return _packages[packageCode];
    }

    function packageExists(string calldata packageCode) external view returns (bool) {
        return _packages[packageCode].exists;
    }
}
