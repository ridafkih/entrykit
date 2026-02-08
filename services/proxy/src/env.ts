import { type } from "arktype";

export const env = type({
  PROXY_PORT: "string.integer.parse = '8080'",
});
