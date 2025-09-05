// src/llm/LocalLLMProvider.ts
import { LLMOptions, LLMProvider } from "./LLMProvider";

export interface LocalLLMConfig {
  modelName: string;
  baseURL?: string;
  temperature?: number;
  contextSize?: number;
}

interface OllamaRequest {
  model: string;
  prompt: string;
  temperature?: number;
  top_p?: number;
  top_k?: number;
  repeat_penalty?: number;
  stop?: string[];
  stream?: boolean;
}

interface OllamaResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
  context?: number[];
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

export class LocalLLMProvider implements LLMProvider {
  private config: LocalLLMConfig;
  private baseURL: string;

  constructor(config: LocalLLMConfig) {
    this.config = {
      ...config,
      baseURL: config.baseURL || "http://localhost:11434",
      temperature: config.temperature || 0.1,
      contextSize: config.contextSize || 4096,
      modelName: config.modelName || "tinyllama",
    };
    this.baseURL = this.config.baseURL!;
  }

  async generateResponse(
    prompt: string,
    options?: LLMOptions
  ): Promise<string> {
    const maxRetries = 2;
    const timeout = 120000; // 2 minutes timeout for model loading

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🤖 LLM Request (attempt ${attempt}/${maxRetries})...`);

        // For complex prompts, simplify them for local LLM
        let actualPrompt = prompt;
        if (prompt.length > 500) {
          console.log("📝 Simplifying long prompt for local LLM...");
          actualPrompt = this.simplifyPrompt(prompt);
        }

        const requestBody: OllamaRequest = {
          model: this.config.modelName,
          prompt: actualPrompt,
          temperature: options?.temperature || this.config.temperature,
          stop: options?.stopSequences,
          stream: false,
        };

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        console.log(`⏱️  Sending request with ${timeout / 1000}s timeout...`);

        const response = await fetch(`${this.baseURL}/api/generate`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(
            `Ollama API error: ${response.status} ${response.statusText}`
          );
        }

        const data: OllamaResponse = await response.json();
        console.log(`✅ LLM Response received (${data.response.length} chars)`);
        return data.response;
      } catch (error: any) {
        console.error(`❌ LLM attempt ${attempt} failed:`, error.message);

        if (attempt === maxRetries) {
          console.error("Local LLM error: All retries exhausted");
          throw error;
        }

        // Wait before retrying (exponential backoff)
        const waitTime = Math.min(5000 * Math.pow(2, attempt - 1), 15000);
        console.log(`⏳ Retrying in ${waitTime}ms...`);
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      }
    }

    throw new Error("Unexpected error in generateResponse");
  }

  private simplifyPrompt(prompt: string): string {
    // Extract key information from complex prompts
    const lines = prompt.split("\n");
    const simplified = lines
      .filter(
        (line) =>
          line.includes("Generate") ||
          line.includes("Create") ||
          line.includes("Test") ||
          line.includes("JSON") ||
          line.length < 100
      )
      .slice(0, 10) // Take first 10 relevant lines
      .join("\n");

    return simplified + "\n\nPlease provide a concise response.";
  }

  async generateJSON(prompt: string, schema?: any): Promise<any> {
    // Use a more explicit prompt for TinyLlama
    const jsonPrompt = `${prompt}\n\nCRITICAL: You must respond with ONLY valid JSON. No text before or after. Start with { and end with }. Example format: {"key": "value"}`;

    try {
      const response = await this.generateResponse(jsonPrompt);
      console.log("🔍 Raw LLM response:", response.substring(0, 200) + "...");

      // Try multiple strategies to extract JSON
      let jsonString = response.trim();

      // Strategy 1: Look for JSON object
      const jsonMatch = jsonString.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[0]);
        } catch (e) {
          console.log("Strategy 1 failed, trying strategy 2...");
        }
      }

      // Strategy 2: Remove common prefixes/suffixes
      jsonString = jsonString.replace(/^[^{]*/, "").replace(/[^}]*$/, "");
      if (jsonString.startsWith("{") && jsonString.endsWith("}")) {
        try {
          return JSON.parse(jsonString);
        } catch (e) {
          console.log("Strategy 2 failed, trying strategy 3...");
        }
      }

      // Strategy 3: Try to fix common JSON issues
      jsonString = response.trim();
      jsonString = jsonString.replace(/```json\s*/g, "").replace(/```\s*/g, "");
      jsonString = jsonString.replace(/^[^{]*/, "").replace(/[^}]*$/, "");

      try {
        return JSON.parse(jsonString);
      } catch (e) {
        console.log("Strategy 3 failed, using fallback...");
      }

      // Strategy 4: Generate fallback JSON based on prompt
      console.log("🔄 Using fallback JSON generation...");
      return this.generateFallbackJSON(prompt);
    } catch (error) {
      console.error("JSON parsing error:", error);
      console.log("🔄 Using fallback JSON generation...");
      return this.generateFallbackJSON(prompt);
    }
  }

  private generateFallbackJSON(prompt: string): any {
    // Generate basic fallback JSON based on prompt content
    if (prompt.includes("GUI test") || prompt.includes("test case")) {
      return [
        {
          id: "fallback-test-1",
          name: "Fallback Test Case",
          description: "Generated fallback test case",
          steps: [
            {
              action: "goto",
              description: "Navigate to the application",
            },
          ],
          assertions: [
            {
              type: "visible",
              description: "Page should be visible",
            },
          ],
          tags: ["fallback", "gui"],
          priority: "medium",
        },
      ];
    } else if (prompt.includes("API test") || prompt.includes("endpoint")) {
      return [
        {
          id: "fallback-api-1",
          name: "Fallback API Test",
          description: "Generated fallback API test case",
          method: "GET",
          endpoint: "/api/test",
          expectedStatus: 200,
          assertions: [
            {
              type: "status",
              expected: 200,
              description: "Should return 200 OK",
            },
          ],
          tags: ["fallback", "api"],
          priority: "medium",
        },
      ];
    } else {
      return { message: "Fallback response generated" };
    }
  }

  // Method to check if Ollama is running
  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseURL}/api/tags`);
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  // Method to list available models
  async listModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseURL}/api/tags`);
      if (!response.ok) {
        throw new Error(`Failed to fetch models: ${response.status}`);
      }

      const data = await response.json();
      return data.models?.map((model: any) => model.name) || [];
    } catch (error) {
      console.error("Failed to list models:", error);
      return [];
    }
  }

  // Method to warm up the model
  async warmupModel(): Promise<boolean> {
    try {
      console.log("🔥 Warming up model...");
      const warmupPrompt =
        "Hello, please respond with 'OK' if you can see this message.";

      const response = await this.generateResponse(warmupPrompt, {
        temperature: 0.1,
      });
      console.log("✅ Model warmup successful");
      return true;
    } catch (error) {
      console.error("❌ Model warmup failed:", error);
      return false;
    }
  }

  // Method to check model status
  async checkModelStatus(): Promise<{ loaded: boolean; model: string }> {
    try {
      const response = await fetch(`${this.baseURL}/api/show`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: this.config.modelName }),
      });

      if (response.ok) {
        return { loaded: true, model: this.config.modelName };
      } else {
        return { loaded: false, model: this.config.modelName };
      }
    } catch (error) {
      return { loaded: false, model: this.config.modelName };
    }
  }
}
