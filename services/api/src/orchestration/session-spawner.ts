import type { Session } from "@lab/database/schema/sessions";
import { createSession } from "../repositories/session.repository";
import { findContainersByProjectId } from "../repositories/container-definition.repository";
import {
  createSessionContainer,
  getSessionContainersWithDetails,
} from "../repositories/container-session.repository";
import type { BrowserServiceManager } from "../managers/browser-service.manager";
import type { SessionLifecycleManager } from "../managers/session-lifecycle.manager";
import type { PoolManager } from "../services/pool-manager";
import { generateSessionTitle } from "../generators/title-generator";
import type { Publisher } from "../types/dependencies";
import { CONTAINER_STATUS, isContainerStatus, type ContainerStatus } from "../types/container";

export interface SpawnSessionOptions {
  projectId: string;
  taskSummary: string;
  browserService: BrowserServiceManager;
  sessionLifecycle: SessionLifecycleManager;
  poolManager: PoolManager;
  publisher: Publisher;
}

export interface SpawnSessionResult {
  session: Session;
  containers: Array<{
    id: string;
    name: string;
    status: ContainerStatus;
    urls: Array<{ port: number; url: string }>;
  }>;
}

type ContainerRow = SpawnSessionResult["containers"][number];

function validateContainerStatus(status: string): ContainerStatus {
  if (isContainerStatus(status)) {
    return status;
  }
  throw new Error(`Invalid container status: ${status}`);
}

function extractContainerDisplayName(container: {
  hostname: string | null;
  image: string;
}): string {
  if (container.hostname) {
    return container.hostname;
  }
  const imageName = container.image.split("/").pop()?.split(":")[0];
  if (!imageName) {
    throw new Error(`Unable to extract display name from container image: ${container.image}`);
  }
  return imageName;
}

function publishSessionCreated(
  session: Session,
  containers: ContainerRow[],
  publisher: Publisher,
): void {
  publisher.publishDelta("sessions", {
    type: "add",
    session: { id: session.id, projectId: session.projectId, title: session.title },
  });
  publisher.publishSnapshot("sessionContainers", { uuid: session.id }, containers);
}

function scheduleBackgroundWork(
  sessionId: string,
  projectId: string,
  sessionLifecycle: SessionLifecycleManager,
  poolManager: PoolManager,
): void {
  sessionLifecycle.initializeSession(sessionId, projectId).catch((error) => {
    console.error(`[Orchestration] Background initialization failed for ${sessionId}:`, error);
  });
  poolManager.reconcilePool(projectId).catch((error) => {
    console.error(`[Orchestration] Pool reconciliation failed for project ${projectId}:`, error);
  });
}

async function claimAndPreparePooledSession(
  projectId: string,
  poolManager: PoolManager,
  publisher: Publisher,
): Promise<SpawnSessionResult | null> {
  const pooledSession = await poolManager.claimPooledSession(projectId);
  if (!pooledSession) {
    return null;
  }

  const existingContainers = await getSessionContainersWithDetails(pooledSession.id);
  const containers: ContainerRow[] = existingContainers.map((container) => ({
    id: container.id,
    name: extractContainerDisplayName(container),
    status: validateContainerStatus(container.status),
    urls: [],
  }));

  publishSessionCreated(pooledSession, containers, publisher);
  return { session: pooledSession, containers };
}

async function createSessionWithContainers(
  projectId: string,
  publisher: Publisher,
): Promise<SpawnSessionResult> {
  const containerDefinitions = await findContainersByProjectId(projectId);
  if (containerDefinitions.length === 0) {
    throw new Error("Project has no container definitions");
  }

  const session = await createSession(projectId);
  const containers: ContainerRow[] = [];

  for (const definition of containerDefinitions) {
    const sessionContainer = await createSessionContainer({
      sessionId: session.id,
      containerId: definition.id,
      dockerId: "",
      status: CONTAINER_STATUS.STARTING,
    });

    containers.push({
      id: sessionContainer.id,
      name: extractContainerDisplayName(definition),
      status: CONTAINER_STATUS.STARTING,
      urls: [],
    });
  }

  publishSessionCreated(session, containers, publisher);
  return { session, containers };
}

export async function spawnSession(options: SpawnSessionOptions): Promise<SpawnSessionResult> {
  const { projectId, taskSummary, sessionLifecycle, poolManager, publisher } = options;

  const pooledResult = await claimAndPreparePooledSession(projectId, poolManager, publisher);
  if (pooledResult) {
    scheduleBackgroundTitleGeneration(pooledResult.session.id, taskSummary, publisher);
    return pooledResult;
  }

  const result = await createSessionWithContainers(projectId, publisher);
  scheduleBackgroundWork(result.session.id, projectId, sessionLifecycle, poolManager);
  scheduleBackgroundTitleGeneration(result.session.id, taskSummary, publisher);
  return result;
}

function scheduleBackgroundTitleGeneration(
  sessionId: string,
  userMessage: string,
  publisher: Publisher,
): void {
  if (!userMessage?.trim()) {
    return;
  }

  generateSessionTitle({
    sessionId,
    userMessage,
    fallbackTitle: userMessage.slice(0, 50).trim(),
    publisher,
  }).catch((error) => {
    console.error(`[SessionSpawner] Title generation failed for ${sessionId}:`, error);
  });
}
