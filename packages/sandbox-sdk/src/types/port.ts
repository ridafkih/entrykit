export interface PortAllocator {
  allocate(count?: number): Promise<number[]>;
  release(port: number): void;
  releaseAll(ports: number[]): void;
  isAllocated(port: number): boolean;
}

export interface PortAllocatorOptions {
  minPort?: number;
  maxPort?: number;
}
