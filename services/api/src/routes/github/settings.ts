import type { Handler } from "../../types/route";
import {
  getGitHubSettings,
  saveGitHubSettings,
  deleteGitHubSettings,
} from "../../repositories/github-settings.repository";
import { parseRequestBody } from "../../shared/validation";
import { noContentResponse } from "@lab/http-utilities";
import { z } from "zod";

const settingsSchema = z.object({
  pat: z.string().optional(),
  username: z.string().optional(),
  authorName: z.string().optional(),
  authorEmail: z.string().optional(),
  attributeAgent: z.boolean().optional(),
});

const GET: Handler = async () => {
  const settings = await getGitHubSettings();
  if (!settings) {
    return Response.json({ configured: false });
  }
  return Response.json({ configured: true, ...settings });
};

const POST: Handler = async (request) => {
  const body = await parseRequestBody(request, settingsSchema);

  const settings = await saveGitHubSettings({
    pat: body.pat,
    username: body.username,
    authorName: body.authorName,
    authorEmail: body.authorEmail,
    attributeAgent: body.attributeAgent,
  });

  return Response.json(settings, { status: 201 });
};

const DELETE: Handler = async () => {
  await deleteGitHubSettings();
  return noContentResponse();
};

export { GET, POST, DELETE };
