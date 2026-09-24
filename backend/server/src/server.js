import { app } from "./app.js";
import { config } from "./config.js";
import { initMongoDB, initBlockchain, printSystemSummary } from "./services/startupService.js";

async function startServer() {
  // 1. Connect to MongoDB with complete status logs
  const mongoStatus = await initMongoDB();
  if (!mongoStatus.success) {
    process.exit(1);
  }

  // 2. Initialize Blockchain (Auto-starts Hardhat node internally if needed & verifies/deploys contract)
  const blockchainStatus = await initBlockchain();

  // 3. Initialize Decoupled Background Task Queue Workers
  const { anchorTransaction } = await import("./services/blockchainService.js");
  const { dispatchWebhook } = await import("./services/webhookService.js");
  const { initQueueWorkers } = await import("./services/queueService.js");
  initQueueWorkers({ anchorTransactionFn: anchorTransaction, dispatchWebhookFn: dispatchWebhook });

  // 4. Start Express Web API
  app.listen(config.port, () => {
    printSystemSummary(mongoStatus, blockchainStatus);
  });
}

startServer().catch((error) => {
  console.error("Fatal startup error:", error);
  process.exit(1);
});
