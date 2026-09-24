import cluster from "cluster";
import os from "os";
import mongoose from "mongoose";
import { app } from "./app.js";
import { config } from "./config.js";
import { initMongoDB, initBlockchain, printSystemSummary } from "./services/startupService.js";

const DEFAULT_WORKERS = Math.min(os.cpus().length, 4);
const NUM_WORKERS = process.env.CLUSTER_WORKERS
  ? Math.max(1, parseInt(process.env.CLUSTER_WORKERS, 10))
  : DEFAULT_WORKERS;

if (cluster.isPrimary || cluster.isMaster) {
  console.log(`\n=======================================================`);
  console.log(`      ⚡ BLOCKPAY ENTERPRISE MULTI-CORE CLUSTER        `);
  console.log(`=======================================================`);
  console.log(`[Master PID: ${process.pid}] Host CPUs: ${os.cpus().length} | Allocating Workers: ${NUM_WORKERS}`);

  // 1. One-time primary orchestration: verify DB and Hardhat blockchain
  const mongoStatus = await initMongoDB();
  if (!mongoStatus.success) {
    console.error(`[Master ${process.pid}] MongoDB initialization failed. Exiting cluster.`);
    process.exit(1);
  }

  const blockchainStatus = await initBlockchain();
  printSystemSummary(mongoStatus, blockchainStatus);

  console.log(`[Master ${process.pid}] 🚀 Forking ${NUM_WORKERS} worker processes for parallel load balancing...\n`);

  for (let i = 0; i < NUM_WORKERS; i++) {
    cluster.fork();
  }

  cluster.on("online", (worker) => {
    console.log(`[Worker PID: ${worker.process.pid}] 🟢 Online & listening on http://localhost:${config.port}`);
  });

  cluster.on("exit", (worker, code, signal) => {
    console.warn(`[Worker PID: ${worker.process.pid}] ⚠️ Worker process exited (code: ${code}, signal: ${signal}). Auto-resurrecting new worker...`);
    cluster.fork();
  });

  const shutdown = () => {
    console.log(`\n[Master ${process.pid}] 🛑 Graceful cluster shutdown initiated...`);
    for (const id in cluster.workers) {
      if (cluster.workers[id]) {
        cluster.workers[id].process.kill("SIGTERM");
      }
    }
    setTimeout(() => process.exit(0), 1000);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
} else {
  // Worker process: connect to MongoDB and bind shared listening port
  try {
    await mongoose.connect(config.mongoUri);
    const { anchorTransaction } = await import("./services/blockchainService.js");
    const { dispatchWebhook } = await import("./services/webhookService.js");
    const { initQueueWorkers } = await import("./services/queueService.js");
    initQueueWorkers({ anchorTransactionFn: anchorTransaction, dispatchWebhookFn: dispatchWebhook });
    app.listen(config.port);
  } catch (error) {
    console.error(`[Worker PID: ${process.pid}] ❌ Worker failed to start:`, error.message);
    process.exit(1);
  }
}
