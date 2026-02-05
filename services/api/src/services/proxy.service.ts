import { formatProxyUrl } from "../shared/naming";
import type { RouteInfo } from "../types/proxy";

interface ClusterRegistration {
  networkName: string;
  routes: RouteInfo[];
}

export class ProxyManager {
  private readonly clusters = new Map<string, ClusterRegistration>();

  constructor(private readonly proxyBaseDomain: string) {}

  async registerCluster(
    clusterId: string,
    networkName: string,
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

    this.clusters.set(clusterId, { networkName, routes });
    console.log(`[Proxy] Registered cluster ${clusterId} with ${routes.length} routes`);
    return routes;
  }

  async unregisterCluster(clusterId: string): Promise<void> {
    this.clusters.delete(clusterId);
    console.log(`[Proxy] Unregistered cluster ${clusterId}`);
  }

  getUrls(clusterId: string): RouteInfo[] {
    const registration = this.clusters.get(clusterId);
    if (!registration) {
      return [];
    }
    return registration.routes;
  }
}
