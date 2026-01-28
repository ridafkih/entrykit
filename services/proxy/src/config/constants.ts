export const TIMING = {
  IDLE_TIMEOUT_SECONDS: 255,
  RETRY_DELAY_MS: 100,
} as const;

export const CORS = {
  ALLOW_ORIGIN: "*",
  ALLOW_METHODS: "GET, POST, PUT, DELETE, PATCH, OPTIONS",
  ALLOW_HEADERS: "*",
  MAX_AGE: "86400",
} as const;
