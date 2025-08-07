// src/runners/TestRunner.ts
import fs from "fs/promises";
import path from "path";
import { Browser, chromium, Page } from "playwright";
import { ApiTestCase } from "../generators/ApiTestGenerator";
import {
  Assertion,
  GuiTestCase,
  PlaywrightStep,
} from "../generators/GuiTestGenerator";

export interface TestRunOptions {
  testDirectory: string;
  testType: "gui" | "api" | "all";
  parallel?: boolean;
  timeout?: number;
  retries?: number;
  headless?: boolean;
}

export interface TestResult {
  id: string;
  name: string;
  status: "passed" | "failed" | "skipped";
  duration: number;
  error?: string;
  screenshots?: string[];
  logs: string[];
  details?: any;
}

export interface TestSummary {
  gui: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    duration: number;
  };
  api: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    duration: number;
  };
  overall: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    duration: number;
  };
  results: TestResult[];
}

export class TestRunner {
  private browser: Browser | null = null;

  async runTests(options: TestRunOptions): Promise<TestSummary> {
    console.log(`🏃 Running ${options.testType} tests...`);

    const summary: TestSummary = {
      gui: { total: 0, passed: 0, failed: 0, skipped: 0, duration: 0 },
      api: { total: 0, passed: 0, failed: 0, skipped: 0, duration: 0 },
      overall: { total: 0, passed: 0, failed: 0, skipped: 0, duration: 0 },
      results: [],
    };

    const startTime = Date.now();

    try {
      // Initialize browser for GUI tests
      if (options.testType === "gui" || options.testType === "all") {
        this.browser = await chromium.launch({
          headless: options.headless !== false,
          timeout: options.timeout || 30000,
        });
      }

      // Run GUI tests
      if (options.testType === "gui" || options.testType === "all") {
        const guiResults = await this.runGuiTests(options);
        summary.gui = guiResults;
        summary.results.push(...guiResults.results);
      }

      // Run API tests
      if (options.testType === "api" || options.testType === "all") {
        const apiResults = await this.runApiTests(options);
        summary.api = apiResults;
        summary.results.push(...apiResults.results);
      }

      // Calculate overall summary
      summary.overall = {
        total: summary.gui.total + summary.api.total,
        passed: summary.gui.passed + summary.api.passed,
        failed: summary.gui.failed + summary.api.failed,
        skipped: summary.gui.skipped + summary.api.skipped,
        duration: Date.now() - startTime,
      };

      return summary;
    } catch (error) {
      console.error("Test runner error:", error);
      throw error;
    } finally {
      if (this.browser) {
        await this.browser.close();
      }
    }
  }

  private async runGuiTests(options: TestRunOptions): Promise<any> {
    console.log("🖥️  Running GUI tests...");

    const results: TestResult[] = [];
    const startTime = Date.now();

    try {
      const guiTestsPath = path.join(
        options.testDirectory,
        "gui",
        "latest.json"
      );
      const testsContent = await fs.readFile(guiTestsPath, "utf-8");
      const testCases: GuiTestCase[] = JSON.parse(testsContent);

      console.log(`Found ${testCases.length} GUI test cases`);

      for (const testCase of testCases) {
        const result = await this.runGuiTestCase(testCase, options);
        results.push(result);

        console.log(
          `${result.status === "passed" ? "✅" : "❌"} ${result.name} (${
            result.duration
          }ms)`
        );

        if (result.error) {
          console.log(`   Error: ${result.error}`);
        }
      }
    } catch (error) {
      console.error("Error running GUI tests:", error);
      results.push({
        id: "gui-error",
        name: "GUI Test Suite Error",
        status: "failed",
        duration: 0,
        error: error instanceof Error ? error.message : "Unknown error",
        logs: [],
      });
    }

    return {
      total: results.length,
      passed: results.filter((r) => r.status === "passed").length,
      failed: results.filter((r) => r.status === "failed").length,
      skipped: results.filter((r) => r.status === "skipped").length,
      duration: Date.now() - startTime,
      results,
    };
  }

  private async runGuiTestCase(
    testCase: GuiTestCase,
    options: TestRunOptions
  ): Promise<TestResult> {
    const result: TestResult = {
      id: testCase.id,
      name: testCase.name,
      status: "failed",
      duration: 0,
      logs: [],
      screenshots: [],
    };

    const startTime = Date.now();

    try {
      if (!this.browser) {
        throw new Error("Browser not initialized");
      }

      const context = await this.browser.newContext({
        viewport: { width: 1920, height: 1080 },
      });

      const page = await context.newPage();

      // Set up logging
      page.on("console", (msg) => {
        result.logs.push(`Console: ${msg.text()}`);
      });

      page.on("pageerror", (error) => {
        result.logs.push(`Page error: ${error.message}`);
      });

      // Execute test steps
      for (const step of testCase.steps) {
        result.logs.push(`Executing: ${step.description}`);
        await this.executePlaywrightStep(page, step, result);
      }

      // Run assertions
      for (const assertion of testCase.assertions) {
        result.logs.push(`Asserting: ${assertion.description}`);
        await this.executeAssertion(page, assertion);
      }

      result.status = "passed";
      await context.close();
    } catch (error) {
      result.error = error instanceof Error ? error.message : "Unknown error";
      result.logs.push(`Test failed: ${result.error}`);
    }

    result.duration = Date.now() - startTime;
    return result;
  }

  private async executePlaywrightStep(
    page: Page,
    step: PlaywrightStep,
    result: TestResult
  ): Promise<void> {
    const timeout = 10000; // 10 seconds default timeout

    switch (step.action) {
      case "goto":
        await page.goto(step.value!, { waitUntil: "networkidle", timeout });
        break;

      case "click":
        if (step.selector) {
          await page.click(step.selector, { timeout });
        }
        break;

      case "fill":
        if (step.selector && step.value) {
          await page.fill(step.selector, step.value, { timeout });
        }
        break;

      case "select":
        if (step.selector && step.value) {
          if (step.value === "first") {
            const options = await page.$$(step.selector + " option");
            if (options && options.length > 1) {
              const value = await options[1].getAttribute("value");
              if (value) {
                await page.selectOption(step.selector, value);
              }
            }
          } else {
            await page.selectOption(step.selector, step.value);
          }
        }
        break;

      case "hover":
        if (step.selector) {
          await page.hover(step.selector, { timeout });
        }
        break;

      case "wait":
        if (step.selector) {
          await page.waitForSelector(step.selector, { timeout });
        } else if (step.options?.timeout) {
          await page.waitForTimeout(step.options.timeout);
        }
        break;

      case "screenshot":
        const screenshot = await page.screenshot({ fullPage: true });
        const screenshotPath = `screenshot-${Date.now()}.png`;
        await fs.writeFile(`./reports/${screenshotPath}`, screenshot);
        result.screenshots = result.screenshots || [];
        result.screenshots.push(screenshotPath);
        break;

      case "scroll":
        if (step.selector) {
          await page.locator(step.selector).scrollIntoViewIfNeeded();
        } else {
          await page.evaluate(() =>
            window.scrollTo(0, document.body.scrollHeight)
          );
        }
        break;

      default:
        throw new Error(`Unknown step action: ${step.action}`);
    }
  }

  private async executeAssertion(
    page: Page,
    assertion: Assertion
  ): Promise<void> {
    switch (assertion.type) {
      case "visible":
        if (assertion.selector) {
          const isVisible = await page.isVisible(assertion.selector);
          if (isVisible !== assertion.expected) {
            throw new Error(
              `Element ${assertion.selector} visibility expected ${assertion.expected}, got ${isVisible}`
            );
          }
        }
        break;

      case "text":
        if (assertion.selector) {
          const text = await page.textContent(assertion.selector);
          if (text?.trim() !== assertion.expected) {
            throw new Error(
              `Element ${assertion.selector} text expected "${assertion.expected}", got "${text}"`
            );
          }
        }
        break;

      case "value":
        if (assertion.selector) {
          const value = await page.inputValue(assertion.selector);
          if (value !== assertion.expected) {
            throw new Error(
              `Element ${assertion.selector} value expected "${assertion.expected}", got "${value}"`
            );
          }
        }
        break;

      case "url":
        const currentUrl = page.url();
        if (
          currentUrl !== assertion.expected &&
          !currentUrl.includes(assertion.expected)
        ) {
          throw new Error(
            `URL expected to contain "${assertion.expected}", got "${currentUrl}"`
          );
        }
        break;

      case "count":
        if (assertion.selector) {
          const count = await page.locator(assertion.selector).count();
          if (count !== assertion.expected) {
            throw new Error(
              `Element ${assertion.selector} count expected ${assertion.expected}, got ${count}`
            );
          }
        }
        break;

      case "attribute":
        if (assertion.selector) {
          const hasAttribute = await page
            .locator(assertion.selector)
            .getAttribute(assertion.expected);
          if (!hasAttribute) {
            throw new Error(
              `Element ${assertion.selector} should have attribute "${assertion.expected}"`
            );
          }
        }
        break;

      default:
        throw new Error(`Unknown assertion type: ${assertion.type}`);
    }
  }

  private async runApiTests(options: TestRunOptions): Promise<any> {
    console.log("🌐 Running API tests...");

    const results: TestResult[] = [];
    const startTime = Date.now();

    try {
      const apiTestsPath = path.join(
        options.testDirectory,
        "api",
        "latest.json"
      );
      const testsContent = await fs.readFile(apiTestsPath, "utf-8");
      const testCases: ApiTestCase[] = JSON.parse(testsContent);

      console.log(`Found ${testCases.length} API test cases`);

      for (const testCase of testCases) {
        const result = await this.runApiTestCase(testCase, options);
        results.push(result);

        console.log(
          `${result.status === "passed" ? "✅" : "❌"} ${result.name} (${
            result.duration
          }ms)`
        );

        if (result.error) {
          console.log(`   Error: ${result.error}`);
        }
      }
    } catch (error) {
      console.error("Error running API tests:", error);
      results.push({
        id: "api-error",
        name: "API Test Suite Error",
        status: "failed",
        duration: 0,
        error: error instanceof Error ? error.message : "Unknown error",
        logs: [],
      });
    }

    return {
      total: results.length,
      passed: results.filter((r) => r.status === "passed").length,
      failed: results.filter((r) => r.status === "failed").length,
      skipped: results.filter((r) => r.status === "skipped").length,
      duration: Date.now() - startTime,
      results,
    };
  }

  private async runApiTestCase(
    testCase: ApiTestCase,
    options: TestRunOptions
  ): Promise<TestResult> {
    const result: TestResult = {
      id: testCase.id,
      name: testCase.name,
      status: "failed",
      duration: 0,
      logs: [],
    };

    const startTime = Date.now();

    try {
      result.logs.push(
        `Making ${testCase.method} request to ${testCase.endpoint}`
      );

      // Prepare request options
      const requestOptions: RequestInit = {
        method: testCase.method,
        headers: {
          "Content-Type": "application/json",
          ...testCase.headers,
        },
      };

      // Add body for POST/PUT requests
      if (
        testCase.body &&
        (testCase.method === "POST" ||
          testCase.method === "PUT" ||
          testCase.method === "PATCH")
      ) {
        requestOptions.body = JSON.stringify(testCase.body);
      }

      // Add query parameters
      let url = testCase.endpoint;
      if (testCase.queryParams) {
        const params = new URLSearchParams(testCase.queryParams);
        url += "?" + params.toString();
      }

      // Make the request
      const response = await fetch(url, requestOptions);
      const responseTime = Date.now() - startTime;

      result.logs.push(
        `Response: ${response.status} ${response.statusText} (${responseTime}ms)`
      );

      let responseData: any;
      const contentType = response.headers.get("content-type");

      if (contentType?.includes("application/json")) {
        responseData = await response.json();
      } else {
        responseData = await response.text();
      }

      // Store response details
      result.details = {
        request: {
          method: testCase.method,
          url: url,
          headers: requestOptions.headers,
          body: testCase.body,
        },
        response: {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers as any),
          body: responseData,
          responseTime,
        },
      };

      // Run assertions
      for (const assertion of testCase.assertions) {
        result.logs.push(`Asserting: ${assertion.description}`);
        await this.executeApiAssertion(
          response,
          responseData,
          assertion,
          responseTime
        );
      }

      result.status = "passed";
    } catch (error) {
      result.error = error instanceof Error ? error.message : "Unknown error";
      result.logs.push(`Test failed: ${result.error}`);
    }

    result.duration = Date.now() - startTime;
    return result;
  }

  private async executeApiAssertion(
    response: Response,
    responseData: any,
    assertion: any,
    responseTime: number
  ): Promise<void> {
    switch (assertion.type) {
      case "status":
        if (response.status !== assertion.expected) {
          throw new Error(
            `Status expected ${assertion.expected}, got ${response.status}`
          );
        }
        break;

      case "header":
        const headerValue = response.headers.get(assertion.path || "");
        if (headerValue !== assertion.expected) {
          throw new Error(
            `Header ${assertion.path} expected "${assertion.expected}", got "${headerValue}"`
          );
        }
        break;

      case "body":
        if (assertion.path) {
          const value = this.getNestedValue(responseData, assertion.path);
          if (value !== assertion.expected) {
            throw new Error(
              `Body path ${assertion.path} expected "${assertion.expected}", got "${value}"`
            );
          }
        } else {
          if (
            JSON.stringify(responseData) !== JSON.stringify(assertion.expected)
          ) {
            throw new Error(`Response body does not match expected`);
          }
        }
        break;

      case "schema":
        // Basic schema validation - in production, use a proper JSON schema validator
        if (!this.validateSchema(responseData, assertion.expected)) {
          throw new Error(`Response does not match expected schema`);
        }
        break;

      case "performance":
        if (responseTime > assertion.expected) {
          throw new Error(
            `Response time ${responseTime}ms exceeded threshold ${assertion.expected}ms`
          );
        }
        break;

      default:
        throw new Error(`Unknown assertion type: ${assertion.type}`);
    }
  }

  private getNestedValue(obj: any, path: string): any {
    return path
      .split(".")
      .reduce((current, key) => current && current[key], obj);
  }

  private validateSchema(data: any, schema: any): boolean {
    // Basic schema validation - implement more comprehensive validation as needed
    if (typeof schema === "object" && schema.type) {
      switch (schema.type) {
        case "object":
          return typeof data === "object" && data !== null;
        case "array":
          return Array.isArray(data);
        case "string":
          return typeof data === "string";
        case "number":
          return typeof data === "number";
        case "boolean":
          return typeof data === "boolean";
        default:
          return true;
      }
    }
    return true;
  }

  // Utility method to save test results
  async saveResults(
    summary: TestSummary,
    outputPath: string = "./reports"
  ): Promise<void> {
    try {
      await fs.mkdir(outputPath, { recursive: true });

      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const resultsFile = path.join(
        outputPath,
        `test-results-${timestamp}.json`
      );

      await fs.writeFile(resultsFile, JSON.stringify(summary, null, 2));

      // Also save as latest
      const latestFile = path.join(outputPath, "latest-results.json");
      await fs.writeFile(latestFile, JSON.stringify(summary, null, 2));

      console.log(`📊 Test results saved to ${resultsFile}`);
    } catch (error) {
      console.error("Error saving test results:", error);
    }
  }
}
