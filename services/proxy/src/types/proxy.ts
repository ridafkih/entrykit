export interface UpstreamInfo {
  hostname: string;
  port: number;
}

export interface WebSocketData {
  upstream: UpstreamInfo;
  upstreamWs: WebSocket | null;
  path: string;
  pendingMessages: (string | Buffer)[];
}
