import { completeTextTask, TextTaskResult } from "./aiProvider";

const languageNames = { en: "English", hi: "Hindi" } as const;

export function translateText(text: string, targetLanguage: "en" | "hi"): Promise<TextTaskResult> {
  return completeTextTask(
    "translate",
    `Translate the supplied content into ${languageNames[targetLanguage]}. Preserve meaning, tone, names, numbers, and formatting. Return only the translation.`,
    text
  );
}
