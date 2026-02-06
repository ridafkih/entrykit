import { formatWorkspacePath, formatContainerWorkspacePath } from "./naming";
import { getWorkspaceContainerIdByProjectId } from "../repositories/container-definition.repository";
import { getWorkspaceContainerId } from "../repositories/container-session.repository";
import { findSessionById, getSessionWorkspaceDirectory } from "../repositories/session.repository";

export async function computeWorkspaceDirectory(sessionId: string): Promise<string> {
  const workspaceContainerId = await getWorkspaceContainerId(sessionId);

  if (workspaceContainerId) {
    return formatContainerWorkspacePath(sessionId, workspaceContainerId);
  }

  const session = await findSessionById(sessionId);

  if (!session) return formatWorkspacePath(sessionId);
  const projectContainerId = await getWorkspaceContainerIdByProjectId(session.projectId);

  if (!projectContainerId) return formatWorkspacePath(sessionId);
  return formatContainerWorkspacePath(sessionId, projectContainerId);
}

export async function resolveWorkspacePathBySession(sessionId: string): Promise<string> {
  const storedDirectory = await getSessionWorkspaceDirectory(sessionId);
  const computedDirectory = await computeWorkspaceDirectory(sessionId);

  if (storedDirectory) {
    return storedDirectory;
  }
  return computedDirectory;
}

export async function resolveWorkspacePathByProject(
  sessionId: string,
  projectId: string,
): Promise<string> {
  const workspaceContainerId = await getWorkspaceContainerIdByProjectId(projectId);
  if (workspaceContainerId) {
    return formatContainerWorkspacePath(sessionId, workspaceContainerId);
  }
  return formatWorkspacePath(sessionId);
}

export async function resolveWorkspacePath(sessionId: string): Promise<string> {
  const session = await findSessionById(sessionId);
  if (session) {
    return resolveWorkspacePathByProject(sessionId, session.projectId);
  }
  return formatWorkspacePath(sessionId);
}
