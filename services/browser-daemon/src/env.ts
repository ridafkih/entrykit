import { type } from "arktype";

export const env = type({
  BROWSER_API_PORT: "string.integer.parse = '80'",
  AGENT_BROWSER_STREAM_PORT: "string.integer.parse = '9224'",
  AGENT_BROWSER_PROFILE_DIR: "string?",
});
