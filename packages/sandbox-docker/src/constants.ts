export const DEFAULT_SOCKET_PATH = "/var/run/docker.sock";
export const DEFAULT_DOCKER_PORT = 2375;
export const DEFAULT_DOCKER_PROTOCOL = "http" as const;
export const ALPINE_IMAGE = "alpine:latest";
export const VOLUME_CLONE_COMMAND = ["sh", "-c", "cp -a /source/. /target/"];
