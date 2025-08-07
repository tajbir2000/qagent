// src/generators/ApiTestGenerator.ts
import fs from "fs/promises";
import { chromium } from "playwright";
import { LLMProvider } from "../llm/LLMProvider";
import { UserJourney } from "../parsers/JourneyParser";

export interface ApiTestOptions {
  specFile?: string;
  userJourney?: UserJourney;
  discoveredAPIs?: DiscoveredAPI[];
  baseUrl?: string;
}

export interface ApiTestCase {
  id: string;
  name: string;
  description: string;
  method: string;
  endpoint: string;
  headers?: Record<string, string>;
  body?: any;
  queryParams?: Record<string, string>;
  expectedStatus: number;
  expectedResponse?: any;
  assertions: ApiAssertion[];
  tags: string[];
  priority: "high" | "medium" | "low";
  dependencies?: string[];
}

export interface ApiAssertion {
  type: "status" | "header" | "body" | "schema" | "performance";
  path?: string;
  expected: any;
  description: string;
}

export interface DiscoveredAPI {
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: any;
  response?: any;
  status: number;
}

export class ApiTestGenerator {
  constructor(private llmProvider: LLMProvider) {}

  async generateTests(options: ApiTestOptions): Promise<ApiTestCase[]> {
    console.log("🌐 Generating API test cases...");

    let apiSpec: any = null;

    // Parse API specification if provided
    if (options.specFile) {
      apiSpec = await this.parseApiSpec(options.specFile);
    }

    // Generate test cases
    const testCases = await this.generateTestCases(apiSpec, options);

    return testCases;
  }

  async discoverAPIs(appUrl: string): Promise<DiscoveredAPI[]> {
    console.log(`🔍 Discovering API endpoints from ${appUrl}...`);

    const discoveredAPIs: DiscoveredAPI[] = [];

    try {
      const browser = await chromium.launch({ headless: true });
      const context = await browser.newContext();
      const page = await context.newPage();

      // Intercept network requests
      page.on("request", (request) => {
        const url = request.url();
        if (this.isApiRequest(url, request.method())) {
          // Store request info
          const apiCall: Partial<DiscoveredAPI> = {
            method: request.method(),
            url: url,
            headers: request.headers(),
          };

          // Get request body for POST/PUT requests
          if (request.method() === "POST" || request.method() === "PUT") {
            try {
              apiCall.body = request.postDataJSON();
            } catch {
              apiCall.body = request.postData();
            }
          }

          discoveredAPIs.push(apiCall as DiscoveredAPI);
        }
      });

      page.on("response", (response) => {
        const request = response.request();
        const url = request.url();

        if (this.isApiRequest(url, request.method())) {
          // Find corresponding request and add response info
          const apiCall = discoveredAPIs.find(
            (api) => api.url === url && api.method === request.method()
          );

          if (apiCall) {
            apiCall.status = response.status();
            response
              .json()
              .then((data) => {
                apiCall.response = data;
              })
              .catch(() => {
                response
                  .text()
                  .then((text) => {
                    apiCall.response = text;
                  })
                  .catch(() => {});
              });
          }
        }
      });

      // Navigate to the application and interact with it
      await page.goto(appUrl);
      await page.waitForLoadState("networkidle");

      // Try to trigger API calls by interacting with the page
      await this.interactWithPage(page);

      await browser.close();

      // Remove duplicates
      const uniqueAPIs = this.removeDuplicateAPIs(discoveredAPIs);

      console.log(`📡 Discovered ${uniqueAPIs.length} unique API endpoints`);
      return uniqueAPIs;
    } catch (error) {
      console.error("Error discovering APIs:", error);
      return [];
    }
  }

  private async parseApiSpec(specFile: string): Promise<any> {
    try {
      const content = await fs.readFile(specFile, "utf-8");
      const extension = specFile.split(".").pop()?.toLowerCase();

      switch (extension) {
        case "json":
          return JSON.parse(content);
        case "yaml":
        case "yml":
          // In production, use a YAML parser like 'js-yaml'
          return this.parseYamlSpec(content);
        default:
          throw new Error(`Unsupported API spec format: ${extension}`);
      }
    } catch (error) {
      console.error(`Error parsing API spec: ${error}`);
      return null;
    }
  }

  private async parseYamlSpec(content: string): Promise<any> {
    // Use LLM to parse YAML if no YAML library is available
    const prompt = `
Convert this YAML API specification to JSON format:

${content}

Please provide only valid JSON output.`;

    try {
      return await this.llmProvider.generateJSON(prompt);
    } catch (error) {
      throw new Error("Failed to parse YAML specification");
    }
  }

  private async generateTestCases(
    apiSpec: any,
    options: ApiTestOptions
  ): Promise<ApiTestCase[]> {
    const prompt = `
Generate comprehensive API test cases based on the following information:

${
  apiSpec
    ? `API Specification:
${JSON.stringify(apiSpec, null, 2)}`
    : ""
}

${
  options.discoveredAPIs
    ? `Discovered API Endpoints:
${JSON.stringify(options.discoveredAPIs, null, 2)}`
    : ""
}

${
  options.userJourney
    ? `User Journey Context:
${JSON.stringify(options.userJourney, null, 2)}`
    : ""
}

Generate test cases that cover:
1. Happy path scenarios (valid requests, expected responses)
2. Error handling (4xx, 5xx status codes)
3. Edge cases (boundary values, empty payloads)
4. Authentication and authorization
5. Data validation
6. Performance testing
7. Security testing

For each test case, include:
- Unique ID and descriptive name
- HTTP method and endpoint
- Request headers, body, and query parameters
- Expected status code and response structure
- Detailed assertions
- Priority level and tags
- Dependencies on other tests if any

Assertion types to use:
- status: Check HTTP status code
- header: Validate response headers
- body: Check response body content
- schema: Validate response schema
- performance: Check response time

Please provide a JSON array of test cases:`;

    try {
      const testCases = await this.llmProvider.generateJSON(prompt);
      return Array.isArray(testCases) ? testCases : [];
    } catch (error) {
      console.error("Failed to generate API test cases:", error);
      return this.generateFallbackApiTests(options);
    }
  }

  private generateFallbackApiTests(options: ApiTestOptions): ApiTestCase[] {
    const testCases: ApiTestCase[] = [];

    // Generate tests from discovered APIs
    if (options.discoveredAPIs) {
      options.discoveredAPIs.forEach((api, index) => {
        // Happy path test
        testCases.push({
          id: `api-${index}-happy`,
          name: `${api.method} ${api.url} - Happy Path`,
          description: `Test successful ${api.method} request to ${api.url}`,
          method: api.method,
          endpoint: api.url,
          headers: api.headers,
          body: api.body,
          expectedStatus: 200,
          expectedResponse: api.response,
          assertions: [
            {
              type: "status",
              expected: 200,
              description: "Should return 200 OK",
            },
            {
              type: "performance",
              expected: 5000,
              description: "Should respond within 5 seconds",
            },
          ],
          tags: ["api", "happy-path"],
          priority: "high",
        });

        // Error handling test
        if (api.method === "POST" || api.method === "PUT") {
          testCases.push({
            id: `api-${index}-invalid`,
            name: `${api.method} ${api.url} - Invalid Data`,
            description: `Test ${api.method} request with invalid data`,
            method: api.method,
            endpoint: api.url,
            headers: api.headers,
            body: { invalid: "data" },
            expectedStatus: 400,
            assertions: [
              {
                type: "status",
                expected: 400,
                description: "Should return 400 Bad Request for invalid data",
              },
            ],
            tags: ["api", "error-handling"],
            priority: "medium",
          });
        }
      });
    }

    // Generate tests from user journey
    if (options.userJourney && options.userJourney.apiEndpoints) {
      options.userJourney.apiEndpoints.forEach((endpoint, index) => {
        testCases.push({
          id: `journey-api-${index}`,
          name: `${endpoint.method} ${endpoint.path} - Journey Test`,
          description:
            endpoint.description || `Test ${endpoint.method} ${endpoint.path}`,
          method: endpoint.method,
          endpoint: endpoint.path,
          expectedStatus: endpoint.statusCode || 200,
          expectedResponse: endpoint.expectedResponse,
          assertions: [
            {
              type: "status",
              expected: endpoint.statusCode || 200,
              description: `Should return ${endpoint.statusCode || 200}`,
            },
          ],
          tags: ["api", "user-journey"],
          priority: "high",
        });
      });
    }

    return testCases;
  }

  private isApiRequest(url: string, method: string): boolean {
    // Simple heuristics to identify API requests
    return (
      url.includes("/api/") ||
      url.includes("/v1/") ||
      url.includes("/v2/") ||
      url.includes("/graphql") ||
      url.endsWith(".json") ||
      (method !== "GET" &&
        !url.includes(".html") &&
        !url.includes(".css") &&
        !url.includes(".js"))
    );
  }

  private async interactWithPage(page: any): Promise<void> {
    try {
      // Click on buttons and links to trigger API calls
      const buttons = await page.$$('button, input[type="submit"]');
      for (const button of buttons.slice(0, 3)) {
        try {
          await button.click();
          await page.waitForTimeout(2000); // Wait for potential API calls
        } catch (error) {
          // Continue if button click fails
        }
      }

      // Fill forms to trigger validation/submission APIs
      const forms = await page.$$("form");
      for (const form of forms.slice(0, 2)) {
        try {
          const inputs = await form.$$(
            'input[type="text"], input[type="email"]'
          );
          for (const input of inputs) {
            await input.fill("test");
          }

          const submitBtn = await form.$(
            'input[type="submit"], button[type="submit"]'
          );
          if (submitBtn) {
            await submitBtn.click();
            await page.waitForTimeout(3000);
          }
        } catch (error) {
          // Continue if form interaction fails
        }
      }
    } catch (error) {
      console.warn("Error during page interaction:", error);
    }
  }

  private removeDuplicateAPIs(apis: DiscoveredAPI[]): DiscoveredAPI[] {
    const seen = new Set<string>();
    return apis.filter((api) => {
      const key = `${api.method}:${api.url}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  // Utility method to generate test data
  generateTestData(schema: any): any {
    if (!schema) return {};

    const testData: any = {};

    if (schema.properties) {
      for (const [key, prop] of Object.entries(schema.properties)) {
        testData[key] = this.generateValueForProperty(prop as any);
      }
    }

    return testData;
  }

  private generateValueForProperty(property: any): any {
    switch (property.type) {
      case "string":
        if (property.format === "email") return "test@example.com";
        if (property.format === "date") return "2023-01-01";
        if (property.format === "uuid")
          return "123e4567-e89b-12d3-a456-426614174000";
        return "test string";
      case "number":
      case "integer":
        return property.minimum || 1;
      case "boolean":
        return true;
      case "array":
        return [
          this.generateValueForProperty(property.items || { type: "string" }),
        ];
      case "object":
        return this.generateTestData(property);
      default:
        return "test value";
    }
  }
}
