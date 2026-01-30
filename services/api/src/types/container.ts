export type ContainerStatus = "running" | "stopped" | "starting" | "error";

export function isContainerStatus(status: string): status is ContainerStatus {
  return (
    status === "running" || status === "stopped" || status === "starting" || status === "error"
  );
}
