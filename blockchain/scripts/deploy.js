/**
 * TrustChain Supply — Hardhat deployment script.
 * Deploys all contracts and exports addresses to /deployments/addresses.json
 */
const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("🚀 Deploying TrustChain contracts with:", deployer.address);
  console.log("   Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");

  const deployed = {};

  // 1. SupplyChainRegistry
  const SCR = await ethers.getContractFactory("SupplyChainRegistry");
  const scr = await SCR.deploy(deployer.address);
  await scr.waitForDeployment();
  deployed.SupplyChainRegistry = await scr.getAddress();
  console.log("✅ SupplyChainRegistry:", deployed.SupplyChainRegistry);

  // 2. BatchRegistry
  const BR = await ethers.getContractFactory("BatchRegistry");
  const br = await BR.deploy(deployer.address);
  await br.waitForDeployment();
  deployed.BatchRegistry = await br.getAddress();
  console.log("✅ BatchRegistry:", deployed.BatchRegistry);

  // 3. PackageIdentity
  const PI = await ethers.getContractFactory("PackageIdentity");
  const pi = await PI.deploy(deployer.address);
  await pi.waitForDeployment();
  deployed.PackageIdentity = await pi.getAddress();
  console.log("✅ PackageIdentity:", deployed.PackageIdentity);

  // 4. ShipmentContract
  const SC = await ethers.getContractFactory("ShipmentContract");
  const sc = await SC.deploy(deployer.address);
  await sc.waitForDeployment();
  deployed.ShipmentContract = await sc.getAddress();
  console.log("✅ ShipmentContract:", deployed.ShipmentContract);

  // 5. FraudRegistry
  const FR = await ethers.getContractFactory("FraudRegistry");
  const fr = await FR.deploy(deployer.address);
  await fr.waitForDeployment();
  deployed.FraudRegistry = await fr.getAddress();
  console.log("✅ FraudRegistry:", deployed.FraudRegistry);

  // Save addresses
  const deploymentsDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentsDir)) fs.mkdirSync(deploymentsDir, { recursive: true });

  const addresses = {
    ...deployed,
    deployer: deployer.address,
    network: (await ethers.provider.getNetwork()).name,
    chainId: Number((await ethers.provider.getNetwork()).chainId),
    deployedAt: new Date().toISOString(),
  };

  fs.writeFileSync(
    path.join(deploymentsDir, "addresses.json"),
    JSON.stringify(addresses, null, 2)
  );

  // Also export ABI files for Python backend
  const contracts = ["SupplyChainRegistry", "BatchRegistry", "PackageIdentity", "ShipmentContract", "FraudRegistry"];
  for (const name of contracts) {
    const artifact = require(`../artifacts/contracts/${name}.sol/${name}.json`);
    fs.writeFileSync(
      path.join(deploymentsDir, `${name}.json`),
      JSON.stringify({ abi: artifact.abi, address: deployed[name] }, null, 2)
    );
  }

  console.log("\n📄 Contract addresses saved to:", deploymentsDir);
  console.log("📋 Summary:", JSON.stringify(addresses, null, 2));
}

main().catch((err) => {
  console.error("❌ Deployment failed:", err);
  process.exit(1);
});
