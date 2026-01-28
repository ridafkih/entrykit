import { LIMITS } from "../config/constants";

export class RateLimiter {
  private count = 0;
  private lastReset = Date.now();
  private readonly limit: number;

  constructor(limit: number) {
    this.limit = limit;
  }

  canProceed(): boolean {
    const now = Date.now();
    if (now - this.lastReset >= LIMITS.RATE_LIMITER_WINDOW_MS) {
      this.count = 0;
      this.lastReset = now;
    }
    if (this.count < this.limit) {
      this.count++;
      return true;
    }
    return false;
  }
}
