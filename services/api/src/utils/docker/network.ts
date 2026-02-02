import { docker } from "../../clients/docker";
import { config } from "../../config/environment";
import { LABELS } from "../../config/constants";
import { formatNetworkName } from "../../types/session";

export async function createSessionNetwork(sessionId: string): Promise<string> {
  const networkName = formatNetworkName(sessionId);
  await docker.createNetwork(networkName, { labels: { [LABELS.SESSION]: sessionId } });

  if (config.browserContainerName) {
    try {
      await docker.connectToNetwork(config.browserContainerName, networkName);
    } catch (error) {
      console.warn(`Failed to connect browser container to network ${networkName}:`, error);
    }
  }

  if (config.opencodeContainerName) {
    try {
      await docker.connectToNetwork(config.opencodeContainerName, networkName);
    } catch (error) {
      console.warn(`Failed to connect opencode container to network ${networkName}:`, error);
    }
  }

  return networkName;
}

export async function cleanupSessionNetwork(sessionId: string): Promise<void> {
  const networkName = formatNetworkName(sessionId);

  if (config.caddyContainerName) {
    try {
      await docker.disconnectFromNetwork(config.caddyContainerName, networkName);
    } catch (error) {
      console.warn(`Failed to disconnect caddy from network ${networkName}:`, error);
    }
  }

  if (config.browserContainerName) {
    try {
      await docker.disconnectFromNetwork(config.browserContainerName, networkName);
    } catch (error) {
      console.warn(`Failed to disconnect browser from network ${networkName}:`, error);
    }
  }

  if (config.opencodeContainerName) {
    try {
      await docker.disconnectFromNetwork(config.opencodeContainerName, networkName);
    } catch (error) {
      console.warn(`Failed to disconnect opencode from network ${networkName}:`, error);
    }
  }

  await docker.removeNetwork(networkName);
}
