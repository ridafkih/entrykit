export const config = {
  apiPort: parseInt(process.env.BROWSER_API_PORT ?? "80", 10),
  baseStreamPort: parseInt(process.env.AGENT_BROWSER_STREAM_PORT ?? "9224", 10),
  profileDir: process.env.AGENT_BROWSER_PROFILE_DIR,
};
