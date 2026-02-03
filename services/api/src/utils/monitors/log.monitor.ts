import { docker } from "../../clients/docker";
import { publisher } from "../../clients/publisher";
import { findAllRunningSessionContainers } from "../repositories/container.repository";

type LogChunk = {
  stream: "stdout" | "stderr";
  data: Uint8Array;
};

const MAX_BUFFER_SIZE = 500;
const MAX_LINES_PER_SECOND = 100;

type LogSource = {
  id: string;
  hostname: string;
  dockerId: string;
  status: "streaming" | "stopped" | "error";
};

type LogEntry = {
  containerId: string;
  stream: "stdout" | "stderr";
  text: string;
  timestamp: number;
};

class CircularBuffer<T> {
  private buffer: T[] = [];
  private maxSize: number;

  constructor(maxSize: number) {
    this.maxSize = maxSize;
  }

  push(item: T): void {
    this.buffer.push(item);
    if (this.buffer.length > this.maxSize) {
      this.buffer.shift();
    }
  }

  getAll(): T[] {
    return [...this.buffer];
  }

  clear(): void {
    this.buffer = [];
  }
}

class RateLimiter {
  private count = 0;
  private lastReset = Date.now();
  private readonly limit: number;

  constructor(limit: number) {
    this.limit = limit;
  }

  canProceed(): boolean {
    const now = Date.now();
    if (now - this.lastReset >= 1000) {
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

class LogStreamTracker {
  private abortController: AbortController | null = null;
  private buffer: CircularBuffer<LogEntry>;
  private rateLimiter: RateLimiter;
  private isStreaming = false;

  constructor(
    public readonly containerId: string,
    public readonly sessionId: string,
    public readonly dockerId: string,
    public readonly hostname: string,
  ) {
    this.buffer = new CircularBuffer(MAX_BUFFER_SIZE);
    this.rateLimiter = new RateLimiter(MAX_LINES_PER_SECOND);
  }

  async start(): Promise<void> {
    if (this.isStreaming) return;

    this.abortController = new AbortController();
    this.isStreaming = true;

    this.runStreamLoop().catch((error) => {
      console.error(`[LogMonitor] Stream error for ${this.containerId}:`, error);
      this.updateStatus("error");
    });
  }

  stop(): void {
    this.isStreaming = false;
    this.abortController?.abort();
    this.abortController = null;
  }

  getBufferedLogs(): LogEntry[] {
    return this.buffer.getAll();
  }

  getSource(): LogSource {
    return {
      id: this.containerId,
      hostname: this.hostname,
      dockerId: this.dockerId,
      status: this.isStreaming ? "streaming" : "stopped",
    };
  }

  private async runStreamLoop(): Promise<void> {
    try {
      for await (const chunk of docker.streamLogs(this.dockerId, { tail: 100 })) {
        if (!this.isStreaming) break;

        const lines = this.parseChunk(chunk);
        for (const line of lines) {
          this.processLogLine(line.stream, line.text);
        }
      }
    } catch (error) {
      if (this.isStreaming) {
        console.error(`[LogMonitor] Error streaming logs for ${this.containerId}:`, error);
        this.updateStatus("error");
      }
    } finally {
      if (this.isStreaming) {
        this.isStreaming = false;
        this.updateStatus("stopped");
      }
    }
  }

  private parseChunk(chunk: LogChunk): { stream: "stdout" | "stderr"; text: string }[] {
    const text = new TextDecoder().decode(chunk.data);
    const lines = text.split("\n").filter((line) => line.length > 0);

    return lines.map((line) => ({
      stream: chunk.stream,
      text: line,
    }));
  }

  private processLogLine(stream: "stdout" | "stderr", text: string): void {
    const entry: LogEntry = {
      containerId: this.containerId,
      stream,
      text,
      timestamp: Date.now(),
    };

    this.buffer.push(entry);

    if (this.rateLimiter.canProceed()) {
      publisher.publishEvent("sessionLogs", { uuid: this.sessionId }, entry);
    }
  }

  private updateStatus(status: "streaming" | "stopped" | "error"): void {
    publisher.publishDelta(
      "sessionLogs",
      { uuid: this.sessionId },
      {
        type: "source_update",
        containerId: this.containerId,
        status,
      },
    );
  }
}

type ContainerStartedEvent = {
  sessionId: string;
  containerId: string;
  dockerId: string;
  hostname: string;
};

type ContainerStoppedEvent = {
  sessionId: string;
  containerId: string;
};

class LogMonitor {
  private trackers = new Map<string, LogStreamTracker>();
  private sessionTrackers = new Map<string, Set<string>>();

  async start(): Promise<void> {
    console.log("[LogMonitor] Starting and scanning for running containers...");

    try {
      const runningContainers = await findAllRunningSessionContainers();
      console.log(`[LogMonitor] Found ${runningContainers.length} running container(s)`);

      for (const container of runningContainers) {
        this.onContainerStarted({
          sessionId: container.sessionId,
          containerId: container.id,
          dockerId: container.dockerId,
          hostname: container.hostname,
        });
      }
    } catch (error) {
      console.error("[LogMonitor] Failed to scan for running containers:", error);
    }
  }

  onContainerStarted(event: ContainerStartedEvent): void {
    const { sessionId, containerId, dockerId, hostname } = event;
    const key = `${sessionId}:${containerId}`;

    if (this.trackers.has(key)) {
      console.log(`[LogMonitor] Tracker already exists for ${containerId}`);
      return;
    }

    const tracker = new LogStreamTracker(containerId, sessionId, dockerId, hostname);
    this.trackers.set(key, tracker);

    if (!this.sessionTrackers.has(sessionId)) {
      this.sessionTrackers.set(sessionId, new Set());
    }
    this.sessionTrackers.get(sessionId)!.add(key);

    publisher.publishDelta(
      "sessionLogs",
      { uuid: sessionId },
      {
        type: "source_add",
        source: tracker.getSource(),
      },
    );

    tracker.start();
    console.log(
      `[LogMonitor] Started tracking logs for container ${containerId} in session ${sessionId}`,
    );
  }

  onContainerStopped(event: ContainerStoppedEvent): void {
    const { sessionId, containerId } = event;
    const key = `${sessionId}:${containerId}`;

    const tracker = this.trackers.get(key);
    if (!tracker) {
      console.log(`[LogMonitor] No tracker found for ${containerId}`);
      return;
    }

    tracker.stop();

    publisher.publishDelta(
      "sessionLogs",
      { uuid: sessionId },
      {
        type: "source_update",
        containerId,
        status: "stopped",
      },
    );

    console.log(`[LogMonitor] Stopped tracking logs for container ${containerId}`);
  }

  getSessionSnapshot(sessionId: string): {
    sources: LogSource[];
    recentLogs: Record<string, LogEntry[]>;
  } {
    const trackerKeys = this.sessionTrackers.get(sessionId);
    if (!trackerKeys || trackerKeys.size === 0) {
      return { sources: [], recentLogs: {} };
    }

    const sources: LogSource[] = [];
    const recentLogs: Record<string, LogEntry[]> = {};

    for (const key of trackerKeys) {
      const tracker = this.trackers.get(key);
      if (tracker) {
        sources.push(tracker.getSource());
        recentLogs[tracker.containerId] = tracker.getBufferedLogs();
      }
    }

    return { sources, recentLogs };
  }

  cleanup(sessionId: string): void {
    const trackerKeys = this.sessionTrackers.get(sessionId);
    if (!trackerKeys) return;

    for (const key of trackerKeys) {
      const tracker = this.trackers.get(key);
      if (tracker) {
        tracker.stop();
        this.trackers.delete(key);
      }
    }

    this.sessionTrackers.delete(sessionId);
    console.log(`[LogMonitor] Cleaned up all trackers for session ${sessionId}`);
  }

  stop(): void {
    for (const tracker of this.trackers.values()) {
      tracker.stop();
    }
    this.trackers.clear();
    this.sessionTrackers.clear();
    console.log("[LogMonitor] Stopped all trackers");
  }
}

export const logMonitor = new LogMonitor();

export function createLogMonitor() {
  return {
    start: () => logMonitor.start(),
    onContainerStarted: (event: ContainerStartedEvent) => logMonitor.onContainerStarted(event),
    onContainerStopped: (event: ContainerStoppedEvent) => logMonitor.onContainerStopped(event),
    getSessionSnapshot: (sessionId: string) => logMonitor.getSessionSnapshot(sessionId),
    cleanup: (sessionId: string) => logMonitor.cleanup(sessionId),
    stop: () => logMonitor.stop(),
  };
}
