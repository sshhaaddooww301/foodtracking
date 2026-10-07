// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title SupplyChainRegistry
 * @notice Main registry for documents and general anchoring.
 */
contract SupplyChainRegistry is AccessControl {
    bytes32 public constant REGISTRAR_ROLE = keccak256("REGISTRAR_ROLE");

    struct DocumentRecord {
        string docId;
        string ipfsCid;
        bytes32 fileHash;
        address uploadedBy;
        uint256 uploadedAt;
        bool exists;
    }

    mapping(string => DocumentRecord) private _documents;
    string[] private _docIds;

    event DocumentAnchored(string indexed docId, string ipfsCid, bytes32 fileHash);

    constructor(address admin) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(REGISTRAR_ROLE, admin);
    }

    function anchorDocument(
        string calldata docId,
        string calldata ipfsCid,
        bytes32 fileHash
    ) external onlyRole(REGISTRAR_ROLE) {
        require(!_documents[docId].exists, "SupplyChainRegistry: doc already anchored");
        _documents[docId] = DocumentRecord({
            docId: docId,
            ipfsCid: ipfsCid,
            fileHash: fileHash,
            uploadedBy: msg.sender,
            uploadedAt: block.timestamp,
            exists: true
        });
        _docIds.push(docId);
        emit DocumentAnchored(docId, ipfsCid, fileHash);
    }

    function verifyDocument(string calldata docId, bytes32 fileHash) external view returns (bool) {
        return _documents[docId].exists && _documents[docId].fileHash == fileHash;
    }

    function getDocument(string calldata docId) external view returns (DocumentRecord memory) {
        require(_documents[docId].exists, "SupplyChainRegistry: not found");
        return _documents[docId];
    }
}
