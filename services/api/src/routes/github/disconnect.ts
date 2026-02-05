import type { Handler, NoRouteContext } from "../../types/route";
import { clearGitHubOAuthToken } from "../../repositories/github-settings.repository";

const POST: Handler<NoRouteContext> = async () => {
  await clearGitHubOAuthToken();
  return Response.json({ success: true });
};

export { POST };
