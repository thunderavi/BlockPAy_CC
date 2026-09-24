/**
 * Enterprise Circuit Breaker for External Service & RPC Resiliency
 * Prevents cascading event loop blockages during upstream latency or outages.
 */
export class CircuitBreaker {
  constructor(name, options = {}) {
    this.name = name;
    this.failureThreshold = options.failureThreshold || 5;
    this.resetTimeoutMs = options.resetTimeoutMs || 15000; // 15 seconds
    this.halfOpenSuccessThreshold = options.halfOpenSuccessThreshold || 2;

    this.state = "CLOSED"; // "CLOSED" | "OPEN" | "HALF_OPEN"
    this.failureCount = 0;
    this.successCount = 0;
    this.nextAttemptAt = 0;
    this.lastError = null;
  }

  async execute(action, fallbackAction = null) {
    const now = Date.now();

    // Check if OPEN and reset timeout expired -> transition to HALF_OPEN
    if (this.state === "OPEN") {
      if (now >= this.nextAttemptAt) {
        this.state = "HALF_OPEN";
        this.successCount = 0;
      } else {
        const error = new Error(`CircuitBreaker [${this.name}] is OPEN. Fast-failing upstream call.`);
        error.circuitOpen = true;
        if (fallbackAction) {
          return await fallbackAction(error);
        }
        throw error;
      }
    }

    try {
      const result = await action();
      this.onSuccess();
      return result;
    } catch (err) {
      this.onFailure(err);
      if (fallbackAction) {
        return await fallbackAction(err);
      }
      throw err;
    }
  }

  onSuccess() {
    this.failureCount = 0;
    this.lastError = null;

    if (this.state === "HALF_OPEN") {
      this.successCount++;
      if (this.successCount >= this.halfOpenSuccessThreshold) {
        this.state = "CLOSED";
        console.log(`[CircuitBreaker] ✅ [${this.name}] recovered! State switched to CLOSED.`);
      }
    }
  }

  onFailure(err) {
    this.failureCount++;
    this.lastError = err.message;

    if (this.state === "HALF_OPEN" || this.failureCount >= this.failureThreshold) {
      this.state = "OPEN";
      this.nextAttemptAt = Date.now() + this.resetTimeoutMs;
      console.warn(`[CircuitBreaker] ⚠️ [${this.name}] tripped! State switched to OPEN for ${this.resetTimeoutMs / 1000}s. Error: ${err.message}`);
    }
  }

  getStatus() {
    return {
      name: this.name,
      state: this.state,
      failureCount: this.failureCount,
      lastError: this.lastError,
      isAvailable: this.state !== "OPEN"
    };
  }
}
