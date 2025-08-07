// src/llm/OpenAIProvider.ts
import OpenAI from "openai";
import { LLMOptions, LLMProvider } from "./LLMProvider";

export interface OpenAIConfig {
  apiKey: string;
  model: string;
  baseURL?: string;
}

export class OpenAIProvider implements LLMProvider {
  private client: OpenAI;
  private model: string;

  constructor(config: OpenAIConfig) {
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseURL,
    });
    this.model = config.model;
  }

  async generateResponse(
    prompt: string,
    options?: LLMOptions
  ): Promise<string> {
    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [{ role: "user", content: prompt }],
        temperature: options?.temperature || 0.1,
        max_tokens: options?.maxTokens || 4000,
        stop: options?.stopSequences,
      });

      return response.choices[0]?.message?.content || "";
    } catch (error) {
      console.error("OpenAI API error:", error);
      throw error;
    }
  }

  async generateJSON(prompt: string, schema?: any): Promise<any> {
    const jsonPrompt = `${prompt}\n\nPlease respond with valid JSON only. No additional text or formatting.`;

    try {
      const response = await this.generateResponse(jsonPrompt);
      return JSON.parse(response.trim());
    } catch (error) {
      console.error("JSON parsing error:", error);
      throw new Error("Failed to generate valid JSON response");
    }
  }
}
