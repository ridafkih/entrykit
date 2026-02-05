import pino from "pino";
import { widelogger } from "@lab/widelogger";

const environment = process.env.NODE_ENV ?? "development";
const isDevelopment = environment !== "production";

const serviceVersion = process.env.API_VERSION ?? process.env.npm_package_version;
const commitHash =
  process.env.COMMIT_SHA ?? process.env.GIT_COMMIT_SHA ?? process.env.VERCEL_GIT_COMMIT_SHA;
const instanceId = process.env.INSTANCE_ID ?? process.env.HOSTNAME ?? String(process.pid);

const transport = isDevelopment
  ? pino.transport({
      target: "pino-pretty",
      options: {
        colorize: true,
        singleLine: true,
        translateTime: "SYS:standard",
        ignore: "pid,hostname",
      },
    })
  : undefined;

export const logger = pino(
  {
    level: process.env.LOG_LEVEL ?? "info",
    timestamp: pino.stdTimeFunctions.isoTime,
    base: {
      service: "api",
      service_version: serviceVersion,
      commit_hash: commitHash ?? "unknown",
      instance_id: instanceId,
      environment,
    },
  },
  transport,
);

interface ErrorFields {
  error_name: string;
  error_message: string;
  error_stack?: string;
}

export function getErrorFields(error: unknown): ErrorFields {
  if (error instanceof Error) {
    return {
      error_name: error.name,
      error_message: error.message,
      error_stack: error.stack,
    };
  }

  if (typeof error === "string") {
    return {
      error_name: "Error",
      error_message: error,
    };
  }

  return {
    error_name: "UnknownError",
    error_message: "Unknown error",
  };
}

const { widelog } = widelogger({
  transport: (event) => {
    if (Object.keys(event).length === 0) return;

    const statusCode = typeof event.status_code === "number" ? event.status_code : undefined;
    const isError = statusCode !== undefined ? statusCode >= 500 : event.outcome === "error";
    const payload = { event_name: "api.request", ...event };

    if (isError) {
      logger.error(payload);
      return;
    }

    logger.info(payload);
  },
});

export { widelog };

export function setWideErrorFields(error: unknown, prefix = "error"): void {
  const fields = getErrorFields(error);

  for (const [field, value] of Object.entries(fields)) {
    if (typeof value === "undefined") continue;
    widelog.set(`${prefix}.${field}` as `${string}`, value);
  }
}
