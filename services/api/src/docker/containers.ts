import { LABELS, VOLUMES } from "../config/constants";
import { formatProjectName, formatContainerName, formatUniqueHostname } from "../shared/naming";
import { findContainersWithDependencies } from "../repositories/container-dependency.repository";
import {
  updateSessionContainerDockerId,
  updateSessionContainersStatusBySessionId,
} from "../repositories/container-session.repository";
import { CircularDependencyError } from "@lab/sandbox-sdk";
import { findSessionById } from "../repositories/session.repository";
import { SESSION_STATUS } from "../types/session";
import { CONTAINER_STATUS } from "../types/container";
import type { BrowserService } from "../browser/browser-service";
import { createSessionNetwork, cleanupSessionNetwork, type NetworkContainerNames } from "./network";
import { buildEnvironmentVariables } from "./environment-builder";
import { buildNetworkAliasesAndPortMap } from "./port-mapper";
import {
  buildContainerNodes,
  prepareContainerData,
  resolveStartOrder,
  type PreparedContainer,
} from "./container-preparer";
import {
  cleanupOrphanedResources,
  cleanupOnError,
  type CleanupSessionDeps,
} from "../services/session-cleanup.service";
import type { Sandbox, Publisher } from "../types/dependencies";
import type { ProxyManager } from "../services/proxy.service";

interface ClusterContainer {
  containerId: string;
  hostname: string;
  ports: Record<number, number>;
}

export interface InitializeSessionContainersDeps {
  containerNames: NetworkContainerNames;
  browserSocketVolume: string;
  sandbox: Sandbox;
  publisher: Publisher;
  proxyManager: ProxyManager;
}

async function createAndStartContainer(
  sessionId: string,
  projectId: string,
  networkName: string,
  prepared: PreparedContainer,
  deps: Pick<InitializeSessionContainersDeps, "sandbox" | "browserSocketVolume">,
): Promise<{ dockerId: string; clusterContainer: ClusterContainer | null }> {
  const { containerDefinition, ports, envVars, containerWorkspace } = prepared;
  const { sandbox, browserSocketVolume } = deps;
  const { provider } = sandbox;

  const env = buildEnvironmentVariables(sessionId, envVars);
  const serviceHostname = containerDefinition.hostname || containerDefinition.id;
  const uniqueHostname = formatUniqueHostname(sessionId, containerDefinition.id);
  const projectName = formatProjectName(sessionId);
  const containerName = formatContainerName(sessionId, containerDefinition.id);

  const containerVolumes = [
    { source: VOLUMES.WORKSPACES_HOST_PATH, target: "/workspaces" },
    { source: VOLUMES.OPENCODE_AUTH_HOST_PATH, target: VOLUMES.OPENCODE_AUTH_TARGET },
    { source: browserSocketVolume, target: VOLUMES.BROWSER_SOCKET_DIR },
  ];

  console.log(`[Container] Creating ${containerDefinition.image} for session ${sessionId}`);
  const dockerId = await provider.createContainer({
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
    restartPolicy: {
      name: "on-failure",
      maximumRetryCount: 3,
    },
  });
  console.log(`[Container] Created ${dockerId}, starting...`);

  try {
    await provider.startContainer(dockerId);
  } catch (startError) {
    console.error(`[Container] Failed to start ${dockerId}, cleaning up...`);
    try {
      await provider.removeContainer(dockerId);
    } catch (removeError) {
      console.error(`[Container] Failed to remove ${dockerId} after start failure:`, removeError);
    }
    throw startError;
  }

  await updateSessionContainerDockerId(sessionId, containerDefinition.id, dockerId);
  console.log(`[Container] Started ${dockerId}`);

  const { portMap, networkAliases } = buildNetworkAliasesAndPortMap(
    sessionId,
    containerDefinition.id,
    ports,
  );

  if (networkAliases.length > 0) {
    const isConnected = await provider.isConnectedToNetwork(dockerId, networkName);
    if (isConnected) {
      await provider.disconnectFromNetwork(dockerId, networkName);
    }
    await provider.connectToNetwork(dockerId, networkName, { aliases: networkAliases });

    const verifyConnected = await provider.isConnectedToNetwork(dockerId, networkName);
    if (!verifyConnected) {
      throw new Error(`Failed to connect container ${dockerId} to network ${networkName}`);
    }
  }

  const clusterContainer =
    Object.keys(portMap).length > 0
      ? { containerId: containerDefinition.id, hostname: uniqueHostname, ports: portMap }
      : null;

  return { dockerId, clusterContainer };
}

async function startContainersInLevel(
  sessionId: string,
  projectId: string,
  networkName: string,
  containerIds: string[],
  preparedByContainerId: Map<string, PreparedContainer>,
  deps: Pick<InitializeSessionContainersDeps, "sandbox" | "browserSocketVolume">,
): Promise<{ dockerIds: string[]; clusterContainers: ClusterContainer[] }> {
  const levelDockerIds: string[] = [];
  const levelClusterContainers: ClusterContainer[] = [];

  const results = await Promise.all(
    containerIds.map((containerId) => {
      const prepared = preparedByContainerId.get(containerId);
      if (!prepared) {
        throw new Error(`Prepared container not found for ${containerId}`);
      }
      return createAndStartContainer(sessionId, projectId, networkName, prepared, deps);
    }),
  );

  for (const result of results) {
    levelDockerIds.push(result.dockerId);
    if (result.clusterContainer) {
      levelClusterContainers.push(result.clusterContainer);
    }
  }

  return { dockerIds: levelDockerIds, clusterContainers: levelClusterContainers };
}

export async function initializeSessionContainers(
  sessionId: string,
  projectId: string,
  browserService: BrowserService,
  deps: InitializeSessionContainersDeps,
): Promise<void> {
  const { containerNames, sandbox, publisher, proxyManager } = deps;

  const containerDefinitions = await findContainersWithDependencies(projectId);
  const dockerIds: string[] = [];
  const clusterContainers: ClusterContainer[] = [];

  // Build cleanup deps for error handling and orphan cleanup
  const cleanupDeps: CleanupSessionDeps = {
    sandbox,
    publisher,
    proxyManager,
    cleanupSessionNetwork: (sid: string) => cleanupSessionNetwork(sid, containerNames, sandbox),
  };

  try {
    const containerNodes = buildContainerNodes(containerDefinitions);
    const startLevels = resolveStartOrder(containerNodes);

    const networkName = await createSessionNetwork(sessionId, containerNames, sandbox);

    const preparedContainers = await Promise.all(
      containerDefinitions.map((definition) =>
        prepareContainerData(sessionId, definition, sandbox),
      ),
    );

    const preparedByContainerId = new Map<string, PreparedContainer>();
    for (const prepared of preparedContainers) {
      preparedByContainerId.set(prepared.containerDefinition.id, prepared);
    }

    for (const level of startLevels) {
      const levelResult = await startContainersInLevel(
        sessionId,
        projectId,
        networkName,
        level.containerIds,
        preparedByContainerId,
        deps,
      );
      dockerIds.push(...levelResult.dockerIds);
      clusterContainers.push(...levelResult.clusterContainers);
    }

    if (clusterContainers.length > 0) {
      await proxyManager.registerCluster(sessionId, networkName, clusterContainers);
    }

    const session = await findSessionById(sessionId);
    if (!session || session.status === SESSION_STATUS.DELETING) {
      console.log(`Session ${sessionId} was deleted during initialization, cleaning up`);
      await cleanupOrphanedContainers(sessionId, dockerIds, browserService, cleanupDeps);
      return;
    }
  } catch (error) {
    if (error instanceof CircularDependencyError) {
      console.error(`Circular dependency in project ${projectId}: ${error.cycle.join(" -> ")}`);
    }
    console.error(`Failed to initialize session ${sessionId}:`, error);
    await handleInitializationError(sessionId, projectId, dockerIds, browserService, cleanupDeps);
  }
}

async function cleanupOrphanedContainers(
  sessionId: string,
  dockerIds: string[],
  browserService: BrowserService,
  deps: CleanupSessionDeps,
): Promise<void> {
  await cleanupOrphanedResources(sessionId, dockerIds, browserService, deps);
}

async function handleInitializationError(
  sessionId: string,
  projectId: string,
  dockerIds: string[],
  browserService: BrowserService,
  deps: CleanupSessionDeps,
): Promise<void> {
  // Update container statuses to error before cleanup
  const errorContainers = await updateSessionContainersStatusBySessionId(
    sessionId,
    CONTAINER_STATUS.ERROR,
  );

  for (const container of errorContainers) {
    deps.publisher.publishDelta(
      "sessionContainers",
      { uuid: sessionId },
      { type: "update", container: { id: container.id, status: CONTAINER_STATUS.ERROR } },
    );
  }

  await cleanupOnError(sessionId, projectId, dockerIds, browserService, deps);
}
