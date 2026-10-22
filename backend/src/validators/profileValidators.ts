import { z } from "zod";

const profileFields = {
  name: z.string().trim().min(1).max(80),
  fontSize: z.enum(["small", "medium", "large", "extra-large"]),
  contrastMode: z.enum(["normal", "high", "dark"]),
  preferredLanguage: z.enum(["en", "hi"]),
  readingPreferences: z.record(z.unknown()).refine(
    (value) => JSON.stringify(value).length <= 4000,
    "Reading preferences must be at most 4000 characters"
  )
};

export const createProfileSchema = z.object({
  body: z.object(profileFields).partial({
    name: true,
    fontSize: true,
    contrastMode: true,
    preferredLanguage: true,
    readingPreferences: true
  }),
  params: z.object({}),
  query: z.object({})
});

export const updateProfileSchema = z.object({
  body: z.object(profileFields).partial().refine((value) => Object.keys(value).length > 0),
  params: z.object({ id: z.string().cuid() }),
  query: z.object({})
});

export const profileIdSchema = z.object({
  body: z.object({}),
  params: z.object({ id: z.string().cuid() }),
  query: z.object({})
});
