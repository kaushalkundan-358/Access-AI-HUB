import { completeTextTask, TextTaskResult } from "./aiProvider";

export function explainTopic(text: string, topic?: string): Promise<TextTaskResult> {
  const prompt = topic
    ? `Explain the topic "${topic}" using this source as context:\n\n${text}`
    : `Explain the key ideas in this source in accessible language:\n\n${text}`;
  return completeTextTask(
    "explain",
    "Give a clear, structured explanation. Define necessary terms, use short paragraphs, and distinguish source facts from general background.",
    prompt
  );
}
