import type { RouteHandler } from "../../utils/handlers/route-handler";
import { clearGitHubOAuthToken } from "../../utils/repositories/github-settings.repository";

const POST: RouteHandler = async () => {
  await clearGitHubOAuthToken();
  return Response.json({ success: true });
};

export { POST };
