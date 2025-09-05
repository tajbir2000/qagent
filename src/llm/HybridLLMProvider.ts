// src/llm/HybridLLMProvider.ts
import { LLMOptions, LLMProvider } from "./LLMProvider";
import { LocalLLMConfig, LocalLLMProvider } from "./LocalLLMProvider";
import { OpenAIConfig, OpenAIProvider } from "./OpenAIProvider";

export interface HybridLLMConfig {
  localConfig: LocalLLMConfig;
  openaiConfig: OpenAIConfig;
  maxLocalPromptLength?: number;
  localTimeout?: number;
}

export class HybridLLMProvider implements LLMProvider {
  private localProvider: LocalLLMProvider;
  private openaiProvider: OpenAIProvider;
  private config: HybridLLMConfig;

  constructor(config: HybridLLMConfig) {
    this.config = {
      maxLocalPromptLength: 1000,
      localTimeout: 30000,
      ...config,
    };

    this.localProvider = new LocalLLMProvider(config.localConfig);
    this.openaiProvider = new OpenAIProvider(config.openaiConfig);
  }

  async generateResponse(
    prompt: string,
    options?: LLMOptions
  ): Promise<string> {
    // Use local LLM for short prompts, OpenAI for long/complex ones
    if (prompt.length <= this.config.maxLocalPromptLength!) {
      try {
        console.log("🤖 Using Local LLM for short prompt...");
        return await this.localProvider.generateResponse(prompt, options);
      } catch (error) {
        console.log("⚠️  Local LLM failed, falling back to OpenAI...");
        return await this.openaiProvider.generateResponse(prompt, options);
      }
    } else {
      console.log("🌐 Using OpenAI for complex prompt...");
      return await this.openaiProvider.generateResponse(prompt, options);
    }
  }

  async generateJSON(prompt: string, schema?: any): Promise<any> {
    // For JSON generation, prefer OpenAI as it's more reliable
    try {
      console.log("🌐 Using OpenAI for JSON generation...");
      return await this.openaiProvider.generateJSON(prompt, schema);
    } catch (error) {
      console.log("⚠️  OpenAI failed, trying local LLM...");
      return await this.localProvider.generateJSON(prompt, schema);
    }
  }

  async isAvailable(): Promise<boolean> {
    const localAvailable = await this.localProvider.isAvailable();
    console.log(`Local LLM available: ${localAvailable}`);
    return localAvailable;
  }
}

