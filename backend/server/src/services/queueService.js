/**
 * Enterprise Asynchronous Job Queue Service
 * Decouples latency-intensive tasks (Blockchain anchoring, HMAC webhooks)
 * from the HTTP request-response cycle for sub-millisecond throughput.
 */

import { EventEmitter } from "events";

class JobQueue extends EventEmitter {
  constructor(options = {}) {
    super();
    this.concurrency = options.concurrency || 5;
    this.maxRetries = options.maxRetries || 3;
    this.queue = [];
    this.processingCount = 0;
    this.handlers = new Map();
    this.stats = {
      enqueued: 0,
      processed: 0,
      failed: 0,
      retried: 0
    };
  }

  registerHandler(jobType, handlerFn) {
    this.handlers.set(jobType, handlerFn);
  }

  enqueue(jobType, payload, options = {}) {
    const job = {
      id: `job_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      type: jobType,
      payload,
      attempts: 0,
      maxRetries: options.maxRetries ?? this.maxRetries,
      delayMs: options.delayMs || 0,
      availableAt: Date.now() + (options.delayMs || 0),
      createdAt: new Date()
    };

    this.queue.push(job);
    this.stats.enqueued++;
    this.emit("enqueued", job);

    // Schedule queue tick
    setImmediate(() => this.processNext());
    return job.id;
  }

  async processNext() {
    if (this.processingCount >= this.concurrency) {
      return;
    }

    const now = Date.now();
    const candidateIdx = this.queue.findIndex((j) => j.availableAt <= now);
    if (candidateIdx === -1) {
      return;
    }

    const [job] = this.queue.splice(candidateIdx, 1);
    this.processingCount++;

    const handler = this.handlers.get(job.type);
    if (!handler) {
      console.error(`[Queue] ❌ No handler registered for job type "${job.type}"`);
      this.processingCount--;
      this.stats.failed++;
      return;
    }

    try {
      job.attempts++;
      await handler(job.payload, job);
      this.stats.processed++;
      this.emit("completed", job);
    } catch (err) {
      console.warn(`[Queue] ⚠️ Job ${job.id} (${job.type}) failed on attempt ${job.attempts}: ${err.message}`);
      if (job.attempts < job.maxRetries) {
        this.stats.retried++;
        const backoffMs = Math.min(30000, 1000 * Math.pow(2, job.attempts));
        job.availableAt = Date.now() + backoffMs;
        this.queue.push(job);
        this.emit("retry", job, err);
      } else {
        this.stats.failed++;
        console.error(`[Queue] ❌ Job ${job.id} (${job.type}) exhausted max retries (${job.maxRetries}). Abandoned.`);
        this.emit("failed", job, err);
      }
    } finally {
      this.processingCount--;
      if (this.queue.length > 0) {
        setImmediate(() => this.processNext());
      }
    }
  }

  getStats() {
    return {
      pending: this.queue.length,
      processing: this.processingCount,
      ...this.stats
    };
  }
}

export const taskQueue = new JobQueue({ concurrency: 4, maxRetries: 3 });

// Register background task handlers lazily to prevent circular imports
let handlersRegistered = false;
export function initQueueWorkers({ anchorTransactionFn, dispatchWebhookFn }) {
  if (handlersRegistered) return;

  if (anchorTransactionFn) {
    taskQueue.registerHandler("BLOCKCHAIN_ANCHOR", async (payload) => {
      await anchorTransactionFn(payload.transactionId);
    });
  }

  if (dispatchWebhookFn) {
    taskQueue.registerHandler("DISPATCH_WEBHOOK", async (payload) => {
      await dispatchWebhookFn(payload.merchantId, payload.eventType, payload.eventData);
    });
  }

  handlersRegistered = true;
  console.log("[Queue] ✅ Asynchronous background task queue initialized (Concurrency: 4)");
}
