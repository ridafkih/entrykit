import {
  setWorkspaceContainer,
  clearWorkspaceContainer,
} from "../../../../repositories/container-session.repository";
import { noContentResponse } from "@lab/http-utilities";
import { ValidationError } from "../../../../shared/errors";
import { withParams } from "../../../../shared/route-helpers";

const PATCH = withParams<{ projectId: string; containerId: string }>(
  ["projectId", "containerId"],
  async ({ projectId, containerId }, request) => {
    const body = await request.json();

    if (typeof body.isWorkspace === "boolean") {
      if (body.isWorkspace) {
        await setWorkspaceContainer(projectId, containerId);
      } else {
        await clearWorkspaceContainer(projectId);
      }
      return noContentResponse();
    }

    throw new ValidationError("Invalid request body");
  },
);

export { PATCH };
