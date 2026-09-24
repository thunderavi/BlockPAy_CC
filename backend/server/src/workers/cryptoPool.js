import { Worker } from "worker_threads";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const workerPath = path.resolve(__dirname, "cryptoWorker.js");

const POOL_SIZE = Math.min(4, Math.max(2, os.cpus().length));
const workers = [];
const pendingTasks = new Map();
let currentWorkerIdx = 0;
let taskIdSeq = 0;
let isInitialized = false;

function initPool() {
  if (isInitialized) return;
  for (let i = 0; i < POOL_SIZE; i++) {
    try {
      const worker = new Worker(workerPath);
      worker.on("message", ({ id, success, result, error }) => {
        const deferred = pendingTasks.get(id);
        if (deferred) {
          pendingTasks.delete(id);
          if (success) {
            deferred.resolve(result);
          } else {
            deferred.reject(new Error(error));
          }
        }
      });

      worker.on("error", (err) => {
        console.error(`[CryptoPool] Worker ${i} error:`, err);
      });

      worker.on("exit", (code) => {
        if (code !== 0) {
          console.warn(`[CryptoPool] Worker ${i} exited with code ${code}. Replacing...`);
          workers[i] = new Worker(workerPath);
        }
      });

      workers.push(worker);
    } catch {
      // Fallback mode if worker threads are restricted
      break;
    }
  }
  isInitialized = true;
}

function runTask(task, data) {
  initPool();

  if (workers.length === 0) {
    // Synchronous fallback
    if (task === "bcrypt_hash") return bcrypt.hash(data.password, data.rounds || 10);
    if (task === "bcrypt_compare") return bcrypt.compare(data.password, data.hash);
    if (task === "sha256_proof") return Promise.resolve(crypto.createHash("sha256").update(data.raw).digest("hex"));
  }

  const id = ++taskIdSeq;
  return new Promise((resolve, reject) => {
    pendingTasks.set(id, { resolve, reject });
    const worker = workers[currentWorkerIdx];
    currentWorkerIdx = (currentWorkerIdx + 1) % workers.length;
    worker.postMessage({ id, task, data });
  });
}

/**
 * Offloaded Bcrypt Hash via Worker Thread
 */
export function offloadedHash(password, rounds = 10) {
  return runTask("bcrypt_hash", { password, rounds });
}

/**
 * Offloaded Bcrypt Compare via Worker Thread
 */
export function offloadedCompare(password, hash) {
  return runTask("bcrypt_compare", { password, hash });
}

/**
 * Offloaded SHA-256 Proof via Worker Thread
 */
export function offloadedSha256(raw) {
  return runTask("sha256_proof", { raw });
}

/**
 * Get Worker Thread Pool Metrics
 */
export function getCryptoPoolStats() {
  return {
    activeWorkers: workers.length,
    poolSize: POOL_SIZE,
    pendingTasksCount: pendingTasks.size
  };
}
