import type { CaddyConfig, CaddyRoute } from "../../types/proxy";

export class CaddyClient {
  private readonly adminUrl: string;
  private configLock: Promise<void> = Promise.resolve();

  constructor(adminUrl: string) {
    this.adminUrl = adminUrl;
  }

  private async withConfigLock<Result>(operation: () => Promise<Result>): Promise<Result> {
    const { promise: acquired, resolve: release } = Promise.withResolvers<void>();
    const previousLock = this.configLock;
    this.configLock = acquired;

    try {
      await previousLock;
      return await operation();
    } finally {
      release();
    }
  }

  async getConfig(): Promise<unknown> {
    const response = await fetch(`${this.adminUrl}/config/`);

    if (!response.ok) {
      throw new Error(`Failed to get Caddy config: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async loadConfig(config: CaddyConfig): Promise<void> {
    const response = await fetch(`${this.adminUrl}/load`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(
        `Failed to load Caddy config: ${response.status} ${response.statusText} - ${body}`,
      );
    }
  }

  async addRoute(route: CaddyRoute): Promise<void> {
    const response = await fetch(`${this.adminUrl}/config/apps/http/servers/srv0/routes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(route),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Failed to add route: ${response.status} ${response.statusText} - ${body}`);
    }
  }

  async deleteRoute(id: string): Promise<void> {
    const response = await fetch(`${this.adminUrl}/id/${id}`, {
      method: "DELETE",
    });

    if (!response.ok && response.status !== 404) {
      const body = await response.text();
      throw new Error(
        `Failed to delete route ${id}: ${response.status} ${response.statusText} - ${body}`,
      );
    }
  }

  async isHealthy(): Promise<boolean> {
    try {
      const response = await fetch(`${this.adminUrl}/config/`);
      return response.ok;
    } catch {
      return false;
    }
  }

  async addRoutes(routes: CaddyRoute[]): Promise<void> {
    return this.withConfigLock(async () => {
      const currentConfig = (await this.getConfig()) as CaddyConfig;
      const existingRoutes = currentConfig?.apps?.http?.servers?.srv0?.routes ?? [];

      const newRouteIds = new Set(routes.map((route) => route["@id"]));
      const filteredExisting = existingRoutes.filter(
        (route: CaddyRoute) => !newRouteIds.has(route["@id"]),
      );

      const newConfig: CaddyConfig = {
        admin: currentConfig?.admin ?? { listen: "0.0.0.0:2019" },
        apps: {
          http: {
            servers: {
              srv0: {
                listen: currentConfig?.apps?.http?.servers?.srv0?.listen ?? [":80"],
                routes: [...filteredExisting, ...routes],
              },
            },
          },
        },
      };

      await this.loadConfig(newConfig);
    });
  }

  async deleteRoutes(ids: string[]): Promise<void> {
    return this.withConfigLock(async () => {
      const currentConfig = (await this.getConfig()) as CaddyConfig;
      const existingRoutes = currentConfig?.apps?.http?.servers?.srv0?.routes ?? [];

      const idsToDelete = new Set(ids);
      const filteredRoutes = existingRoutes.filter(
        (route: CaddyRoute) => !idsToDelete.has(route["@id"]),
      );

      const newConfig: CaddyConfig = {
        admin: currentConfig?.admin ?? { listen: "0.0.0.0:2019" },
        apps: {
          http: {
            servers: {
              srv0: {
                listen: currentConfig?.apps?.http?.servers?.srv0?.listen ?? [":80"],
                routes: filteredRoutes,
              },
            },
          },
        },
      };

      await this.loadConfig(newConfig);
    });
  }
}
