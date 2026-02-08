import { logger } from "./logging";
import type { setup } from "./setup";
import type { env } from "./env";

type MainOptions = {
  env: (typeof env)["inferOut"];
  extras: ReturnType<typeof setup>;
};

type MainFunction = (options: MainOptions) => unknown;

export const main = (({ env, extras }) => {
  const { server } = extras;

  server.start(env.BROWSER_API_PORT);

  logger.info({
    event_name: "browser_daemon.startup",
    port: env.BROWSER_API_PORT,
  });

  return () => {
    logger.info({ event_name: "browser_daemon.shutdown" });
    server.shutdown();
  };
}) satisfies MainFunction;
