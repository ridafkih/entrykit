const port = process.env.MCP_PORT;
if (!port) {
  throw new Error("MCP_PORT environment variable is required");
}

const apiBaseUrl = process.env.API_BASE_URL;
if (!apiBaseUrl) {
  throw new Error("API_BASE_URL environment variable is required");
}

export const config = {
  port: parseInt(port, 10),
  apiBaseUrl,
};
