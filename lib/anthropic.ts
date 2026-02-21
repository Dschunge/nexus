import Anthropic from "@anthropic-ai/sdk";

// Always instantiate fresh — never cache globally so env var updates are picked up.
export function getAnthropicClient(): Anthropic {
  return new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });
}
