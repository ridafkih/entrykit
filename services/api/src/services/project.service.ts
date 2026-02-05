import { findProjectById, findAllProjects } from "../repositories/project.repository";

export async function getProject(projectId: string) {
  return findProjectById(projectId);
}

export async function listProjects() {
  return findAllProjects();
}
