import type { Handler } from "../../types/route";
import { clearGitHubOAuthToken } from "../../repositories/github-settings.repository";

const POST: Handler = async () => {
  await clearGitHubOAuthToken();
  return Response.json({ success: true });
};

export { POST };
