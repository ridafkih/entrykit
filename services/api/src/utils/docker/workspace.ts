import { docker } from "../../clients/docker";
import { VOLUMES } from "../../config/constants";
import { formatContainerWorkspacePath } from "../../types/session";

export async function initializeContainerWorkspace(
  sessionId: string,
  containerId: string,
  image: string,
): Promise<string> {
  const containerWorkspace = formatContainerWorkspacePath(sessionId, containerId);

  const imageExists = await docker.imageExists(image);
  if (!imageExists) {
    await docker.pullImage(image);
  }

  const { workdir: imageWorkdir } = await docker.getImageConfig(image);

  const initCommand =
    imageWorkdir && imageWorkdir !== "/"
      ? `mkdir -p ${containerWorkspace} && cp -r ${imageWorkdir}/. ${containerWorkspace}/`
      : `mkdir -p ${containerWorkspace}`;

  const initId = await docker.createContainer({
    image,
    command: ["sh", "-c", initCommand],
    volumes: [{ source: VOLUMES.WORKSPACES, target: "/workspaces" }],
  });

  await docker.startContainer(initId);
  await docker.waitContainer(initId);
  await docker.removeContainer(initId);

  return containerWorkspace;
}
