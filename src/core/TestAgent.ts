// src/core/TestAgent.ts
import fs from "fs/promises";
import path from "path";
import { ApiTestGenerator } from "../generators/ApiTestGenerator";
import { GuiTestGenerator } from "../generators/GuiTestGenerator";
import { LLMProvider } from "../llm/LLMProvider";
import { JourneyParser } from "../parsers/JourneyParser";
import { ReportGenerator } from "../reporting/ReportGenerator";
import { TestRunner } from "../runners/TestRunner";

export interface TestAgentConfig {
  llmProvider: LLMProvider;
  journeyParser: JourneyParser;
  guiGenerator: GuiTestGenerator;
  apiGenerator: ApiTestGenerator;
  testRunner: TestRunner;
  reportGenerator: ReportGenerator;
}

export interface GenerateOptions {
  journeyFile?: string;
  appUrl?: string;
  apiSpecFile?: string;
}

export interface RunOptions {
  testDirectory: string;
  testType: "gui" | "api" | "all";
}

export interface FullWorkflowOptions extends GenerateOptions {}

export class TestAgent {
  private config: TestAgentConfig;

  constructor(config: TestAgentConfig) {
    this.config = config;
  }

  async generateTests(options: GenerateOptions): Promise<void> {
    console.log("🚀 Starting test generation...");

    try {
      // Ensure output directories exist
      await this.ensureDirectories();

      let userJourney: any = null;

      // Parse user journey if provided
      if (options.journeyFile) {
        console.log(`📖 Parsing user journey from: ${options.journeyFile}`);
        userJourney = await this.config.journeyParser.parseJourney(
          options.journeyFile
        );
      }

      // Generate GUI tests
      if (options.appUrl) {
        console.log(`🖥️  Generating GUI tests for: ${options.appUrl}`);
        const guiTests = await this.config.guiGenerator.generateTests({
          appUrl: options.appUrl,
          userJourney,
        });

        await this.saveTests("gui", guiTests);
        console.log(`✅ Generated ${guiTests.length} GUI test cases`);
      }

      // Generate API tests
      if (options.apiSpecFile) {
        console.log(`🌐 Generating API tests from: ${options.apiSpecFile}`);
        const apiTests = await this.config.apiGenerator.generateTests({
          specFile: options.apiSpecFile,
          userJourney,
        });

        await this.saveTests("api", apiTests);
        console.log(`✅ Generated ${apiTests.length} API test cases`);
      }

      // Auto-discover and generate API tests if URL provided
      if (options.appUrl && !options.apiSpecFile) {
        console.log("🔍 Auto-discovering API endpoints...");
        const discoveredApis = await this.config.apiGenerator.discoverAPIs(
          options.appUrl
        );
        if (discoveredApis.length > 0) {
          const apiTests = await this.config.apiGenerator.generateTests({
            discoveredAPIs: discoveredApis,
            userJourney,
          });

          await this.saveTests("api", apiTests);
          console.log(
            `✅ Generated ${apiTests.length} API test cases from discovery`
          );
        }
      }

      console.log("🎉 Test generation completed!");
    } catch (error) {
      console.error("❌ Test generation failed:", error);
      throw error;
    }
  }

  async runTests(options: RunOptions): Promise<any> {
    console.log("🏃 Starting test execution...");

    try {
      const results = await this.config.testRunner.runTests(options);

      console.log(`✅ Test execution completed:`);
      console.log(
        `   GUI Tests: ${results.gui.passed}/${results.gui.total} passed`
      );
      console.log(
        `   API Tests: ${results.api.passed}/${results.api.total} passed`
      );

      return results;
    } catch (error) {
      console.error("❌ Test execution failed:", error);
      throw error;
    }
  }

  async executeFullWorkflow(options: FullWorkflowOptions): Promise<void> {
    console.log("🔄 Starting full test workflow...");

    try {
      // Step 1: Generate tests
      await this.generateTests(options);

      // Step 2: Run tests
      const testResults = await this.runTests({
        testDirectory: "./tests",
        testType: "all",
      });

      // Step 3: Generate report
      console.log("📊 Generating test report...");
      await this.config.reportGenerator.generateReport({
        results: testResults,
        outputPath: "./reports",
      });

      console.log(
        "🎉 Full workflow completed! Check ./reports for detailed results."
      );
    } catch (error) {
      console.error("❌ Full workflow failed:", error);
      throw error;
    }
  }

  private async ensureDirectories(): Promise<void> {
    const dirs = ["./tests", "./tests/gui", "./tests/api", "./reports"];

    for (const dir of dirs) {
      try {
        await fs.access(dir);
      } catch {
        await fs.mkdir(dir, { recursive: true });
      }
    }
  }

  private async saveTests(type: "gui" | "api", tests: any[]): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `${type}-tests-${timestamp}.json`;
    const filepath = path.join("./tests", type, filename);

    await fs.writeFile(filepath, JSON.stringify(tests, null, 2));

    // Also save as latest
    const latestPath = path.join("./tests", type, "latest.json");
    await fs.writeFile(latestPath, JSON.stringify(tests, null, 2));
  }
}
