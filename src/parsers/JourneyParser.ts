// src/parsers/JourneyParser.ts
import fs from "fs/promises";
import path from "path";
import { LLMProvider } from "../llm/LLMProvider";

export interface UserJourney {
  id: string;
  title: string;
  description: string;
  steps: JourneyStep[];
  apiEndpoints?: ApiEndpoint[];
  testScenarios?: TestScenario[];
}

export interface JourneyStep {
  id: string;
  action: string;
  element?: string;
  input?: string;
  expected?: string;
  screenshot?: boolean;
  apiCalls?: string[];
}

export interface ApiEndpoint {
  method: string;
  path: string;
  description: string;
  requestBody?: any;
  expectedResponse?: any;
  statusCode?: number;
}

export interface TestScenario {
  name: string;
  type: "happy_path" | "edge_case" | "error_handling";
  steps: string[];
  assertions: string[];
}

export class JourneyParser {
  constructor(private llmProvider: LLMProvider) {}

  async parseJourney(filePath: string): Promise<UserJourney> {
    const fileExtension = path.extname(filePath).toLowerCase();
    const fileContent = await fs.readFile(filePath, "utf-8");

    switch (fileExtension) {
      case ".json":
        return this.parseJsonJourney(fileContent);
      case ".md":
      case ".txt":
        return this.parseTextJourney(fileContent);
      case ".yml":
      case ".yaml":
        return this.parseYamlJourney(fileContent);
      default:
        return this.parseWithLLM(fileContent, fileExtension);
    }
  }

  private async parseJsonJourney(content: string): Promise<UserJourney> {
    try {
      const parsed = JSON.parse(content);
      return this.validateAndEnhanceJourney(parsed);
    } catch (error) {
      throw new Error(`Invalid JSON format: ${error}`);
    }
  }

  private async parseTextJourney(content: string): Promise<UserJourney> {
    const prompt = `
Parse the following user journey description and convert it to a structured format.
Extract user actions, expected outcomes, API calls, and test scenarios.

User Journey:
${content}

Please provide a JSON response with the following structure:
{
  "id": "unique-journey-id",
  "title": "Journey Title",
  "description": "Brief description",
  "steps": [
    {
      "id": "step-1",
      "action": "action description",
      "element": "UI element if applicable",
      "input": "input data if any",
      "expected": "expected outcome",
      "apiCalls": ["list of related API endpoints"]
    }
  ],
  "apiEndpoints": [
    {
      "method": "HTTP method",
      "path": "endpoint path",
      "description": "endpoint description",
      "expectedResponse": "expected response format"
    }
  ],
  "testScenarios": [
    {
      "name": "scenario name",
      "type": "happy_path|edge_case|error_handling",
      "steps": ["list of test steps"],
      "assertions": ["list of assertions to verify"]
    }
  ]
}`;

    const response = await this.llmProvider.generateJSON(prompt);
    return this.validateAndEnhanceJourney(response);
  }

  private async parseYamlJourney(content: string): Promise<UserJourney> {
    // For now, treat YAML as text and parse with LLM
    // In production, you'd want to add a proper YAML parser
    return this.parseTextJourney(content);
  }

  private async parseWithLLM(
    content: string,
    fileType: string
  ): Promise<UserJourney> {
    const prompt = `
I have a user journey or diagram in ${fileType} format. Please analyze it and extract:
1. User actions and flows
2. UI interactions
3. API endpoints that might be involved
4. Test scenarios (positive, negative, edge cases)

Content:
${content}

Please provide a structured JSON response following this schema:
{
  "id": "journey-id",
  "title": "Journey Title",
  "description": "Description of the user journey",
  "steps": [
    {
      "id": "step-id",
      "action": "What the user does",
      "element": "UI element involved",
      "input": "Input data",
      "expected": "Expected result",
      "apiCalls": ["related API endpoints"]
    }
  ],
  "apiEndpoints": [
    {
      "method": "GET|POST|PUT|DELETE",
      "path": "/api/endpoint",
      "description": "What this endpoint does"
    }
  ],
  "testScenarios": [
    {
      "name": "Test scenario name",
      "type": "happy_path|edge_case|error_handling",
      "steps": ["detailed test steps"],
      "assertions": ["what to verify"]
    }
  ]
}`;

    const response = await this.llmProvider.generateJSON(prompt);
    return this.validateAndEnhanceJourney(response);
  }

  private async validateAndEnhanceJourney(journey: any): Promise<UserJourney> {
    // Validate required fields
    if (!journey.id) journey.id = `journey-${Date.now()}`;
    if (!journey.title) journey.title = "User Journey";
    if (!journey.description) journey.description = "Generated user journey";
    if (!Array.isArray(journey.steps)) journey.steps = [];

    // Enhance with additional test scenarios if needed
    if (!journey.testScenarios || journey.testScenarios.length === 0) {
      journey.testScenarios = await this.generateTestScenarios(journey);
    }

    // Auto-generate API endpoints if not present but mentioned in steps
    if (!journey.apiEndpoints || journey.apiEndpoints.length === 0) {
      journey.apiEndpoints = this.extractApiEndpoints(journey.steps);
    }

    return journey as UserJourney;
  }

  private async generateTestScenarios(journey: any): Promise<TestScenario[]> {
    const prompt = `
Based on this user journey, generate comprehensive test scenarios:

Journey: ${JSON.stringify(journey, null, 2)}

Generate test scenarios covering:
1. Happy path (normal user flow)
2. Edge cases (boundary conditions, unusual inputs)
3. Error handling (invalid inputs, network failures, etc.)

Provide JSON array of test scenarios:
[
  {
    "name": "Test scenario name",
    "type": "happy_path|edge_case|error_handling",
    "steps": ["detailed steps"],
    "assertions": ["what to verify"]
  }
]`;

    try {
      const scenarios = await this.llmProvider.generateJSON(prompt);
      return Array.isArray(scenarios) ? scenarios : [];
    } catch (error) {
      console.warn("Could not generate test scenarios:", error);
      return [];
    }
  }

  private extractApiEndpoints(steps: JourneyStep[]): ApiEndpoint[] {
    const endpoints: ApiEndpoint[] = [];

    for (const step of steps) {
      if (step.apiCalls) {
        for (const apiCall of step.apiCalls) {
          // Simple parsing - in production, you'd want more sophisticated extraction
          const parts = apiCall.split(" ");
          if (parts.length >= 2) {
            endpoints.push({
              method: parts[0].toUpperCase(),
              path: parts[1],
              description: `API call from step: ${step.action}`,
            });
          }
        }
      }
    }

    return endpoints;
  }

  async parseDiagram(imagePath: string): Promise<UserJourney> {
    // For diagram parsing, you'd typically use OCR or image analysis
    // This is a placeholder for future implementation
    throw new Error(
      "Diagram parsing not yet implemented. Please convert diagrams to text/JSON format."
    );
  }
}
