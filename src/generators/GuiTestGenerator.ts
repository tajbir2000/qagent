// src/generators/GuiTestGenerator.ts
import { Browser, chromium, Page } from "playwright";
import { LLMProvider } from "../llm/LLMProvider";
import { UserJourney } from "../parsers/JourneyParser";

export interface GuiTestOptions {
  appUrl: string;
  userJourney?: UserJourney;
  viewport?: { width: number; height: number };
  timeout?: number;
}

export interface GuiTestCase {
  id: string;
  name: string;
  description: string;
  steps: PlaywrightStep[];
  assertions: Assertion[];
  tags: string[];
  priority: "high" | "medium" | "low";
}

export interface PlaywrightStep {
  action:
    | "goto"
    | "click"
    | "fill"
    | "select"
    | "hover"
    | "wait"
    | "screenshot"
    | "scroll";
  selector?: string;
  value?: string;
  options?: any;
  description: string;
}

export interface Assertion {
  type: "visible" | "text" | "value" | "url" | "count" | "attribute";
  selector?: string;
  expected: any;
  description: string;
}

export class GuiTestGenerator {
  private browser: Browser | null = null;

  constructor(private llmProvider: LLMProvider) {}

  async generateTests(options: GuiTestOptions): Promise<GuiTestCase[]> {
    console.log(`🔍 Analyzing application: ${options.appUrl}`);

    try {
      // Launch browser and analyze the application
      this.browser = await chromium.launch({ headless: true });
      const context = await this.browser.newContext({
        viewport: options.viewport || { width: 1920, height: 1080 },
      });

      const page = await context.newPage();
      await page.goto(options.appUrl);

      // Wait for page to load
      await page.waitForLoadState("networkidle");

      // Extract page information
      const pageInfo = await this.extractPageInformation(page);

      // Generate test cases based on analysis
      const testCases = await this.generateTestCases(pageInfo, options);

      await this.browser.close();
      this.browser = null;

      return testCases;
    } catch (error) {
      if (this.browser) {
        await this.browser.close();
      }
      throw error;
    }
  }

  private async extractPageInformation(page: Page): Promise<any> {
    const pageInfo = {
      title: await page.title(),
      url: page.url(),
      elements: [],
      forms: [],
      links: [],
      buttons: [],
      inputs: [],
    };

    try {
      // Extract interactive elements
      const elements = await page.evaluate(() => {
        const result = {
          forms: [],
          links: [],
          buttons: [],
          inputs: [],
        };

        // Forms
        document.querySelectorAll("form").forEach((form, index) => {
          result.forms.push({
            index,
            action: form.action,
            method: form.method,
            inputs: Array.from(
              form.querySelectorAll("input, select, textarea")
            ).map((input) => ({
              type: input.type || input.tagName.toLowerCase(),
              name: input.name,
              id: input.id,
              placeholder: input.placeholder,
              required: input.hasAttribute("required"),
            })),
          });
        });

        // Links
        document.querySelectorAll("a[href]").forEach((link, index) => {
          result.links.push({
            index,
            href: link.href,
            text: link.textContent?.trim(),
            id: link.id,
            className: link.className,
          });
        });

        // Buttons
        document
          .querySelectorAll(
            'button, input[type="submit"], input[type="button"]'
          )
          .forEach((button, index) => {
            result.buttons.push({
              index,
              text: button.textContent?.trim() || button.value,
              id: button.id,
              className: button.className,
              type: button.type,
            });
          });

        // Input fields
        document
          .querySelectorAll("input, select, textarea")
          .forEach((input, index) => {
            result.inputs.push({
              index,
              type: input.type || input.tagName.toLowerCase(),
              name: input.name,
              id: input.id,
              placeholder: input.placeholder,
              value: input.value,
              required: input.hasAttribute("required"),
            });
          });

        return result;
      });

      pageInfo.forms = elements.forms;
      pageInfo.links = elements.links;
      pageInfo.buttons = elements.buttons;
      pageInfo.inputs = elements.inputs;

      // Take screenshot for visual analysis
      const screenshot = await page.screenshot({ fullPage: true });
      pageInfo.screenshot = screenshot.toString("base64");
    } catch (error) {
      console.warn("Error extracting page information:", error);
    }

    return pageInfo;
  }

  private async generateTestCases(
    pageInfo: any,
    options: GuiTestOptions
  ): Promise<GuiTestCase[]> {
    const prompt = `
Analyze this web page and generate comprehensive GUI test cases using Playwright.

Page Information:
${JSON.stringify(pageInfo, null, 2)}

${
  options.userJourney
    ? `User Journey Context:
${JSON.stringify(options.userJourney, null, 2)}`
    : ""
}

Generate test cases that cover:
1. Basic functionality (forms, navigation, interactions)
2. User journey flows (if provided)
3. Edge cases (empty forms, invalid inputs, boundary conditions)
4. Accessibility testing (keyboard navigation, screen reader support)
5. Responsive design testing
6. Error handling scenarios

For each test case, provide:
- Unique ID and descriptive name
- Step-by-step Playwright actions
- Assertions to verify expected behavior
- Priority level (high/medium/low)
- Relevant tags

Use these Playwright action types:
- goto: Navigate to URL
- click: Click on element
- fill: Fill input field
- select: Select dropdown option
- hover: Hover over element
- wait: Wait for element or condition
- screenshot: Take screenshot
- scroll: Scroll to element

Assertion types:
- visible: Check if element is visible
- text: Check element text content
- value: Check input value
- url: Check current URL
- count: Check element count
- attribute: Check element attribute

Please provide a JSON array of test cases:`;

    try {
      const testCases = await this.llmProvider.generateJSON(prompt);
      return Array.isArray(testCases) ? testCases : [];
    } catch (error) {
      console.error("Failed to generate GUI test cases:", error);
      return this.generateFallbackTests(pageInfo, options);
    }
  }

  private generateFallbackTests(
    pageInfo: any,
    options: GuiTestOptions
  ): GuiTestCase[] {
    const testCases: GuiTestCase[] = [];

    // Basic page load test
    testCases.push({
      id: "gui-basic-load",
      name: "Basic Page Load",
      description: "Verify page loads correctly",
      steps: [
        {
          action: "goto",
          value: options.appUrl,
          description: "Navigate to application",
        },
        {
          action: "wait",
          selector: "body",
          description: "Wait for page to load",
        },
        {
          action: "screenshot",
          description: "Take screenshot for verification",
        },
      ],
      assertions: [
        {
          type: "visible",
          selector: "body",
          expected: true,
          description: "Page body should be visible",
        },
        {
          type: "text",
          selector: "title",
          expected: pageInfo.title,
          description: `Page title should be "${pageInfo.title}"`,
        },
      ],
      tags: ["basic", "smoke"],
      priority: "high",
    });

    // Form testing
    if (pageInfo.forms && pageInfo.forms.length > 0) {
      pageInfo.forms.forEach((form: any, index: number) => {
        testCases.push({
          id: `gui-form-${index}`,
          name: `Form ${index + 1} Validation`,
          description: `Test form validation and submission`,
          steps: [
            {
              action: "goto",
              value: options.appUrl,
              description: "Navigate to application",
            },
            ...this.generateFormTestSteps(form),
            {
              action: "screenshot",
              description: "Take screenshot after form interaction",
            },
          ],
          assertions: this.generateFormAssertions(form),
          tags: ["form", "validation"],
          priority: "high",
        });
      });
    }

    // Button click tests
    if (pageInfo.buttons && pageInfo.buttons.length > 0) {
      pageInfo.buttons.slice(0, 5).forEach((button: any, index: number) => {
        if (button.text && button.text.trim()) {
          testCases.push({
            id: `gui-button-${index}`,
            name: `Button Click - ${button.text}`,
            description: `Test clicking "${button.text}" button`,
            steps: [
              {
                action: "goto",
                value: options.appUrl,
                description: "Navigate to application",
              },
              {
                action: "click",
                selector: button.id
                  ? `#${button.id}`
                  : `button:has-text("${button.text}")`,
                description: `Click "${button.text}" button`,
              },
              {
                action: "wait",
                options: { timeout: 3000 },
                description: "Wait for action to complete",
              },
              {
                action: "screenshot",
                description: "Take screenshot after button click",
              },
            ],
            assertions: [
              {
                type: "visible",
                selector: "body",
                expected: true,
                description: "Page should remain accessible after button click",
              },
            ],
            tags: ["interaction", "buttons"],
            priority: "medium",
          });
        }
      });
    }

    // Link navigation tests
    if (pageInfo.links && pageInfo.links.length > 0) {
      pageInfo.links.slice(0, 3).forEach((link: any, index: number) => {
        if (
          link.text &&
          link.href &&
          !link.href.startsWith("mailto:") &&
          !link.href.startsWith("tel:")
        ) {
          testCases.push({
            id: `gui-link-${index}`,
            name: `Link Navigation - ${link.text}`,
            description: `Test navigation via "${link.text}" link`,
            steps: [
              {
                action: "goto",
                value: options.appUrl,
                description: "Navigate to application",
              },
              {
                action: "click",
                selector: link.id
                  ? `#${link.id}`
                  : `a:has-text("${link.text}")`,
                description: `Click "${link.text}" link`,
              },
              {
                action: "wait",
                options: { timeout: 5000 },
                description: "Wait for navigation to complete",
              },
              {
                action: "screenshot",
                description: "Take screenshot of destination page",
              },
            ],
            assertions: [
              {
                type: "url",
                expected: link.href,
                description: `Should navigate to ${link.href}`,
              },
            ],
            tags: ["navigation", "links"],
            priority: "medium",
          });
        }
      });
    }

    return testCases;
  }

  private generateFormTestSteps(form: any): PlaywrightStep[] {
    const steps: PlaywrightStep[] = [];

    if (form.inputs && form.inputs.length > 0) {
      form.inputs.forEach((input: any) => {
        if (
          input.type === "text" ||
          input.type === "email" ||
          input.type === "password"
        ) {
          const selector = input.id
            ? `#${input.id}`
            : `input[name="${input.name}"]`;
          const testValue = this.generateTestValue(input.type);

          steps.push({
            action: "fill",
            selector,
            value: testValue,
            description: `Fill ${input.name || input.id} with test value`,
          });
        } else if (input.type === "select") {
          steps.push({
            action: "select",
            selector: input.id
              ? `#${input.id}`
              : `select[name="${input.name}"]`,
            value: "first",
            description: `Select first option in ${input.name || input.id}`,
          });
        }
      });

      // Submit form if there's a submit button
      if (form.inputs.some((input: any) => input.type === "submit")) {
        steps.push({
          action: "click",
          selector: 'input[type="submit"]',
          description: "Submit form",
        });
      }
    }

    return steps;
  }

  private generateFormAssertions(form: any): Assertion[] {
    const assertions: Assertion[] = [];

    // Basic form visibility
    assertions.push({
      type: "visible",
      selector: "form",
      expected: true,
      description: "Form should be visible",
    });

    // Check required fields
    if (form.inputs) {
      form.inputs.forEach((input: any) => {
        if (input.required) {
          const selector = input.id
            ? `#${input.id}`
            : `input[name="${input.name}"]`;
          assertions.push({
            type: "attribute",
            selector,
            expected: "required",
            description: `${input.name || input.id} should be required`,
          });
        }
      });
    }

    return assertions;
  }

  private generateTestValue(inputType: string): string {
    switch (inputType) {
      case "email":
        return "test@example.com";
      case "password":
        return "TestPassword123!";
      case "number":
        return "42";
      case "tel":
        return "+1234567890";
      case "url":
        return "https://example.com";
      default:
        return "Test Value";
    }
  }
}
