import type { ContainerState } from "@lab/sandbox-sdk";
import { isContainerState } from "@lab/sandbox-sdk";

export function toContainerState(status: string): ContainerState {
  return isContainerState(status) ? status : "dead";
}
