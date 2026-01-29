import type { ClientMessage, ServerMessage } from "@lab/multiplayer-shared";

export type ConnectionState =
  | { status: "connecting" }
  | { status: "connected" }
  | { status: "disconnected"; reason?: string }
  | { status: "reconnecting"; attempt: number };

export interface ConnectionConfig {
  url: string;
  protocols?: string[];
  reconnect?: boolean;
  maxReconnectAttempts?: number;
  reconnectInterval?: number;
  heartbeatInterval?: number;
}

type MessageListener = (message: ServerMessage) => void;
type StateListener = (state: ConnectionState) => void;

export class ConnectionManager {
  private ws: WebSocket | null = null;
  private config: Required<ConnectionConfig>;
  private state: ConnectionState = { status: "disconnected" };
  private messageListeners = new Map<string, Set<MessageListener>>();
  private stateListeners = new Set<StateListener>();
  private subscriptionCounts = new Map<string, number>();
  private messageQueue: ClientMessage[] = [];
  private reconnectAttempt = 0;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;

  constructor(config: ConnectionConfig) {
    this.config = {
      protocols: [],
      reconnect: true,
      maxReconnectAttempts: 10,
      reconnectInterval: 1000,
      heartbeatInterval: 30000,
      ...config,
    };
  }

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) return;

    this.setState({ status: "connecting" });

    try {
      this.ws = new WebSocket(this.config.url, this.config.protocols);
      this.ws.onopen = this.handleOpen.bind(this);
      this.ws.onclose = this.handleClose.bind(this);
      this.ws.onerror = this.handleError.bind(this);
      this.ws.onmessage = this.handleMessage.bind(this);
    } catch {
      this.handleClose();
    }
  }

  disconnect(): void {
    this.config.reconnect = false;
    this.clearReconnectTimeout();
    this.clearHeartbeat();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.setState({ status: "disconnected" });
  }

  subscribe(channel: string, listener: MessageListener): () => void {
    const count = this.subscriptionCounts.get(channel) ?? 0;
    this.subscriptionCounts.set(channel, count + 1);

    if (!this.messageListeners.has(channel)) {
      this.messageListeners.set(channel, new Set());
    }
    this.messageListeners.get(channel)!.add(listener);

    if (count === 0) {
      this.send({ type: "subscribe", channel });
    }

    return () => {
      const listeners = this.messageListeners.get(channel);
      if (listeners) {
        listeners.delete(listener);
      }

      const newCount = (this.subscriptionCounts.get(channel) ?? 1) - 1;
      if (newCount <= 0) {
        this.subscriptionCounts.delete(channel);
        this.messageListeners.delete(channel);
        this.send({ type: "unsubscribe", channel });
      } else {
        this.subscriptionCounts.set(channel, newCount);
      }
    };
  }

  send(message: ClientMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      this.messageQueue.push(message);
    }
  }

  sendEvent(channel: string, data: unknown): void {
    this.send({ type: "event", channel, data });
  }

  onStateChange(listener: StateListener): () => void {
    this.stateListeners.add(listener);
    listener(this.state);
    return () => {
      this.stateListeners.delete(listener);
    };
  }

  getState(): ConnectionState {
    return this.state;
  }

  private setState(state: ConnectionState): void {
    this.state = state;
    for (const listener of this.stateListeners) {
      listener(state);
    }
  }

  private handleOpen(): void {
    this.reconnectAttempt = 0;
    this.setState({ status: "connected" });
    this.flushQueue();
    this.resubscribeAll();
    this.startHeartbeat();
  }

  private handleClose(): void {
    this.clearHeartbeat();
    this.ws = null;

    if (this.config.reconnect && this.reconnectAttempt < this.config.maxReconnectAttempts) {
      this.reconnectAttempt++;
      this.setState({ status: "reconnecting", attempt: this.reconnectAttempt });
      const delay = Math.min(
        this.config.reconnectInterval * Math.pow(2, this.reconnectAttempt - 1),
        30000,
      );
      this.reconnectTimeout = setTimeout(() => this.connect(), delay);
    } else {
      this.setState({ status: "disconnected", reason: "Connection closed" });
    }
  }

  private handleError(): void {
    // Error handling is done in handleClose
  }

  private handleMessage(event: MessageEvent): void {
    try {
      const message = JSON.parse(event.data) as ServerMessage;

      if (message.type === "pong") {
        return;
      }

      if ("channel" in message) {
        const listeners = this.messageListeners.get(message.channel);
        if (listeners) {
          for (const listener of listeners) {
            listener(message);
          }
        }
      }
    } catch {
      // Ignore malformed messages
    }
  }

  private flushQueue(): void {
    const queue = this.messageQueue;
    this.messageQueue = [];
    for (const message of queue) {
      this.send(message);
    }
  }

  private resubscribeAll(): void {
    for (const channel of this.subscriptionCounts.keys()) {
      this.send({ type: "subscribe", channel });
    }
  }

  private startHeartbeat(): void {
    this.clearHeartbeat();
    this.heartbeatInterval = setInterval(() => {
      this.send({ type: "ping" });
    }, this.config.heartbeatInterval);
  }

  private clearHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private clearReconnectTimeout(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }
}
