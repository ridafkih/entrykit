import { createContainerWithDetails } from "../../../../repositories/container-definition.repository";
import {
  findContainersWithDependencies,
  validateDependencies,
} from "../../../../repositories/container-dependency.repository";
import { ValidationError } from "../../../../shared/errors";
import { withParams } from "../../../../shared/route-helpers";

interface DependencyInput {
  containerId: string;
  condition?: string;
}

type DependsOnInput = (DependencyInput | string)[];

function normalizeDependencies(
  dependsOn: DependsOnInput | undefined,
): { dependsOnContainerId: string; condition?: string }[] {
  if (!dependsOn || !Array.isArray(dependsOn)) {
    return [];
  }

  return dependsOn.map((dependency) => {
    if (typeof dependency === "string") {
      return { dependsOnContainerId: dependency };
    }
    return {
      dependsOnContainerId: dependency.containerId,
      condition: dependency.condition,
    };
  });
}

function extractDependsOnIds(
  dependencies: { dependsOnContainerId: string; condition?: string }[],
): string[] {
  return dependencies.map((dependency) => dependency.dependsOnContainerId);
}

const GET = withParams<{ projectId: string }>(["projectId"], async ({ projectId }, _request) => {
  const containers = await findContainersWithDependencies(projectId);
  return Response.json(containers);
});

const POST = withParams<{ projectId: string }>(["projectId"], async ({ projectId }, request) => {
  const body = await request.json();

  const normalizedDependencies = normalizeDependencies(body.dependsOn);

  // Validate dependencies before the transaction (read-only)
  if (normalizedDependencies.length > 0) {
    const dependsOnIds = extractDependsOnIds(normalizedDependencies);
    // We need a temporary ID for self-dependency check - use empty string since container doesn't exist yet
    const validation = await validateDependencies(projectId, "", dependsOnIds);
    if (!validation.valid) {
      throw new ValidationError(validation.errors.join(", "));
    }
  }

  const ports =
    body.ports && Array.isArray(body.ports) && body.ports.length > 0 ? body.ports : undefined;

  const container = await createContainerWithDetails({
    projectId,
    image: body.image,
    hostname: body.hostname,
    ports,
    dependencies: normalizedDependencies.length > 0 ? normalizedDependencies : undefined,
  });

  return Response.json(
    {
      ...container,
      dependencies: normalizedDependencies.map((dependency) => ({
        dependsOnContainerId: dependency.dependsOnContainerId,
        condition: dependency.condition || "service_started",
      })),
    },
    { status: 201 },
  );
});

export { GET, POST };
