// Factory functions (recommended)
export { createDockerClient, createPortAllocator } from "./factories";

// Types
export type {
  DockerClientOptions,
  DockerContainerEvent,
  DockerContainerEventAction,
} from "./types";
export {
  DockerClientOptionsSchema,
  DockerContainerEventActionSchema,
} from "./types";

// Classes (backward compatibility)
export { DockerClient } from "./clients/docker-client";
export { PortAllocator } from "./clients/port-allocator";

// Constants
export {
  DEFAULT_SOCKET_PATH,
  DEFAULT_DOCKER_PORT,
  DEFAULT_DOCKER_PROTOCOL,
  ALPINE_IMAGE,
  VOLUME_CLONE_COMMAND,
} from "./constants";

// Utils
export {
  hasStatusCode,
  isNotFoundError,
  isNotRunningError,
  wrapDockerError,
  toContainerState,
} from "./utils";
