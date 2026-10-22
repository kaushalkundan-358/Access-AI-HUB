import { completeTextTask, TextTaskResult } from "./aiProvider";

export function summarizeText(text: string): Promise<TextTaskResult> {
  return completeTextTask(
    "summarize",
    "Summarize the source accurately in concise, accessible language. Keep essential points and avoid introducing facts not in the source.",
    text
  );
}
