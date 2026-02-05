import { Sandbox } from "@lab/sandbox-sdk";
import { DockerClient } from "./clients/docker-client";
import { DockerNetworkManager } from "./modules/docker-network-manager";
import { DockerWorkspaceManager } from "./modules/docker-workspace-manager";
import { DockerRuntimeManager } from "./modules/docker-runtime-manager";
import { DockerSessionManager } from "./modules/docker-session-manager";

export interface DockerSandboxFactoryEnv {
  BROWSER_SOCKET_VOLUME?: string;
  BROWSER_CONTAINER_NAME?: string;
  OPENCODE_CONTAINER_NAME?: string;
  PROXY_CONTAINER_NAME?: string;
}

const VOLUMES = {
  WORKSPACES: "lab_session_workspaces",
  OPENCODE_AUTH: "lab_opencode_auth",
  OPENCODE_AUTH_TARGET: "/root/.local/share/opencode",
  BROWSER_SOCKET_DIR: "/tmp/agent-browser-socket",
  WORKSPACES_MOUNT: "/workspaces",
} as const;

export function createSandboxFromEnv(env: DockerSandboxFactoryEnv): Sandbox {
  const dockerClient = new DockerClient();
  const sharedContainerNames = [
    env.BROWSER_CONTAINER_NAME,
    env.OPENCODE_CONTAINER_NAME,
    env.PROXY_CONTAINER_NAME,
  ].filter((value): value is string => !!value);

  return new Sandbox(dockerClient, {
    network: new DockerNetworkManager(dockerClient),
    workspace: new DockerWorkspaceManager(dockerClient, {
      workspacesVolume: VOLUMES.WORKSPACES,
      workspacesMount: VOLUMES.WORKSPACES_MOUNT,
    }),
    runtime: new DockerRuntimeManager(dockerClient, {
      workspacesSource: VOLUMES.WORKSPACES,
      workspacesTarget: VOLUMES.WORKSPACES_MOUNT,
      opencodeAuthSource: VOLUMES.OPENCODE_AUTH,
      opencodeAuthTarget: VOLUMES.OPENCODE_AUTH_TARGET,
      browserSocketSource: env.BROWSER_SOCKET_VOLUME ?? "lab_browser_sockets",
      browserSocketTarget: VOLUMES.BROWSER_SOCKET_DIR,
    }),
    session: new DockerSessionManager(dockerClient, {
      sharedContainerNames,
    }),
  });
}
