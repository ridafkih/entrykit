import {
  setWorkspaceContainer,
  clearWorkspaceContainer,
} from "../../../../repositories/container-session.repository";
import { noContentResponse } from "@lab/http-utilities";
import { withParams } from "../../../../shared/route-helpers";
import { parseRequestBody } from "../../../../shared/validation";
import { z } from "zod";

const setWorkspaceSchema = z.object({
  isWorkspace: z.boolean(),
});

const PATCH = withParams<{ projectId: string; containerId: string }>(
  ["projectId", "containerId"],
  async ({ projectId, containerId }, request) => {
    const body = await parseRequestBody(request, setWorkspaceSchema);

    if (body.isWorkspace) {
      await setWorkspaceContainer(projectId, containerId);
    } else {
      await clearWorkspaceContainer(projectId);
    }
    return noContentResponse();
  },
);

export { PATCH };
