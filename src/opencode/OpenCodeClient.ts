export interface OpenCodeClientConfig {
  baseUrl: string;
  basicAuth?: {
    username: string;
    password: string;
  };
}

export interface TextPart {
  type: "text";
  text: string;
}

export interface PromptRequest {
  parts: TextPart[];
  noReply?: boolean;
  system?: string;
}

export class OpenCodeClient {
  private config: OpenCodeClientConfig;

  constructor(config: OpenCodeClientConfig) {
    this.config = config;
  }

  updateConfig(config: Partial<OpenCodeClientConfig>): void {
    this.config = { ...this.config, ...config };
  }

  async promptNoReply(sessionId: string, text: string): Promise<void> {
    const url = `${this.config.baseUrl}/session/${sessionId}/message`;

    const body: PromptRequest = {
      parts: [{ type: "text", text }],
      noReply: true,
    };

    const response = await fetch(url, {
      method: "POST",
      headers: this.buildHeaders(),
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      throw new Error(`promptNoReply failed: ${response.status} ${errorText}`);
    }
  }

  async promptNoReplyWithSystem(
    sessionId: string,
    text: string,
    system: string
  ): Promise<void> {
    const url = `${this.config.baseUrl}/session/${sessionId}/message`;

    const body: PromptRequest = {
      parts: [{ type: "text", text }],
      noReply: true,
      system,
    };

    const response = await fetch(url, {
      method: "POST",
      headers: this.buildHeaders(),
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      throw new Error(`promptNoReplyWithSystem failed: ${response.status} ${errorText}`);
    }
  }

  async listSessions(): Promise<{ id: string; title?: string }[]> {
    const url = `${this.config.baseUrl}/session`;

    const response = await fetch(url, {
      method: "GET",
      headers: this.buildHeaders(),
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      throw new Error(`listSessions failed: ${response.status}`);
    }

    const data = await response.json();
    return data.sessions ?? data ?? [];
  }

  async healthCheck(): Promise<boolean> {
    try {
      const url = `${this.config.baseUrl}/global/health`;
      const response = await fetch(url, {
        method: "GET",
        headers: this.buildHeaders(),
        signal: AbortSignal.timeout(2000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (this.config.basicAuth) {
      const credentials = btoa(
        `${this.config.basicAuth.username}:${this.config.basicAuth.password}`
      );
      headers["Authorization"] = `Basic ${credentials}`;
    }

    return headers;
  }
}
