import type { Publisher } from "../types/dependencies";

export class DeferredPublisher {
  private publisher: Publisher | null = null;

  resolve(publisher: Publisher): void {
    if (this.publisher) {
      throw new Error("DeferredPublisher already resolved");
    }
    this.publisher = publisher;
  }

  get(): Publisher {
    if (!this.publisher) {
      throw new Error("DeferredPublisher not yet resolved - call resolve() first");
    }
    return this.publisher;
  }
}
