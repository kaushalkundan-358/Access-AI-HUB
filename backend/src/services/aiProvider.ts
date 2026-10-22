import OpenAI from "openai";
import { appConfig } from "../config/appConfig";
import { AppError } from "../middleware/errors";

export interface TextTaskResult {
  task: string;
  text: string;
  model: string;
}

let client: OpenAI | undefined;

function getClient(): OpenAI {
  if (!appConfig.ai.apiKey) {
    throw new AppError(
      503,
      "AI service is not configured. Set AI_API_KEY before using AI endpoints.",
      "AI_NOT_CONFIGURED"
    );
  }

  client ??= new OpenAI({
    apiKey: appConfig.ai.apiKey,
    baseURL: appConfig.ai.baseURL,
    timeout: appConfig.ai.timeoutMs,
    maxRetries: 1
  });
  return client;
}

export async function completeTextTask(
  task: string,
  instruction: string,
  input: string
): Promise<TextTaskResult> {
  const provider = getClient();
  try {
    const result = await provider.chat.completions.create({
      model: appConfig.ai.model,
      temperature: 0.3,
      max_tokens: 3000,
      messages: [
        {
          role: "system",
          content: `${instruction} Return only the result text. Do not claim to provide medical, legal, or other professional advice.`
        },
        { role: "user", content: input }
      ]
    });
    const text = result.choices[0]?.message.content?.trim();
    if (!text) {
      throw new AppError(502, "The AI provider returned an empty response", "AI_EMPTY_RESPONSE");
    }
    return { task, text, model: result.model };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(
      502,
      "The AI provider could not complete the request",
      "AI_PROVIDER_ERROR"
    );
  }
}
