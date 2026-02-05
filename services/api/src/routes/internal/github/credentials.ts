import type { Handler } from "../../../types/route";
import { getGitHubCredentials } from "../../../repositories/github-settings.repository";
import { NotFoundError } from "../../../shared/errors";

const GET: Handler = async () => {
  const credentials = await getGitHubCredentials();

  if (!credentials?.token) {
    throw new NotFoundError("GitHub credentials");
  }

  return Response.json({
    token: credentials.token,
    username: credentials.username,
  });
};

export { GET };
