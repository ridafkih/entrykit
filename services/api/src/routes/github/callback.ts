import type { RouteHandler } from "../../utils/handlers/route-handler";
import { config } from "../../config/environment";
import { validateState } from "./auth";
import { saveGitHubOAuthToken } from "../../utils/repositories/github-settings.repository";

interface GitHubTokenResponse {
  access_token?: string;
  scope?: string;
  token_type?: string;
  error?: string;
  error_description?: string;
}

interface GitHubUserResponse {
  login: string;
  name?: string;
  email?: string;
}

const GET: RouteHandler = async (request) => {
  if (!config.frontendUrl) {
    return Response.json({ error: "FRONTEND_URL is not configured" }, { status: 500 });
  }

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  const errorDescription = url.searchParams.get("error_description");

  const frontendUrl = config.frontendUrl;

  if (error) {
    const params = new URLSearchParams({
      tab: "github",
      error: errorDescription || error,
    });
    return Response.redirect(`${frontendUrl}/settings?${params.toString()}`, 302);
  }

  if (!code || !state) {
    const params = new URLSearchParams({
      tab: "github",
      error: "Missing code or state parameter",
    });
    return Response.redirect(`${frontendUrl}/settings?${params.toString()}`, 302);
  }

  if (!validateState(state)) {
    const params = new URLSearchParams({
      tab: "github",
      error: "Invalid or expired state parameter",
    });
    return Response.redirect(`${frontendUrl}/settings?${params.toString()}`, 302);
  }

  if (!config.githubClientId || !config.githubClientSecret) {
    const params = new URLSearchParams({
      tab: "github",
      error: "GitHub OAuth is not configured",
    });
    return Response.redirect(`${frontendUrl}/settings?${params.toString()}`, 302);
  }

  try {
    const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: config.githubClientId,
        client_secret: config.githubClientSecret,
        code,
      }),
    });

    const tokenData: GitHubTokenResponse = await tokenResponse.json();

    if (tokenData.error || !tokenData.access_token) {
      const params = new URLSearchParams({
        tab: "github",
        error: tokenData.error_description || tokenData.error || "Failed to get access token",
      });
      return Response.redirect(`${frontendUrl}/settings?${params.toString()}`, 302);
    }

    const userResponse = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });

    if (!userResponse.ok) {
      const params = new URLSearchParams({
        tab: "github",
        error: "Failed to fetch GitHub user info",
      });
      return Response.redirect(`${frontendUrl}/settings?${params.toString()}`, 302);
    }

    const userData: GitHubUserResponse = await userResponse.json();

    await saveGitHubOAuthToken({
      accessToken: tokenData.access_token,
      scopes: tokenData.scope || "",
      username: userData.login,
    });

    const params = new URLSearchParams({
      tab: "github",
      connected: "true",
    });
    return Response.redirect(`${frontendUrl}/settings?${params.toString()}`, 302);
  } catch (err) {
    console.error("GitHub OAuth callback error:", err);
    const params = new URLSearchParams({
      tab: "github",
      error: "An unexpected error occurred",
    });
    return Response.redirect(`${frontendUrl}/settings?${params.toString()}`, 302);
  }
};

export { GET };
