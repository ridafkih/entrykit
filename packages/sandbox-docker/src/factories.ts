import { DockerClient } from "./clients/docker-client";
import { PortAllocator } from "./clients/port-allocator";
import type { DockerClientOptions } from "./types";
import type { PortAllocatorOptions } from "@lab/sandbox-sdk";

export function createDockerClient(options: DockerClientOptions = {}): DockerClient {
  return new DockerClient(options);
}

export function createPortAllocator(options: PortAllocatorOptions = {}): PortAllocator {
  return new PortAllocator(options);
}
