import { z } from "zod";

export const documentIdSchema = z.object({
  body: z.object({}),
  params: z.object({ id: z.string().cuid() }),
  query: z.object({})
});
