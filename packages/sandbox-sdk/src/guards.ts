import type { ContainerState } from "./types";
import { VALID_CONTAINER_STATES } from "./constants";
import { SandboxError } from "./error";

export function isContainerState(value: unknown): value is ContainerState {
  return (
    typeof value === "string" &&
    (VALID_CONTAINER_STATES as readonly string[]).includes(value)
  );
}

export function isSandboxError(error: unknown): error is SandboxError {
  return error instanceof SandboxError;
}
