import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import { JsonRpcProvider, Wallet, ContractFactory, Contract, formatEther } from "ethers";
import { config } from "../config.js";
import { BLOCKPAY_ABI, resetCachedContract } from "./blockchainService.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const contractsDir = path.resolve(__dirname, "../../../contracts");
const artifactPath = path.resolve(contractsDir, "artifacts/solidity/BlockPay.sol/BlockPay.json");

let hardhatProcess = null;

// Clean up child process on exit
const cleanupHardhat = () => {
  if (hardhatProcess) {
    console.log("[Blockchain] 🛑 Shutting down internal Hardhat node...");
    try {
      if (process.platform === "win32") {
        spawn("taskkill", ["/pid", hardhatProcess.pid, "/f", "/t"]);
      } else {
        hardhatProcess.kill("SIGTERM");
      }
    } catch {
      // Ignore cleanup error on exit
    }
    hardhatProcess = null;
  }
};

process.on("SIGINT", () => {
  cleanupHardhat();
  process.exit(0);
});

process.on("SIGTERM", () => {
  cleanupHardhat();
  process.exit(0);
});

process.on("exit", () => {
  cleanupHardhat();
});

/**
 * Connect to MongoDB and display status
 */
export async function initMongoDB() {
  console.log("\n=======================================================");
  console.log("             BLOCKPAY BACKEND INITIALIZATION           ");
  console.log("=======================================================");
  console.log("[MongoDB] ⏳ Connecting to MongoDB...");

  try {
    await mongoose.connect(config.mongoUri);
    const dbName = mongoose.connection.name || "blockpay";
    const host = mongoose.connection.host || "127.0.0.1";
    const port = mongoose.connection.port || 27017;
    console.log(`[MongoDB] ✅ Connected successfully!`);
    console.log(`          Host: ${host}:${port} | Database: "${dbName}"`);
    return { success: true, dbName, host: `${host}:${port}` };
  } catch (error) {
    console.error(`[MongoDB] ❌ Connection FAILED: ${error.message}`);
    console.error(`          Please ensure MongoDB is running (e.g., mongod or Windows Service).`);
    return { success: false, error: error.message };
  }
}

/**
 * Poll until RPC provider is ready using silent HTTP fetch
 */
async function waitForRpc(rpcUrl, maxRetries = 30, intervalMs = 500) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await fetch(rpcUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", method: "eth_blockNumber", params: [], id: 1 })
      });
      if (res.ok) {
        return new JsonRpcProvider(rpcUrl);
      }
    } catch {
      // Node is still booting up
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  throw new Error(`RPC node at ${rpcUrl} did not respond within ${Math.round((maxRetries * intervalMs) / 1000)}s`);
}

/**
 * Start Hardhat node internally if not already running
 */
async function ensureLocalBlockchainNode(rpcUrl) {
  try {
    const res = await fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", method: "eth_blockNumber", params: [], id: 1 })
    });
    if (res.ok) {
      console.log(`[Blockchain] ⚡ Local RPC node is already running at ${rpcUrl}`);
      return new JsonRpcProvider(rpcUrl);
    }
  } catch {
    // Node is not running, proceed to start it
  }

  console.log(`[Blockchain] 🚀 Starting internal Hardhat node in ${contractsDir}...`);
  const isWindows = process.platform === "win32";

  if (isWindows) {
    hardhatProcess = spawn("cmd.exe", ["/c", "npx", "hardhat", "node"], {
      cwd: contractsDir,
      stdio: "ignore"
    });
  } else {
    hardhatProcess = spawn("npx", ["hardhat", "node"], {
      cwd: contractsDir,
      stdio: "ignore"
    });
  }

  hardhatProcess.on("error", (err) => {
    console.error(`[Blockchain] Failed to spawn Hardhat node:`, err.message);
  });

  // Wait for the node to respond
  const readyProvider = await waitForRpc(rpcUrl);
  console.log(`[Blockchain] ✅ Internal Hardhat node started successfully!`);
  return readyProvider;
}

/**
 * Ensure the BlockPay contract is deployed and accessible
 */
async function ensureContractDeployed(provider, wallet) {
  let address = config.blockchain.contractAddress;
  let code = "0x";

  if (address) {
    try {
      code = await provider.getCode(address);
    } catch {
      code = "0x";
    }
  }

  if (code !== "0x") {
    // Contract is already deployed
    return address;
  }

  // Contract not deployed: deploy automatically using compiled artifact
  console.log(`[Contract] ⚠️  No contract detected at address "${address || 'none'}".`);
  console.log(`[Contract] 🔨 Auto-deploying BlockPay.sol to local network...`);

  if (!fs.existsSync(artifactPath)) {
    throw new Error(`Compiled contract artifact not found at ${artifactPath}. Please run 'npm run test:contracts' first.`);
  }

  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf-8"));
  const factory = new ContractFactory(artifact.abi, artifact.bytecode, wallet);
  const contract = await factory.deploy();
  await contract.waitForDeployment();

  const deployedAddress = await contract.getAddress();
  config.blockchain.contractAddress = deployedAddress;

  if (typeof resetCachedContract === "function") {
    resetCachedContract();
  }

  console.log(`[Contract] 🎉 BlockPay successfully deployed at: ${deployedAddress}`);

  // Update .env files with the deployed address if needed
  try {
    const serverEnvPath = path.resolve(__dirname, "../.env");
    if (fs.existsSync(serverEnvPath)) {
      let content = fs.readFileSync(serverEnvPath, "utf-8");
      if (content.includes("BLOCKPAY_CONTRACT_ADDRESS=")) {
        content = content.replace(/BLOCKPAY_CONTRACT_ADDRESS=.*/g, `BLOCKPAY_CONTRACT_ADDRESS=${deployedAddress}`);
      } else {
        content += `\nBLOCKPAY_CONTRACT_ADDRESS=${deployedAddress}\n`;
      }
      fs.writeFileSync(serverEnvPath, content, "utf-8");
    }
  } catch {
    // Ignore non-fatal .env write errors
  }

  return deployedAddress;
}

/**
 * Initialize Blockchain, Hardhat Node, and Smart Contract
 */
export async function initBlockchain() {
  if (!config.blockchain.enabled) {
    console.log("[Blockchain] ⚪ Blockchain anchoring is disabled (BLOCKCHAIN_ENABLED=false).");
    console.log("             Operating in database-only mode.");
    return { enabled: false };
  }

  console.log("\n[Blockchain] ⏳ Connecting to Blockchain...");

  try {
    const isLocal = config.blockchain.rpcUrl.includes("127.0.0.1") || config.blockchain.rpcUrl.includes("localhost");
    let provider;

    if (isLocal) {
      provider = await ensureLocalBlockchainNode(config.blockchain.rpcUrl);
    } else {
      provider = new JsonRpcProvider(config.blockchain.rpcUrl);
      await provider.getBlockNumber();
    }

    const network = await provider.getNetwork();
    const wallet = new Wallet(config.blockchain.privateKey, provider);
    const balance = await provider.getBalance(wallet.address);

    console.log(`[Blockchain] ✅ Connected to RPC: ${config.blockchain.rpcUrl}`);
    console.log(`          Chain ID: ${network.chainId.toString()}`);
    console.log(`          Wallet:   ${wallet.address} (${Number(formatEther(balance)).toFixed(2)} ETH)`);

    // Ensure contract is deployed and verified
    const contractAddress = await ensureContractDeployed(provider, wallet);
    const contractInstance = new Contract(contractAddress, BLOCKPAY_ABI, provider);

    // Smoke test contract interaction
    await contractInstance.verifyTransaction("HEALTH_CHECK", "HEALTH_CHECK");

    console.log(`[Contract]   ✅ BlockPay contract active & verified!`);
    console.log(`          Address:  ${contractAddress}`);

    return {
      enabled: true,
      rpcUrl: config.blockchain.rpcUrl,
      chainId: network.chainId.toString(),
      wallet: wallet.address,
      contractAddress,
      status: "connected"
    };
  } catch (error) {
    console.error(`[Blockchain] ❌ Blockchain/Contract initialization failed: ${error.message}`);
    return {
      enabled: true,
      status: "error",
      error: error.message
    };
  }
}

/**
 * Print final system overview banner
 */
export function printSystemSummary(mongoStatus, blockchainStatus) {
  console.log("\n=======================================================");
  console.log("            🚀 BLOCKPAY BACKEND IS READY              ");
  console.log("=======================================================");
  console.log(`📡 API Server:   http://localhost:${config.port}`);
  console.log(`🍃 Database:     ${mongoStatus.success ? `Connected (${mongoStatus.host}/${mongoStatus.dbName})` : "❌ Connection Failed"}`);
  
  if (!blockchainStatus.enabled) {
    console.log(`⛓️  Blockchain:   Disabled (Database-only mode)`);
  } else if (blockchainStatus.status === "connected") {
    console.log(`⛓️  Blockchain:   Connected (${blockchainStatus.rpcUrl})`);
    console.log(`📜 Contract:     Active (${blockchainStatus.contractAddress})`);
    console.log(`💼 Signer:       ${blockchainStatus.wallet}`);
  } else {
    console.log(`⛓️  Blockchain:   ⚠️ Error: ${blockchainStatus.error}`);
  }

  console.log("=======================================================\n");
}
