import { z } from "zod";

export const PortAllocatorOptionsSchema = z.object({
  minPort: z.number().int().positive().optional(),
  maxPort: z.number().int().positive().optional(),
});
