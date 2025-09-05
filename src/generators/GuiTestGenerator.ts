// src/generators/GuiTestGenerator.ts
import { Browser, chromium, Page } from "playwright";
import { LLMProvider } from "../llm/LLMProvider";
import { UserJourney } from "../parsers/JourneyParser";
import { PromptTemplates, PromptContext } from "../prompts/PromptTemplates";

export interface GuiTestOptions {
  appUrl: string;
  userJourney?: UserJourney;
  viewport?: { width: number; height: number };
  timeout?: number;
  complexity?: 'basic' | 'intermediate' | 'advanced';
  testCategories?: string[];
  maxTestCases?: number;
}

export interface GuiTestCase {
  id: string;
  name: string;
  description: string;
  category: string;
  priority: "critical" | "high" | "medium" | "low";
  estimatedDuration: string;
  tags: string[];
  prerequisites?: string[];
  testData?: {
    inputs?: Record<string, any>;
    expectedOutputs?: Record<string, any>;
  };
  steps: PlaywrightStep[];
  assertions: Assertion[];
  cleanup?: PlaywrightStep[];
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
    | "scroll"
    | "press"
    | "type"
    | "check"
    | "uncheck";
  selector?: string;
  value?: string;
  options?: {
    timeout?: number;
    force?: boolean;
    trial?: boolean;
    strict?: boolean;
  };
  description: string;
  waitFor?: "networkidle" | "domcontentloaded" | "load" | "element";
  retry?: boolean;
}

export interface Assertion {
  type: "visible" | "text" | "value" | "url" | "count" | "attribute" | "style" | "screenshot";
  selector?: string;
  expected: any;
  description: string;
  timeout?: number;
  retry?: boolean;
  operator?: "equals" | "contains" | "matches" | "exists" | "greater" | "less";
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
    const pageInfo: any = {
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
        const result: any = {
          forms: [],
          links: [],
          buttons: [],
          inputs: [],
        };

        // Forms
        document.querySelectorAll("form").forEach((form, index) => {
          const formElement = form as HTMLFormElement;
          result.forms.push({
            index,
            action: formElement.action,
            method: formElement.method,
            inputs: Array.from(
              formElement.querySelectorAll("input, select, textarea")
            ).map((input) => {
              const inputElement = input as
                | HTMLInputElement
                | HTMLSelectElement
                | HTMLTextAreaElement;
              return {
                type: inputElement.type || inputElement.tagName.toLowerCase(),
                name: inputElement.name,
                id: inputElement.id,
                placeholder: (inputElement as any).placeholder || "",
                required: inputElement.hasAttribute("required"),
              };
            }),
          });
        });

        // Links
        document.querySelectorAll("a[href]").forEach((link, index) => {
          const linkElement = link as HTMLAnchorElement;
          result.links.push({
            index,
            href: linkElement.href,
            text: linkElement.textContent?.trim(),
            id: linkElement.id,
            className: linkElement.className,
          });
        });

        // Buttons
        document
          .querySelectorAll(
            'button, input[type="submit"], input[type="button"]'
          )
          .forEach((button, index) => {
            const buttonElement = button as
              | HTMLButtonElement
              | HTMLInputElement;
            result.buttons.push({
              index,
              text: buttonElement.textContent?.trim() || buttonElement.value,
              id: buttonElement.id,
              className: buttonElement.className,
              type: buttonElement.type,
            });
          });

        // Input fields
        document
          .querySelectorAll("input, select, textarea")
          .forEach((input, index) => {
            const inputElement = input as
              | HTMLInputElement
              | HTMLSelectElement
              | HTMLTextAreaElement;
            result.inputs.push({
              index,
              type: inputElement.type || inputElement.tagName.toLowerCase(),
              name: inputElement.name,
              id: inputElement.id,
              placeholder: (inputElement as HTMLInputElement).placeholder || "",
              value: inputElement.value,
              required: inputElement.hasAttribute("required"),
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
    try {
      console.log("🔍 Generating GUI test cases with enhanced prompts...");
      
      // Create context for prompt generation
      const context: PromptContext = {
        pageInfo,
        userJourney: options.userJourney,
        testType: 'gui',
        complexity: options.complexity || 'intermediate',
        focus: options.testCategories
      };

      // Generate enhanced prompt
      const prompt = PromptTemplates.generateGuiTestPrompt(context);
      
      console.log(`📝 Using ${context.complexity} complexity level`);
      console.log(`🎯 Focus areas: ${options.testCategories?.join(', ') || 'all categories'}`);
      
      // Generate test cases using enhanced prompt
      const testCases = await this.llmProvider.generateJSON(prompt);
      
      if (!Array.isArray(testCases)) {
        console.warn("LLM returned non-array response, using fallback");
        return this.generateFallbackTests(pageInfo, options);
      }

      // Validate and enhance generated test cases
      const validatedTests = this.validateAndEnhanceTestCases(testCases, options);
      
      console.log(`✨ Generated ${validatedTests.length} enhanced GUI test cases`);
      return validatedTests;
      
    } catch (error) {
      console.error("Failed to generate enhanced GUI test cases:", error);
      return this.generateFallbackTests(pageInfo, options);
    }
  }

  private validateAndEnhanceTestCases(testCases: any[], options: GuiTestOptions): GuiTestCase[] {
    const validated: GuiTestCase[] = [];
    const maxTests = options.maxTestCases || 25;

    for (let i = 0; i < testCases.length && validated.length < maxTests; i++) {
      const testCase = testCases[i];
      
      // Validate required fields
      if (!testCase.id || !testCase.name || !testCase.steps || !Array.isArray(testCase.steps)) {
        console.warn(`Skipping invalid test case: ${testCase.name || 'unnamed'}`);
        continue;
      }

      // Enhance test case with defaults and validation
      const enhancedTest: GuiTestCase = {
        id: this.ensureUniqueId(testCase.id, validated),
        name: testCase.name,
        description: testCase.description || `Test case for ${testCase.name}`,
        category: testCase.category || 'functional',
        priority: this.validatePriority(testCase.priority),
        estimatedDuration: testCase.estimatedDuration || '1m',
        tags: Array.isArray(testCase.tags) ? testCase.tags : ['automated'],
        prerequisites: testCase.prerequisites || [],
        testData: testCase.testData || {},
        steps: this.validateSteps(testCase.steps, options.appUrl),
        assertions: this.validateAssertions(testCase.assertions || []),
        cleanup: testCase.cleanup || []
      };

      // Add URL navigation if missing
      if (!enhancedTest.steps.some(step => step.action === 'goto')) {
        enhancedTest.steps.unshift({
          action: 'goto',
          value: options.appUrl,
          description: 'Navigate to application',
          waitFor: 'networkidle'
        });
      }

      validated.push(enhancedTest);
    }

    return this.prioritizeTestCases(validated);
  }

  private ensureUniqueId(id: string, existingTests: GuiTestCase[]): string {
    let uniqueId = id;
    let counter = 1;
    
    while (existingTests.some(test => test.id === uniqueId)) {
      uniqueId = `${id}-${counter}`;
      counter++;
    }
    
    return uniqueId;
  }

  private validatePriority(priority: any): "critical" | "high" | "medium" | "low" {
    if (['critical', 'high', 'medium', 'low'].includes(priority)) {
      return priority;
    }
    return 'medium';
  }

  private validateSteps(steps: any[], appUrl: string): PlaywrightStep[] {
    return steps.map((step, index) => {
      const validStep: PlaywrightStep = {
        action: this.validateAction(step.action),
        selector: step.selector || undefined,
        value: step.value || undefined,
        description: step.description || `Step ${index + 1}`,
        options: {
          timeout: step.options?.timeout || 10000,
          force: step.options?.force || false,
          ...step.options
        },
        waitFor: step.waitFor || undefined,
        retry: step.retry || false
      };

      // Add app URL for goto actions that don't have a value
      if (validStep.action === 'goto' && !validStep.value) {
        validStep.value = appUrl;
      }

      return validStep;
    });
  }

  private validateAction(action: any): PlaywrightStep['action'] {
    const validActions = ['goto', 'click', 'fill', 'select', 'hover', 'wait', 'screenshot', 'scroll', 'press', 'type', 'check', 'uncheck'];
    return validActions.includes(action) ? action : 'click';
  }

  private validateAssertions(assertions: any[]): Assertion[] {
    return assertions.map(assertion => ({
      type: this.validateAssertionType(assertion.type),
      selector: assertion.selector || undefined,
      expected: assertion.expected,
      description: assertion.description || 'Assertion validation',
      timeout: assertion.timeout || 5000,
      retry: assertion.retry || true,
      operator: assertion.operator || 'equals'
    }));
  }

  private validateAssertionType(type: any): Assertion['type'] {
    const validTypes = ['visible', 'text', 'value', 'url', 'count', 'attribute', 'style', 'screenshot'];
    return validTypes.includes(type) ? type : 'visible';
  }

  private prioritizeTestCases(testCases: GuiTestCase[]): GuiTestCase[] {
    // Sort by priority: critical > high > medium > low
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    
    return testCases.sort((a, b) => {
      const priorityA = priorityOrder[a.priority];
      const priorityB = priorityOrder[b.priority];
      
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }
      
      // Secondary sort by category importance
      const categoryOrder = { authentication: 0, form: 1, navigation: 2, error: 3, accessibility: 4 };
      const categoryA = categoryOrder[a.category as keyof typeof categoryOrder] || 5;
      const categoryB = categoryOrder[b.category as keyof typeof categoryOrder] || 5;
      
      return categoryA - categoryB;
    });
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
      category: "smoke",
      priority: "high",
      estimatedDuration: "30s",
      tags: ["basic", "smoke"],
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
    });

    // Form testing
    if (pageInfo.forms && pageInfo.forms.length > 0) {
      pageInfo.forms.forEach((form: any, index: number) => {
        testCases.push({
          id: `gui-form-${index}`,
          name: `Form ${index + 1} Validation`,
          description: `Test form validation and submission`,
          category: "form",
          priority: "high",
          estimatedDuration: "45s",
          tags: ["form", "validation"],
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
            category: "interaction",
            priority: "medium",
            estimatedDuration: "20s",
            tags: ["interaction", "buttons"],
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
            category: "navigation",
            priority: "medium",
            estimatedDuration: "25s",
            tags: ["navigation", "links"],
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
