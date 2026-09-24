import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { config } from "./config.js";
import { errorHandler, notFound } from "./middleware/error.js";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./docs/swagger.js";
import adminRoutes from "./routes/adminRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import authorityRoutes from "./routes/authorityRoutes.js";
import checkoutRoutes from "./routes/checkoutRoutes.js";
import friendRoutes from "./routes/friendRoutes.js";
import merchantRoutes from "./routes/merchantRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import qrRoutes from "./routes/qrRoutes.js";
import transactionRoutes from "./routes/transactionRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import walletRoutes from "./routes/walletRoutes.js";

export const app = express();
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin(origin, callback) { if (!origin) return callback(null, true); const local = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\]|192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3})(:\d+)?$/.test(origin); callback(null, origin === config.clientUrl || local); }, credentials: true }));
app.use(express.json({ limit: "1mb" }));
if (process.env.NODE_ENV !== "test") app.use(morgan("dev"));

import { authRateLimiter, merchantRateLimiter, authorityRateLimiter } from "./middleware/rateLimiter.js";
import { getCryptoPoolStats } from "./workers/cryptoPool.js";
import { blockchainCircuitBreaker } from "./services/blockchainService.js";
import { cache } from "./services/cacheService.js";
import { taskQueue } from "./services/queueService.js";

// API Health & Documentation
app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    service: "BlockPay API",
    pid: process.pid,
    uptimeSeconds: Math.floor(process.uptime()),
    cryptoPool: getCryptoPoolStats(),
    circuitBreaker: blockchainCircuitBreaker.getStatus(),
    memory: {
      rssMb: Math.round(process.memoryUsage().rss / 1024 / 1024),
      heapUsedMb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024)
    },
    cache: cache.getStats(),
    queue: taskQueue.getStats()
  });
});

app.get("/api/docs.json", (_req, res) => res.json(swaggerSpec));
app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec, { customSiteTitle: "BlockPay API Ecosystem Docs" }));

// Route Groups
app.use("/api/auth", authRateLimiter, authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/wallet", walletRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/friends", friendRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/qr", qrRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/merchant", merchantRateLimiter, merchantRoutes);
app.use("/api/v1/checkout", merchantRateLimiter, checkoutRoutes);
app.use("/api/authority", authorityRateLimiter, authorityRoutes);

app.use(notFound);
app.use(errorHandler);
