import { formatProxyUrl } from "../shared/naming";
import type { RouteInfo } from "../types/proxy";
import type { RedisClient } from "bun";

interface ClusterRegistration {
  routes: RouteInfo[];
}

export class ProxyManager {
  constructor(
    private readonly proxyBaseDomain: string,
    private readonly redis: RedisClient,
  ) {}

  async registerCluster(
    clusterId: string,
    containers: { containerId: string; hostname: string; ports: Record<number, number> }[],
  ): Promise<RouteInfo[]> {
    const routes: RouteInfo[] = [];

    for (const container of containers) {
      for (const portStr of Object.keys(container.ports)) {
        const port = parseInt(portStr, 10);
        routes.push({
          containerPort: port,
          url: formatProxyUrl(clusterId, port, this.proxyBaseDomain),
        });
      }
    }

    const registration: ClusterRegistration = { routes };
    await this.redis.set(`proxy:cluster:${clusterId}`, JSON.stringify(registration));
    await this.redis.sadd("proxy:clusters", clusterId);
    console.log(`[Proxy] Registered cluster ${clusterId} with ${routes.length} routes`);
    return routes;
  }

  async unregisterCluster(clusterId: string): Promise<void> {
    await this.redis.del(`proxy:cluster:${clusterId}`);
    await this.redis.srem("proxy:clusters", clusterId);
    console.log(`[Proxy] Unregistered cluster ${clusterId}`);
  }

  async getUrls(clusterId: string): Promise<RouteInfo[]> {
    const data = await this.redis.get(`proxy:cluster:${clusterId}`);
    if (!data) {
      return [];
    }
    const registration: ClusterRegistration = JSON.parse(data);
    return registration.routes;
  }
}
