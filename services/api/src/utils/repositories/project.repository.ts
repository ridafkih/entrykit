import { db } from "@lab/database/client";
import { projects } from "@lab/database/schema/projects";
import { eq } from "drizzle-orm";

export async function findAllProjects() {
  return db.select().from(projects);
}

export async function findProjectById(projectId: string) {
  const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
  return project ?? null;
}

export async function findProjectSummaries() {
  return db.select({ id: projects.id, name: projects.name }).from(projects);
}

export async function createProject(data: { name: string; systemPrompt?: string }) {
  const [project] = await db
    .insert(projects)
    .values({ name: data.name, systemPrompt: data.systemPrompt })
    .returning();
  return project;
}

export async function deleteProject(projectId: string) {
  await db.delete(projects).where(eq(projects.id, projectId));
}

export async function getProjectSystemPrompt(projectId: string) {
  const [project] = await db
    .select({ systemPrompt: projects.systemPrompt })
    .from(projects)
    .where(eq(projects.id, projectId));
  return project?.systemPrompt ?? null;
}
