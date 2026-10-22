import { explainTopic } from "./explanationService";
import { simplifyText } from "./simplificationService";
import { summarizeText } from "./summarizationService";
import { translateText } from "./translationService";

export const aiService = {
  simplify: simplifyText,
  summarize: summarizeText,
  explain: explainTopic,
  translate: translateText
};
