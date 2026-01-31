import { docker } from "../../clients/docker";
import { config } from "../../config/environment";
import { LABELS, VOLUMES } from "../../config/constants";
import {
  formatProjectName,
  formatContainerName,
  formatUniqueHostname,
  formatNetworkAlias,
} from "../../types/session";
import {
  findContainersByProjectId,
  findPortsByContainerId,
  findEnvVarsByContainerId,
  updateSessionContainerDockerId,
  updateSessionContainersStatusBySessionId,
} from "../repositories/container.repository";
import { deleteSession } from "../repositories/session.repository";
import { proxyManager, isProxyInitialized, ensureProxyInitialized } from "../proxy";
import { publisher } from "../../clients/publisher";
import type { BrowserService } from "../browser/browser-service";
import { createSessionNetwork, cleanupSessionNetwork } from "./network";
import { initializeContainerWorkspace } from "./workspace";

interface ClusterContainer {
  containerId: string;
  hostname: string;
  ports: Record<number, number>;
}

export async function initializeSessionContainers(
  sessionId: string,
  projectId: string,
  browserService: BrowserService,
): Promise<void> {
  const containerDefinitions = await findContainersByProjectId(projectId);
  const dockerIds: string[] = [];
  const clusterContainers: ClusterContainer[] = [];

  let networkName: string;

  try {
    networkName = await createSessionNetwork(sessionId);

    for (const containerDefinition of containerDefinitions) {
      const ports = await findPortsByContainerId(containerDefinition.id);
      const envVars = await findEnvVarsByContainerId(containerDefinition.id);

      const containerWorkspace = await initializeContainerWorkspace(
        sessionId,
        containerDefinition.id,
        containerDefinition.image,
      );

      const env: Record<string, string> = {};
      for (const envVar of envVars) {
        env[envVar.key] = envVar.value;
      }

      const serviceHostname = containerDefinition.hostname ?? containerDefinition.id;
      const uniqueHostname = formatUniqueHostname(sessionId, containerDefinition.id);
      const projectName = formatProjectName(sessionId);
      const containerName = formatContainerName(sessionId, containerDefinition.id);

      const containerVolumes = [
        { source: VOLUMES.WORKSPACES_HOST_PATH, target: "/workspaces" },
        { source: config.browserSocketVolume, target: VOLUMES.BROWSER_SOCKET_DIR },
      ];
      env.AGENT_BROWSER_SOCKET_DIR = VOLUMES.BROWSER_SOCKET_DIR;
      env.AGENT_BROWSER_SESSION = sessionId;

      const dockerId = await docker.createContainer({
        name: containerName,
        image: containerDefinition.image,
        hostname: uniqueHostname,
        networkMode: networkName,
        workdir: containerWorkspace,
        env: Object.keys(env).length > 0 ? env : undefined,
        ports: ports.map(({ port }) => ({ container: port, host: undefined })),
        volumes: containerVolumes,
        labels: {
          "com.docker.compose.project": projectName,
          "com.docker.compose.service": serviceHostname,
          [LABELS.SESSION]: sessionId,
          [LABELS.PROJECT]: projectId,
          [LABELS.CONTAINER]: containerDefinition.id,
        },
      });

      dockerIds.push(dockerId);
      await updateSessionContainerDockerId(sessionId, containerDefinition.id, dockerId);
      await docker.startContainer(dockerId);

      const portMap: Record<number, number> = {};
      const networkAliases: string[] = [];
      for (const { port } of ports) {
        portMap[port] = port;
        networkAliases.push(formatNetworkAlias(sessionId, port));
      }

      if (networkAliases.length > 0) {
        await docker.disconnectFromNetwork(dockerId, networkName);
        await docker.connectToNetwork(dockerId, networkName, { aliases: networkAliases });
      }

      if (Object.keys(portMap).length > 0) {
        clusterContainers.push({
          containerId: containerDefinition.id,
          hostname: uniqueHostname,
          ports: portMap,
        });
      }
    }

    await ensureProxyInitialized();
    if (isProxyInitialized() && clusterContainers.length > 0) {
      await proxyManager.registerCluster(sessionId, networkName, clusterContainers);
    }
  } catch (error) {
    console.error(`Failed to initialize session ${sessionId}:`, error);
    await handleInitializationError(sessionId, projectId, dockerIds, browserService);
  }
}

async function handleInitializationError(
  sessionId: string,
  projectId: string,
  dockerIds: string[],
  browserService: BrowserService,
): Promise<void> {
  const errorContainers = await updateSessionContainersStatusBySessionId(sessionId, "error");

  for (const container of errorContainers) {
    publisher.publishDelta(
      "sessionContainers",
      { uuid: sessionId },
      { type: "update", container: { id: container.id, status: "error" } },
    );
  }

  await Promise.all(
    dockerIds.map((dockerId) =>
      docker
        .stopContainer(dockerId)
        .then(() => docker.removeContainer(dockerId))
        .catch((err) => console.error(`Failed to cleanup container ${dockerId}:`, err)),
    ),
  );

  await cleanupSessionNetwork(sessionId).catch((err) =>
    console.error(`Failed to cleanup network for session ${sessionId}:`, err),
  );

  await browserService.forceStopBrowser(sessionId);
  await deleteSession(sessionId);

  publisher.publishDelta("sessions", {
    type: "remove",
    session: { id: sessionId, projectId, title: null },
  });
}
