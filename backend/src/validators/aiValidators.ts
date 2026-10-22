import { z } from "zod";
import { MAX_TEXT_CHARACTERS, SUPPORTED_LANGUAGES } from "../constants/api";

const textInput = z.string().trim().min(1).max(MAX_TEXT_CHARACTERS);

export const textTaskSchema = z.object({
  body: z.object({ text: textInput }),
  params: z.object({}),
  query: z.object({})
});

export const explainSchema = z.object({
  body: z.object({
    text: textInput,
    topic: z.string().trim().min(1).max(200).optional()
  }),
  params: z.object({}),
  query: z.object({})
});

export const translateSchema = z.object({
  body: z.object({
    text: textInput,
    targetLanguage: z.enum(SUPPORTED_LANGUAGES)
  }),
  params: z.object({}),
  query: z.object({})
});
