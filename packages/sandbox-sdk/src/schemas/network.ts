import { z } from "zod";

export const NetworkCreateOptionsSchema = z.object({
  driver: z.string().optional(),
  labels: z.record(z.string(), z.string()).optional(),
});
