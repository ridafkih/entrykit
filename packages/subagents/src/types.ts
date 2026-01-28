export interface SubAgentResult {
  success: boolean;
  summary?: string;
  error?: string;
  stepsExecuted: number;
  trace: ExecutionStep[];
}

export interface ExecutionStep {
  action: string;
  params?: Record<string, unknown>;
  result?: unknown;
  error?: string;
  timestamp: string;
}

export interface Screenshot {
  data: string;
  encoding: "base64";
  format: string;
}
