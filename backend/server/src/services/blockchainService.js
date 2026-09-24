import { Contract, JsonRpcProvider, Wallet } from "ethers";
import { v7 as uuidv7 } from "uuid";
import { config } from "../config.js";
import { Transaction } from "../models/Transaction.js";
import { offloadedSha256 } from "../workers/cryptoPool.js";
import { CircuitBreaker } from "../utils/circuitBreaker.js";

export const BLOCKPAY_ABI = [
  "function createTransaction(string senderUsername,string receiverUsername,uint256 amount,string paymentId,string applicationHash)",
  "function verifyTransaction(string paymentId,string applicationHash) view returns (bool)",
  "function getTransaction(string paymentId) view returns (tuple(string senderUsername,string receiverUsername,uint256 amount,uint256 timestamp,string paymentId,string applicationHash))"
];

export const blockchainCircuitBreaker = new CircuitBreaker("Blockchain_RPC", {
  failureThreshold: 4,
  resetTimeoutMs: 12000,
  halfOpenSuccessThreshold: 2
});

export let cachedContract = null;

export function resetCachedContract() {
  cachedContract = null;
}

export function getContract() {
  if (cachedContract) return cachedContract;
  if (!config.blockchain.rpcUrl || !config.blockchain.contractAddress || !config.blockchain.privateKey) {
    throw new Error("Blockchain RPC URL, contract address and private key are required");
  }
  const provider = new JsonRpcProvider(config.blockchain.rpcUrl);
  cachedContract = new Contract(config.blockchain.contractAddress, BLOCKPAY_ABI, new Wallet(config.blockchain.privateKey, provider));
  return cachedContract;
}

function errorMessage(error) {
  return String(error?.shortMessage || error?.reason || error?.message || "Blockchain submission failed").slice(0, 500);
}

async function saveMetadata(transaction, metadata) {
  transaction.metadata = { ...(transaction.metadata || {}), ...metadata };
  transaction.markModified("metadata");
  await transaction.save();
  return transaction;
}

export async function createProofPayload({ sender, receiver, amount, note, session = null, referenceId: suppliedReferenceId, timestamp: suppliedTimestamp }) {
  let query = Transaction.findOne().sort({ createdAt: -1 });
  if (session) query = query.session(session);
  const lastTransaction = await query;
  const previousHash = lastTransaction?.hash || "GENESIS";
  const referenceId = suppliedReferenceId || `BP-${uuidv7()}`;
  const timestamp = suppliedTimestamp || new Date().toISOString();

  const raw = JSON.stringify({
    referenceId,
    timestamp,
    sender: sender.username,
    receiver: receiver.username,
    amount,
    note,
    previousHash
  });

  const hash = await offloadedSha256(raw);
  return { hash, previousHash, referenceId, timestamp };
}

export async function anchorTransaction(transactionOrId, { contract, enabled = config.blockchain.enabled } = {}) {
  const transaction = await Transaction.findById(transactionOrId?._id || transactionOrId)
    .populate("senderId", "username")
    .populate("receiverId", "username");

  if (!transaction) throw new Error("Transaction not found");
  if (!enabled) return saveMetadata(transaction, { blockchainStatus: "not_anchored" });
  if (transaction.metadata?.blockchainStatus === "confirmed") return transaction;

  const attempts = Number(transaction.metadata?.blockchainAttempts || 0) + 1;
  await saveMetadata(transaction, {
    blockchainStatus: "pending",
    blockchainAttempts: attempts,
    blockchainError: null,
    lastBlockchainAttemptAt: new Date().toISOString()
  });

  return await blockchainCircuitBreaker.execute(
    async () => {
      const registry = contract || getContract();
      if (registry.verifyTransaction && (await registry.verifyTransaction(transaction.referenceId, transaction.hash))) {
        return saveMetadata(transaction, {
          blockchainStatus: "confirmed",
          blockchainAnchoredAt: new Date().toISOString(),
          blockchainError: null
        });
      }

      const submission = await registry.createTransaction(
        transaction.senderId.username,
        transaction.receiverId.username,
        BigInt(Math.round(transaction.amount * 100)),
        transaction.referenceId,
        transaction.hash
      );

      await saveMetadata(transaction, {
        blockchainStatus: "pending",
        blockchainTxHash: submission.hash,
        blockchainSubmittedAt: new Date().toISOString()
      });

      const receipt = await submission.wait(config.blockchain.confirmations);
      return saveMetadata(transaction, {
        blockchainStatus: "confirmed",
        blockchainTxHash: submission.hash,
        blockchainBlockNumber: Number(receipt.blockNumber),
        blockchainAnchoredAt: new Date().toISOString(),
        blockchainError: null
      });
    },
    async (err) => {
      await saveMetadata(transaction, {
        blockchainStatus: "failed",
        blockchainError: errorMessage(err)
      });
      return transaction;
    }
  );
}

export async function verifyOnChain(transactionOrId, { contract, enabled = config.blockchain.enabled } = {}) {
  const transaction = await Transaction.findById(transactionOrId?._id || transactionOrId);
  if (!transaction) throw new Error("Transaction not found");
  if (!enabled) {
    return { available: false, verified: false, status: "not_configured", message: "Blockchain anchoring is disabled" };
  }

  return await blockchainCircuitBreaker.execute(
    async () => {
      const verified = await (contract || getContract()).verifyTransaction(transaction.referenceId, transaction.hash);
      return {
        available: true,
        verified: Boolean(verified),
        status: verified ? "confirmed" : "mismatch",
        transactionHash: transaction.metadata?.blockchainTxHash || null,
        blockNumber: transaction.metadata?.blockchainBlockNumber || null
      };
    },
    async (err) => {
      return {
        available: false,
        verified: false,
        status: "unavailable",
        message: errorMessage(err)
      };
    }
  );
}

export function verifyProof(transaction) {
  return Boolean(transaction?.hash && /^[a-f0-9]{64}$/i.test(transaction.hash));
}
