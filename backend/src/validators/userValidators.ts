import { z } from "zod";

export const registerSchema = z.object({
  body: z.object({
    email: z.string().email().max(254).transform((value) => value.toLowerCase()),
    password: z.string().min(10).max(128)
  }),
  params: z.object({}),
  query: z.object({})
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email().max(254).transform((value) => value.toLowerCase()),
    password: z.string().min(1).max(128)
  }),
  params: z.object({}),
  query: z.object({})
});
