import { db } from "@lab/database/client";
import { containerEnvVars, type ContainerEnvVar } from "@lab/database/schema/container-env-vars";
import { eq } from "drizzle-orm";

export async function findEnvVarsByContainerId(containerId: string): Promise<ContainerEnvVar[]> {
  return db.select().from(containerEnvVars).where(eq(containerEnvVars.containerId, containerId));
}
