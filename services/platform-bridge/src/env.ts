import { type } from "arktype";

export const env = type({
  API_URL: "string",
  API_WS_URL: "string",
  "IMESSAGE_ENABLED?": "string",
  "IMESSAGE_WATCHED_CONTACTS?": "string",
  "IMESSAGE_CONTEXT_MESSAGES?": "string",
  "STALE_SESSION_THRESHOLD_MS?": "string",
});
