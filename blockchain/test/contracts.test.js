const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("TrustChain Supply Contracts", function () {
  let admin, user;
  let supplyChainRegistry, batchRegistry, packageIdentity, shipmentContract, fraudRegistry;

  beforeEach(async function () {
    [admin, user] = await ethers.getSigners();

    const SCR = await ethers.getContractFactory("SupplyChainRegistry");
    supplyChainRegistry = await SCR.deploy(admin.address);

    const BR = await ethers.getContractFactory("BatchRegistry");
    batchRegistry = await BR.deploy(admin.address);

    const PI = await ethers.getContractFactory("PackageIdentity");
    packageIdentity = await PI.deploy(admin.address);

    const SC = await ethers.getContractFactory("ShipmentContract");
    shipmentContract = await SC.deploy(admin.address);

    const FR = await ethers.getContractFactory("FraudRegistry");
    fraudRegistry = await FR.deploy(admin.address);
  });

  describe("SupplyChainRegistry", function () {
    it("should anchor and verify a document", async function () {
      const docId = "DOC-001";
      const ipfsCid = "QmTestCid123456789";
      const fileHash = ethers.keccak256(ethers.toUtf8Bytes("file content"));

      await supplyChainRegistry.anchorDocument(docId, ipfsCid, fileHash);
      const isVerified = await supplyChainRegistry.verifyDocument(docId, fileHash);
      expect(isVerified).to.be.true;

      const doc = await supplyChainRegistry.getDocument(docId);
      expect(doc.ipfsCid).to.equal(ipfsCid);
      expect(doc.exists).to.be.true;
    });

    it("should reject unauthorized callers", async function () {
      const fileHash = ethers.keccak256(ethers.toUtf8Bytes("file"));
      await expect(
        supplyChainRegistry.connect(user).anchorDocument("DOC-FAIL", "QmCid", fileHash)
      ).to.be.reverted;
    });
  });

  describe("BatchRegistry", function () {
    it("should register a new batch and query it", async function () {
      const batchNo = "BATCH-2026-001";
      const sku = "MED-PARACETAMOL-500MG";
      const qty = 50000;
      const expiry = Math.floor(Date.now() / 1000) + 86400 * 365;

      await batchRegistry.registerBatch(batchNo, sku, qty, expiry);
      expect(await batchRegistry.batchExists(batchNo)).to.be.true;

      const record = await batchRegistry.getBatch(batchNo);
      expect(record.productSku).to.equal(sku);
      expect(record.quantity).to.equal(qty);
    });

    it("should prevent duplicate batch numbers", async function () {
      const batchNo = "BATCH-DUP";
      const expiry = Math.floor(Date.now() / 1000) + 86400;
      await batchRegistry.registerBatch(batchNo, "SKU1", 100, expiry);

      await expect(
        batchRegistry.registerBatch(batchNo, "SKU1", 100, expiry)
      ).to.be.revertedWith("BatchRegistry: already registered");
    });
  });

  describe("PackageIdentity", function () {
    it("should register and verify package identity", async function () {
      const pkgCode = "PKG-IN-0001";
      const batchNo = "BATCH-001";
      const cryptoHash = ethers.keccak256(ethers.toUtf8Bytes(pkgCode + batchNo));

      await packageIdentity.registerPackage(pkgCode, batchNo, cryptoHash);
      expect(await packageIdentity.packageExists(pkgCode)).to.be.true;

      const [authentic, state] = await packageIdentity.verifyPackage(pkgCode, cryptoHash);
      expect(authentic).to.be.true;
      expect(state).to.equal(0); // REGISTERED
    });

    it("should update package state", async function () {
      const pkgCode = "PKG-IN-0002";
      const cryptoHash = ethers.keccak256(ethers.toUtf8Bytes("pkg2"));
      await packageIdentity.registerPackage(pkgCode, "BATCH-001", cryptoHash);

      await packageIdentity.updateState(pkgCode, 1); // IN_TRANSIT
      const [, state] = await packageIdentity.verifyPackage(pkgCode, cryptoHash);
      expect(state).to.equal(1);
    });
  });

  describe("FraudRegistry", function () {
    it("should flag, quarantine, and release packages", async function () {
      const pkgCode = "PKG-SUS-001";
      await fraudRegistry.quarantinePackage(pkgCode, "Cold chain violation");
      expect(await fraudRegistry.isQuarantined(pkgCode)).to.be.true;

      await fraudRegistry.releasePackage(pkgCode);
      expect(await fraudRegistry.isQuarantined(pkgCode)).to.be.false;
    });

    it("should record counterfeit recalls", async function () {
      const batchNo = "BATCH-BAD-001";
      await fraudRegistry.reportCounterfeit(batchNo, "Failed chemical assay");
      expect(await fraudRegistry.isRecalled(batchNo)).to.be.true;
    });
  });
});
