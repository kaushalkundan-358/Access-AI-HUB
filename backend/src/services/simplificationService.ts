import { completeTextTask, TextTaskResult } from "./aiProvider";

export function simplifyText(text: string): Promise<TextTaskResult> {
  return completeTextTask(
    "simplify",
    "Rewrite the text in plain, clear language for a general audience. Preserve important facts, qualifications, and meaning. Use short sentences and explain uncommon terms.",
    text
  );
}
