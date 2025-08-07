// src/llm/LocalLLMProvider.ts
import { spawn } from "child_process";

export interface LocalLLMConfig {
  modelPath: string;
  executable?: string; // e.g., 'llama.cpp', 'ollama'
  temperature?: number;
  contextSize?: number;
}

export class LocalLLMProvider implements LLMProvider {
  private config: LocalLLMConfig;

  constructor(config: LocalLLMConfig) {
    this.config = {
      executable: "ollama",
      temperature: 0.1,
      contextSize: 4096,
      ...config,
    };
  }

  async generateResponse(
    prompt: string,
    options?: LLMOptions
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      let response = "";
      let error = "";

      // Using Ollama as default local LLM runner
      const args = [
        "run",
        this.getModelName(),
        "--temperature",
        (options?.temperature || this.config.temperature || 0.1).toString(),
      ];

      const process = spawn(this.config.executable!, args);

      process.stdin.write(prompt);
      process.stdin.end();

      process.stdout.on("data", (data) => {
        response += data.toString();
      });

      process.stderr.on("data", (data) => {
        error += data.toString();
      });

      process.on("close", (code) => {
        if (code === 0) {
          resolve(response.trim());
        } else {
          reject(new Error(`Local LLM process failed: ${error}`));
        }
      });

      process.on("error", (err) => {
        reject(new Error(`Failed to start local LLM: ${err.message}`));
      });
    });
  }

  async generateJSON(prompt: string, schema?: any): Promise<any> {
    const jsonPrompt = `${prompt}\n\nIMPORTANT: Respond with valid JSON only. No additional text, explanations, or formatting.`;

    try {
      const response = await this.generateResponse(jsonPrompt);

      // Clean up the response to extract JSON
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      // Fallback: try to parse the entire response
      return JSON.parse(response.trim());
    } catch (error) {
      console.error("JSON parsing error:", error);
      throw new Error(`Failed to generate valid JSON response: ${error}`);
    }
  }

  private getModelName(): string {
    // Extract model name from path for Ollama
    const modelPath = this.config.modelPath;
    if (modelPath.includes("/")) {
      return modelPath.split("/").pop()!.replace(".gguf", "");
    }
    return modelPath;
  }

  // Alternative method for llama.cpp
  async generateWithLlamaCpp(
    prompt: string,
    options?: LLMOptions
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      let response = "";

      const args = [
        "-m",
        this.config.modelPath,
        "-p",
        prompt,
        "-n",
        (options?.maxTokens || 1000).toString(),
        "--temp",
        (options?.temperature || this.config.temperature || 0.1).toString(),
        "-c",
        (this.config.contextSize || 4096).toString(),
      ];

      const process = spawn("llama.cpp/main", args);

      process.stdout.on("data", (data) => {
        response += data.toString();
      });

      process.on("close", (code) => {
        if (code === 0) {
          resolve(response.trim());
        } else {
          reject(new Error("llama.cpp process failed"));
        }
      });

      process.on("error", (err) => {
        reject(new Error(`Failed to start llama.cpp: ${err.message}`));
      });
    });
  }
}
