// src/generators/ApiTestGenerator.ts
import fs from "fs/promises";
import { chromium } from "playwright";
import { LLMProvider } from "../llm/LLMProvider";
import { UserJourney } from "../parsers/JourneyParser";
import { PromptTemplates, PromptContext } from "../prompts/PromptTemplates";

export interface ApiTestOptions {
  specFile?: string;
  userJourney?: UserJourney;
  discoveredAPIs?: DiscoveredAPI[];
  baseUrl?: string;
  complexity?: 'basic' | 'intermediate' | 'advanced';
  testCategories?: string[];
  maxTestCases?: number;
  includePerformanceTests?: boolean;
  includeSecurityTests?: boolean;
}

export interface ApiTestCase {
  id: string;
  name: string;
  description: string;
  category: string;
  priority: "critical" | "high" | "medium" | "low";
  estimatedDuration: string;
  tags: string[];
  prerequisites?: string[];
  dependencies?: string[];
  method: string;
  endpoint: string;
  baseUrl?: string;
  headers?: Record<string, string>;
  body?: any;
  queryParams?: Record<string, string>;
  expectedStatus: number;
  expectedHeaders?: Record<string, string>;
  expectedResponse?: any;
  assertions: ApiAssertion[];
  dataSetup?: Record<string, ApiOperation>;
  dataCleanup?: Record<string, ApiOperation>;
  variableExtraction?: Record<string, string>;
}

export interface ApiOperation {
  endpoint: string;
  method: string;
  body?: any;
  headers?: Record<string, string>;
}

export interface ApiAssertion {
  type: "status" | "header" | "body" | "schema" | "performance" | "security";
  path?: string;
  operator?: "equals" | "contains" | "matches" | "exists" | "type" | "range" | "less" | "greater";
  expected: any;
  description: string;
  timeout?: number;
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
    let browser: any = null;

    try {
      browser = await chromium.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });
      const context = await browser.newContext();
      const page = await context.newPage();

      // Set longer timeout for page operations
      page.setDefaultTimeout(30000);

      // Intercept network requests
      page.on("request", (request: any) => {
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

      page.on("response", (response: any) => {
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
              .then((data: any) => {
                apiCall.response = data;
              })
              .catch(() => {
                response
                  .text()
                  .then((text: any) => {
                    apiCall.response = text;
                  })
                  .catch(() => {});
              });
          }
        }
      });

      // Navigate to the application and interact with it
      await page.goto(appUrl, { waitUntil: "networkidle", timeout: 30000 });

      // Wait a bit more for dynamic content
      await page.waitForTimeout(2000);

      // Try to trigger API calls by interacting with the page
      await this.interactWithPage(page);

      // Wait for any pending requests to complete
      await page.waitForTimeout(3000);

      // Remove duplicates
      const uniqueAPIs = this.removeDuplicateAPIs(discoveredAPIs);

      console.log(`📡 Discovered ${uniqueAPIs.length} unique API endpoints`);
      return uniqueAPIs;
    } catch (error) {
      console.error("Error discovering APIs:", error);
      return [];
    } finally {
      // Ensure browser is always closed
      if (browser) {
        try {
          await browser.close();
        } catch (closeError) {
          console.warn("Error closing browser:", closeError);
        }
      }
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
    try {
      console.log("🌐 Generating API test cases with enhanced prompts...");
      
      // Create context for prompt generation
      const context: PromptContext = {
        apiSpec,
        discoveredAPIs: options.discoveredAPIs,
        userJourney: options.userJourney,
        testType: 'api',
        complexity: options.complexity || 'intermediate',
        focus: options.testCategories
      };

      // Generate enhanced prompt
      const prompt = PromptTemplates.generateApiTestPrompt(context);
      
      console.log(`📝 Using ${context.complexity} complexity level`);
      console.log(`🎯 Focus areas: ${options.testCategories?.join(', ') || 'all categories'}`);
      console.log(`🔒 Security tests: ${options.includeSecurityTests ? 'enabled' : 'disabled'}`);
      console.log(`⚡ Performance tests: ${options.includePerformanceTests ? 'enabled' : 'disabled'}`);
      
      // Generate test cases using enhanced prompt
      const testCases = await this.llmProvider.generateJSON(prompt);
      
      if (!Array.isArray(testCases)) {
        console.warn("LLM returned non-array response, using fallback");
        return this.generateFallbackApiTests(options);
      }

      // Validate and enhance generated test cases
      const validatedTests = this.validateAndEnhanceApiTestCases(testCases, options);
      
      // Add additional specialized tests based on options
      const specializedTests = this.generateSpecializedTests(options);
      validatedTests.push(...specializedTests);
      
      console.log(`✨ Generated ${validatedTests.length} enhanced API test cases`);
      return validatedTests;
      
    } catch (error) {
      console.error("Failed to generate enhanced API test cases:", error);
      return this.generateFallbackApiTests(options);
    }
  }

  private validateAndEnhanceApiTestCases(testCases: any[], options: ApiTestOptions): ApiTestCase[] {
    const validated: ApiTestCase[] = [];
    const maxTests = options.maxTestCases || 30;

    for (let i = 0; i < testCases.length && validated.length < maxTests; i++) {
      const testCase = testCases[i];
      
      // Validate required fields
      if (!testCase.id || !testCase.name || !testCase.method || !testCase.endpoint) {
        console.warn(`Skipping invalid API test case: ${testCase.name || 'unnamed'}`);
        continue;
      }

      // Enhance test case with defaults and validation
      const enhancedTest: ApiTestCase = {
        id: this.ensureUniqueApiId(testCase.id, validated),
        name: testCase.name,
        description: testCase.description || `API test for ${testCase.method} ${testCase.endpoint}`,
        category: testCase.category || 'functional',
        priority: this.validateApiPriority(testCase.priority),
        estimatedDuration: testCase.estimatedDuration || '500ms',
        tags: Array.isArray(testCase.tags) ? testCase.tags : ['api', 'automated'],
        prerequisites: testCase.prerequisites || [],
        dependencies: testCase.dependencies || [],
        method: testCase.method.toUpperCase(),
        endpoint: this.normalizeEndpoint(testCase.endpoint),
        baseUrl: testCase.baseUrl || options.baseUrl,
        headers: testCase.headers || {},
        body: testCase.body,
        queryParams: testCase.queryParams,
        expectedStatus: testCase.expectedStatus || this.getDefaultStatus(testCase.method),
        expectedHeaders: testCase.expectedHeaders,
        expectedResponse: testCase.expectedResponse,
        assertions: this.validateApiAssertions(testCase.assertions || []),
        dataSetup: testCase.dataSetup,
        dataCleanup: testCase.dataCleanup,
        variableExtraction: testCase.variableExtraction
      };

      // Add default Content-Type for POST/PUT/PATCH requests
      if (['POST', 'PUT', 'PATCH'].includes(enhancedTest.method) && enhancedTest.body) {
        enhancedTest.headers = {
          'Content-Type': 'application/json',
          ...enhancedTest.headers
        };
      }

      // Add default status assertion if none exists
      if (!enhancedTest.assertions.some(a => a.type === 'status')) {
        enhancedTest.assertions.unshift({
          type: 'status',
          expected: enhancedTest.expectedStatus,
          description: `Should return ${enhancedTest.expectedStatus} status`,
          operator: 'equals'
        });
      }

      validated.push(enhancedTest);
    }

    return this.prioritizeApiTestCases(validated);
  }

  private generateSpecializedTests(options: ApiTestOptions): ApiTestCase[] {
    const specializedTests: ApiTestCase[] = [];

    // Generate security tests if enabled
    if (options.includeSecurityTests && options.discoveredAPIs) {
      specializedTests.push(...this.generateSecurityTests(options.discoveredAPIs.slice(0, 3)));
    }

    // Generate performance tests if enabled
    if (options.includePerformanceTests && options.discoveredAPIs) {
      specializedTests.push(...this.generatePerformanceTests(options.discoveredAPIs.slice(0, 2)));
    }

    return specializedTests;
  }

  private generateSecurityTests(apis: DiscoveredAPI[]): ApiTestCase[] {
    return apis.map((api, index) => ({
      id: `api-security-${index}`,
      name: `Security Test - ${api.method} ${api.url}`,
      description: `Test security vulnerabilities for ${api.method} ${api.url}`,
      category: 'security',
      priority: 'high' as const,
      estimatedDuration: '1s',
      tags: ['security', 'automated'],
      method: api.method,
      endpoint: api.url,
      headers: {
        'X-Malicious-Header': '<script>alert("xss")</script>',
        ...api.headers
      },
      body: api.method === 'POST' ? {
        maliciousInput: '<script>alert("xss")</script>',
        sqlInjection: "'; DROP TABLE users; --",
        ...api.body
      } : undefined,
      expectedStatus: api.status < 400 ? api.status : 400,
      assertions: [
        {
          type: 'status',
          expected: api.status < 400 ? api.status : 400,
          description: 'Should handle malicious input safely',
          operator: 'equals'
        },
        {
          type: 'security',
          expected: 'no_script_execution',
          description: 'Should not execute malicious scripts',
          operator: 'exists'
        }
      ]
    }));
  }

  private generatePerformanceTests(apis: DiscoveredAPI[]): ApiTestCase[] {
    return apis.map((api, index) => ({
      id: `api-performance-${index}`,
      name: `Performance Test - ${api.method} ${api.url}`,
      description: `Test response time for ${api.method} ${api.url}`,
      category: 'performance',
      priority: 'medium' as const,
      estimatedDuration: '2s',
      tags: ['performance', 'automated'],
      method: api.method,
      endpoint: api.url,
      headers: api.headers,
      body: api.body,
      expectedStatus: api.status,
      assertions: [
        {
          type: 'status',
          expected: api.status,
          description: `Should return ${api.status} status`,
          operator: 'equals'
        },
        {
          type: 'performance',
          expected: 2000,
          description: 'Should respond within 2 seconds',
          operator: 'less'
        }
      ]
    }));
  }

  private ensureUniqueApiId(id: string, existingTests: ApiTestCase[]): string {
    let uniqueId = id;
    let counter = 1;
    
    while (existingTests.some(test => test.id === uniqueId)) {
      uniqueId = `${id}-${counter}`;
      counter++;
    }
    
    return uniqueId;
  }

  private validateApiPriority(priority: any): "critical" | "high" | "medium" | "low" {
    if (['critical', 'high', 'medium', 'low'].includes(priority)) {
      return priority;
    }
    return 'medium';
  }

  private normalizeEndpoint(endpoint: string): string {
    // Remove base URL if present and ensure it starts with /
    const path = endpoint.replace(/^https?:\/\/[^/]+/, '');
    return path.startsWith('/') ? path : `/${path}`;
  }

  private getDefaultStatus(method: string): number {
    switch (method.toUpperCase()) {
      case 'POST': return 201;
      case 'DELETE': return 204;
      case 'PUT':
      case 'PATCH':
      case 'GET':
      default: return 200;
    }
  }

  private validateApiAssertions(assertions: any[]): ApiAssertion[] {
    return assertions.map(assertion => ({
      type: this.validateApiAssertionType(assertion.type),
      path: assertion.path || undefined,
      operator: assertion.operator || 'equals',
      expected: assertion.expected,
      description: assertion.description || 'API assertion',
      timeout: assertion.timeout || 5000
    }));
  }

  private validateApiAssertionType(type: any): ApiAssertion['type'] {
    const validTypes = ['status', 'header', 'body', 'schema', 'performance', 'security'];
    return validTypes.includes(type) ? type : 'status';
  }

  private prioritizeApiTestCases(testCases: ApiTestCase[]): ApiTestCase[] {
    // Sort by priority: critical > high > medium > low
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    
    return testCases.sort((a, b) => {
      const priorityA = priorityOrder[a.priority];
      const priorityB = priorityOrder[b.priority];
      
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }
      
      // Secondary sort by category importance
      const categoryOrder = { 
        authentication: 0, 
        crud: 1, 
        validation: 2, 
        security: 3, 
        performance: 4, 
        error: 5 
      };
      const categoryA = categoryOrder[a.category as keyof typeof categoryOrder] || 6;
      const categoryB = categoryOrder[b.category as keyof typeof categoryOrder] || 6;
      
      return categoryA - categoryB;
    });
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
          category: "functional",
          priority: "high",
          estimatedDuration: "500ms",
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
              operator: "equals"
            },
            {
              type: "performance",
              expected: 5000,
              description: "Should respond within 5 seconds",
              operator: "less"
            },
          ],
          tags: ["api", "happy-path"],
        });

        // Error handling test
        if (api.method === "POST" || api.method === "PUT") {
          testCases.push({
            id: `api-${index}-invalid`,
            name: `${api.method} ${api.url} - Invalid Data`,
            description: `Test ${api.method} request with invalid data`,
            category: "error",
            priority: "medium",
            estimatedDuration: "500ms",
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
                operator: "equals"
              },
            ],
            tags: ["api", "error-handling"],
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
          category: "user-journey",
          priority: "high",
          estimatedDuration: "1s",
          method: endpoint.method,
          endpoint: endpoint.path,
          expectedStatus: endpoint.statusCode || 200,
          expectedResponse: endpoint.expectedResponse,
          assertions: [
            {
              type: "status",
              expected: endpoint.statusCode || 200,
              description: `Should return ${endpoint.statusCode || 200}`,
              operator: "equals"
            },
          ],
          tags: ["api", "user-journey"],
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
      // Check if page is still valid
      if (page.isClosed()) {
        console.warn("Page is closed, skipping interaction");
        return;
      }

      // Click on buttons and links to trigger API calls
      const buttons = await page.$$('button, input[type="submit"]');
      console.log(`Found ${buttons.length} buttons to interact with`);

      for (let i = 0; i < Math.min(buttons.length, 3); i++) {
        try {
          if (page.isClosed()) break;

          const button = buttons[i];
          await button.click({ timeout: 5000 });
          await page.waitForTimeout(2000); // Wait for potential API calls
        } catch (error) {
          console.warn(`Button click ${i + 1} failed:`, error.message);
          // Continue if button click fails
        }
      }

      // Fill forms to trigger validation/submission APIs
      const forms = await page.$$("form");
      console.log(`Found ${forms.length} forms to interact with`);

      for (let i = 0; i < Math.min(forms.length, 2); i++) {
        try {
          if (page.isClosed()) break;

          const form = forms[i];
          const inputs = await form.$$(
            'input[type="text"], input[type="email"]'
          );

          for (const input of inputs) {
            try {
              await input.fill("test", { timeout: 3000 });
            } catch (inputError) {
              console.warn("Input fill failed:", inputError.message);
            }
          }

          const submitBtn = await form.$(
            'input[type="submit"], button[type="submit"]'
          );
          if (submitBtn) {
            await submitBtn.click({ timeout: 5000 });
            await page.waitForTimeout(3000);
          }
        } catch (error) {
          console.warn(`Form interaction ${i + 1} failed:`, error.message);
          // Continue if form interaction fails
        }
      }
    } catch (error) {
      console.warn("Error during page interaction:", error.message);
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
