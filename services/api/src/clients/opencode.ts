import { createOpencodeClient } from "@opencode-ai/sdk/v2/client";
import { config } from "../config/environment";

export const opencode = createOpencodeClient({ baseUrl: config.opencodeUrl });
