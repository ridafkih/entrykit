import { db } from "@lab/database/client";
import { projects } from "@lab/database/schema/projects";
import { containers } from "@lab/database/schema/containers";
import { containerPorts } from "@lab/database/schema/container-ports";
import { containerDependencies } from "@lab/database/schema/container-dependencies";
import { eq, inArray } from "drizzle-orm";
import { groupBy } from "../shared/collection-utils";
import { orThrow } from "../shared/errors";

export async function findAllProjects() {
  return db.select().from(projects);
}

type ContainerWithDetails = {
  id: string;
  image: string;
  hostname: string | null;
  isWorkspace: boolean;
  ports: number[];
  dependencies: { dependsOnContainerId: string; condition: string }[];
};

export async function findAllProjectsWithContainers() {
  // Fetch projects and containers in parallel
  const [allProjects, allContainers] = await Promise.all([
    db.select().from(projects),
    db
      .select({
        id: containers.id,
        projectId: containers.projectId,
        image: containers.image,
        hostname: containers.hostname,
        isWorkspace: containers.isWorkspace,
      })
      .from(containers),
  ]);

  const containerIds = allContainers.map((container) => container.id);

  // Fetch ports and dependencies in parallel
  const [allPorts, allDependencies] = await Promise.all([
    containerIds.length > 0
      ? db
          .select({
            containerId: containerPorts.containerId,
            port: containerPorts.port,
          })
          .from(containerPorts)
          .where(inArray(containerPorts.containerId, containerIds))
      : Promise.resolve([]),
    containerIds.length > 0
      ? db
          .select({
            containerId: containerDependencies.containerId,
            dependsOnContainerId: containerDependencies.dependsOnContainerId,
            condition: containerDependencies.condition,
          })
          .from(containerDependencies)
          .where(inArray(containerDependencies.containerId, containerIds))
      : Promise.resolve([]),
  ]);

  const portsByContainerId = groupBy(allPorts, ({ containerId }) => containerId);
  const depsByContainerId = groupBy(allDependencies, ({ containerId }) => containerId);

  const containersByProjectId = groupBy(
    allContainers.map(
      (container): ContainerWithDetails => ({
        id: container.id,
        image: container.image,
        hostname: container.hostname,
        isWorkspace: container.isWorkspace,
        ports: (portsByContainerId.get(container.id) ?? []).map(({ port }) => port),
        dependencies: (depsByContainerId.get(container.id) ?? []).map((dep) => ({
          dependsOnContainerId: dep.dependsOnContainerId,
          condition: dep.condition,
        })),
      }),
    ),
    (_detail, index) => allContainers[index]!.projectId,
  );

  return allProjects.map((project) => ({
    ...project,
    containers: containersByProjectId.get(project.id) ?? [],
  }));
}

export async function findProjectById(projectId: string) {
  const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
  return project ?? null;
}

export async function findProjectByIdOrThrow(projectId: string) {
  return orThrow(await findProjectById(projectId), "Project", projectId);
}

export async function findProjectSummaries() {
  return db.select({ id: projects.id, name: projects.name }).from(projects);
}

export async function createProject(data: {
  name: string;
  description?: string;
  systemPrompt?: string;
}) {
  const [project] = await db
    .insert(projects)
    .values({
      name: data.name,
      description: data.description,
      systemPrompt: data.systemPrompt,
    })
    .returning();
  if (!project) throw new Error("Failed to create project");
  return project;
}

export async function deleteProject(projectId: string) {
  await db.delete(projects).where(eq(projects.id, projectId));
}

export async function updateProject(
  projectId: string,
  data: { description?: string; systemPrompt?: string },
) {
  const [project] = await db
    .update(projects)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(projects.id, projectId))
    .returning();
  return project ?? null;
}

export async function getProjectSystemPrompt(projectId: string) {
  const [project] = await db
    .select({ systemPrompt: projects.systemPrompt })
    .from(projects)
    .where(eq(projects.id, projectId));
  return project?.systemPrompt ?? null;
}
