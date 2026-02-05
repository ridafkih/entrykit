export interface VolumeManager {
  createVolume(name: string, labels?: Record<string, string>): Promise<void>;
  removeVolume(name: string): Promise<void>;
  volumeExists(name: string): Promise<boolean>;
  cloneVolume(source: string, target: string): Promise<void>;
}
