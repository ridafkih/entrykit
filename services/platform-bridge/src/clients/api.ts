import { config } from "../config/environment";
import type { OrchestrationRequest, OrchestrationResult } from "../types/messages";

export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = config.apiUrl) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
  }

  async orchestrate(request: OrchestrationRequest): Promise<OrchestrationResult> {
    const response = await fetch(`${this.baseUrl}/orchestrate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "Unknown error" }));
      throw new Error(`Orchestration failed: ${error.error || response.statusText}`);
    }

    return response.json();
  }

  async getSession(sessionId: string): Promise<{ id: string; status: string } | null> {
    const response = await fetch(`${this.baseUrl}/sessions/${sessionId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error(`Failed to get session: ${response.statusText}`);
    }

    return response.json();
  }

  async isSessionActive(sessionId: string): Promise<boolean> {
    const session = await this.getSession(sessionId);
    return session !== null && session.status === "running";
  }

  async sendMessageToSession(sessionId: string, content: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/sessions/${sessionId}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ content }),
    });

    if (!response.ok) {
      throw new Error(`Failed to send message: ${response.statusText}`);
    }
  }
}

export const apiClient = new ApiClient();
