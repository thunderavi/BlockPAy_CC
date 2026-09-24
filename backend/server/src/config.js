import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envCandidates = [
  path.resolve(__dirname, "../.env"),
  path.resolve(__dirname, "../../.env"),
  path.resolve(__dirname, "../../../.env"),
  path.resolve(process.cwd(), ".env"),
  path.resolve(process.cwd(), "backend/.env"),
  path.resolve(process.cwd(), "backend/server/.env")
];

for (const candidate of envCandidates) {
  if (fs.existsSync(candidate)) {
    dotenv.config({ path: candidate });
  }
}

export const config = {
  port: process.env.PORT || 5000,
  mongoUri: process.env.MONGO_URI || "mongodb://127.0.0.1:27017/blockpay",
  jwtSecret: process.env.JWT_SECRET || "dev-only-blockpay-secret",
  clientUrl: process.env.CLIENT_URL || "http://localhost:5173",
  demoOpeningBalance: 10000,
  useMongoTransactions: process.env.MONGO_TRANSACTIONS === "true",
  redisUrl: process.env.REDIS_URL || "redis://127.0.0.1:6379",
  clusterWorkers: Number(process.env.CLUSTER_WORKERS || 0),
  mongoReadPreference: process.env.MONGO_READ_PREFERENCE || "secondaryPreferred",
  blockchain: {
    enabled: process.env.BLOCKCHAIN_ENABLED === "true",
    rpcUrl: process.env.BLOCKCHAIN_RPC_URL || "http://127.0.0.1:8545",
    contractAddress: process.env.BLOCKPAY_CONTRACT_ADDRESS || "",
    privateKey: process.env.BLOCKCHAIN_PRIVATE_KEY || "",
    confirmations: Number(process.env.BLOCKCHAIN_CONFIRMATIONS || 1)
  }
};
