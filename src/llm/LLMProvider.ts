// src/llm/LLMProvider.ts
export interface LLMProvider {
  generateResponse(prompt: string, options?: LLMOptions): Promise<string>;
  generateJSON(prompt: string, schema?: any): Promise<any>;
}

export interface LLMOptions {
  temperature?: number;
  maxTokens?: number;
  stopSequences?: string[];
}
