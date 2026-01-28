import type { NetworkCreateOptions, NetworkManager } from "@lab/sandbox-sdk";
import type { DockerClient } from "../clients/docker-client";

export class DockerNetworkManager implements NetworkManager {
  private readonly client: DockerClient;

  constructor(client: DockerClient) {
    this.client = client;
  }

  async createNetwork(
    name: string,
    options?: NetworkCreateOptions
  ): Promise<void> {
    await this.client.createNetwork(name, options);
  }

  async removeNetwork(name: string): Promise<void> {
    await this.client.removeNetwork(name);
  }

  async connectContainer(
    containerName: string,
    networkName: string
  ): Promise<void> {
    const isConnected = await this.client.isConnectedToNetwork(
      containerName,
      networkName
    );
    if (isConnected) {
      return;
    }

    await this.client.connectToNetwork(containerName, networkName);

    const verifyConnected = await this.client.isConnectedToNetwork(
      containerName,
      networkName
    );

    if (!verifyConnected) {
      throw new Error(
        `Failed to verify connection of ${containerName} to network ${networkName}`
      );
    }
  }

  async disconnectContainer(
    containerName: string,
    networkName: string
  ): Promise<void> {
    const isConnected = await this.client.isConnectedToNetwork(
      containerName,
      networkName
    );
    if (!isConnected) {
      return;
    }

    await this.client.disconnectFromNetwork(containerName, networkName);
  }

  isContainerConnected(
    containerName: string,
    networkName: string
  ): Promise<boolean> {
    return this.client.isConnectedToNetwork(containerName, networkName);
  }
}
