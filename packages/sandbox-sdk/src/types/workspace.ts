export interface WorkspaceManagerConfig {
  workspacesVolume: string;
  workspacesMount: string;
}

export interface WorkspaceManager {
  startWorkspace(workspacePath: string, image: string): Promise<string>;
}
