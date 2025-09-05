// src/core/TestAgent.ts
import fs from "fs/promises";
import path from "path";
import { ApiTestGenerator } from "../generators/ApiTestGenerator";
import { GuiTestGenerator } from "../generators/GuiTestGenerator";
import { EdgeCaseGenerator, EdgeCaseConfig } from "../generators/EdgeCaseGenerator";
import { TestQualityAnalyzer } from "../quality/TestQualityAnalyzer";
import { LLMProvider } from "../llm/LLMProvider";
import { JourneyParser } from "../parsers/JourneyParser";
import { ReportGenerator } from "../reporting/ReportGenerator";
import { TestRunner } from "../runners/TestRunner";

export interface TestAgentConfig {
  llmProvider: LLMProvider;
  journeyParser: JourneyParser;
  guiGenerator: GuiTestGenerator;
  apiGenerator: ApiTestGenerator;
  edgeCaseGenerator?: EdgeCaseGenerator;
  qualityAnalyzer?: TestQualityAnalyzer;
  testRunner: TestRunner;
  reportGenerator: ReportGenerator;
}

export interface GenerateOptions {
  journeyFile?: string;
  appUrl?: string;
  apiSpecFile?: string;
  complexity?: 'basic' | 'intermediate' | 'advanced';
  includeEdgeCases?: boolean;
  includeSecurityTests?: boolean;
  includePerformanceTests?: boolean;
  maxTestCases?: number;
  testCategories?: string[];
}

export interface RunOptions {
  testDirectory: string;
  testType: "gui" | "api" | "all";
}

export interface FullWorkflowOptions extends GenerateOptions {}

export class TestAgent {
  private config: TestAgentConfig;
  private edgeCaseGenerator: EdgeCaseGenerator;
  private qualityAnalyzer: TestQualityAnalyzer;

  constructor(config: TestAgentConfig) {
    this.config = config;
    this.edgeCaseGenerator = config.edgeCaseGenerator || new EdgeCaseGenerator();
    this.qualityAnalyzer = config.qualityAnalyzer || new TestQualityAnalyzer();
  }

  async generateTests(options: GenerateOptions): Promise<void> {
    console.log("🚀 Starting enhanced test generation...");
    console.log(`📊 Complexity level: ${options.complexity || 'intermediate'}`);
    console.log(`🎯 Max test cases: ${options.maxTestCases || 'unlimited'}`);
    console.log(`🔒 Security tests: ${options.includeSecurityTests ? 'enabled' : 'disabled'}`);
    console.log(`⚡ Performance tests: ${options.includePerformanceTests ? 'enabled' : 'disabled'}`);
    console.log(`🔍 Edge cases: ${options.includeEdgeCases ? 'enabled' : 'disabled'}`);

    try {
      // Ensure output directories exist
      await this.ensureDirectories();

      let userJourney: any = null;
      let pageInfo: any = null;
      let discoveredApis: any[] = [];
      let allGuiTests: any[] = [];
      let allApiTests: any[] = [];

      // Parse user journey if provided
      if (options.journeyFile) {
        console.log(`📖 Parsing user journey from: ${options.journeyFile}`);
        userJourney = await this.config.journeyParser.parseJourney(
          options.journeyFile
        );
      }

      // Generate GUI tests with enhanced options
      if (options.appUrl) {
        console.log(`🖥️  Generating enhanced GUI tests for: ${options.appUrl}`);
        const guiOptions = {
          appUrl: options.appUrl,
          userJourney,
          complexity: options.complexity,
          testCategories: options.testCategories,
          maxTestCases: options.maxTestCases
        };

        const guiTests = await this.config.guiGenerator.generateTests(guiOptions);
        allGuiTests.push(...guiTests);

        // Store page info for edge case generation
        // Note: This would need to be exposed by the GuiTestGenerator
        console.log(`✅ Generated ${guiTests.length} enhanced GUI test cases`);
      }

      // Generate API tests with enhanced options
      if (options.apiSpecFile) {
        console.log(`🌐 Generating enhanced API tests from: ${options.apiSpecFile}`);
        const apiOptions = {
          specFile: options.apiSpecFile,
          userJourney,
          complexity: options.complexity,
          testCategories: options.testCategories,
          maxTestCases: options.maxTestCases,
          includePerformanceTests: options.includePerformanceTests,
          includeSecurityTests: options.includeSecurityTests
        };

        const apiTests = await this.config.apiGenerator.generateTests(apiOptions);
        allApiTests.push(...apiTests);

        console.log(`✅ Generated ${apiTests.length} enhanced API test cases`);
      }

      // Auto-discover and generate API tests if URL provided
      if (options.appUrl && !options.apiSpecFile) {
        console.log("🔍 Auto-discovering API endpoints with enhanced analysis...");
        discoveredApis = await this.config.apiGenerator.discoverAPIs(options.appUrl);
        
        if (discoveredApis.length > 0) {
          const apiOptions = {
            discoveredAPIs: discoveredApis,
            userJourney,
            complexity: options.complexity,
            testCategories: options.testCategories,
            maxTestCases: options.maxTestCases,
            includePerformanceTests: options.includePerformanceTests,
            includeSecurityTests: options.includeSecurityTests
          };

          const apiTests = await this.config.apiGenerator.generateTests(apiOptions);
          allApiTests.push(...apiTests);

          console.log(`✅ Generated ${apiTests.length} enhanced API test cases from discovery`);
        }
      }

      // Generate edge cases if enabled
      if (options.includeEdgeCases && (allGuiTests.length > 0 || allApiTests.length > 0)) {
        console.log("🔍 Generating comprehensive edge cases...");
        
        const edgeConfig: EdgeCaseConfig = {
          includeSecurityTests: options.includeSecurityTests || false,
          includeBoundaryTests: true,
          includeDataValidationTests: true,
          includePerformanceEdgeCases: options.includePerformanceTests || false,
          includeAccessibilityTests: true,
          maxEdgeCases: Math.min(10, Math.ceil((allGuiTests.length + allApiTests.length) * 0.3))
        };

        if (allGuiTests.length > 0 && pageInfo) {
          const guiEdgeCases = this.edgeCaseGenerator.generateGuiEdgeCases(
            allGuiTests, 
            pageInfo, 
            edgeConfig
          );
          allGuiTests.push(...guiEdgeCases);
          console.log(`🎯 Added ${guiEdgeCases.length} GUI edge cases`);
        }

        if (allApiTests.length > 0 && discoveredApis.length > 0) {
          const apiEdgeCases = this.edgeCaseGenerator.generateApiEdgeCases(
            allApiTests, 
            discoveredApis, 
            edgeConfig
          );
          allApiTests.push(...apiEdgeCases);
          console.log(`🎯 Added ${apiEdgeCases.length} API edge cases`);
        }
      }

      // Analyze test quality and provide feedback
      if (allGuiTests.length > 0 || allApiTests.length > 0) {
        console.log("📊 Analyzing test quality...");
        
        if (allGuiTests.length > 0) {
          const guiQuality = this.qualityAnalyzer.analyzeGuiTestQuality(allGuiTests);
          console.log(`🎯 GUI Test Quality Score: ${guiQuality.overall}/100`);
          
          if (guiQuality.issues.length > 0) {
            console.log(`⚠️  Found ${guiQuality.issues.length} quality issues:`);
            guiQuality.issues.slice(0, 3).forEach(issue => {
              console.log(`   - ${issue.severity.toUpperCase()}: ${issue.message}`);
            });
          }
          
          if (guiQuality.suggestions.length > 0) {
            console.log("💡 GUI Test Suggestions:");
            guiQuality.suggestions.slice(0, 2).forEach(suggestion => {
              console.log(`   - ${suggestion}`);
            });
          }
        }

        if (allApiTests.length > 0) {
          const apiQuality = this.qualityAnalyzer.analyzeApiTestQuality(allApiTests);
          console.log(`🎯 API Test Quality Score: ${apiQuality.overall}/100`);
          
          if (apiQuality.issues.length > 0) {
            console.log(`⚠️  Found ${apiQuality.issues.length} quality issues:`);
            apiQuality.issues.slice(0, 3).forEach(issue => {
              console.log(`   - ${issue.severity.toUpperCase()}: ${issue.message}`);
            });
          }
          
          if (apiQuality.suggestions.length > 0) {
            console.log("💡 API Test Suggestions:");
            apiQuality.suggestions.slice(0, 2).forEach(suggestion => {
              console.log(`   - ${suggestion}`);
            });
          }
        }

        // Analyze coverage gaps
        const coverage = this.qualityAnalyzer.analyzeCoverageGaps(allGuiTests, allApiTests);
        console.log(`📈 Coverage Analysis:`);
        console.log(`   - Functional: ${coverage.functionalCoverage}%`);
        console.log(`   - Error Handling: ${coverage.errorCoverage}%`);
        console.log(`   - Edge Cases: ${coverage.edgeCaseCoverage}%`);
        console.log(`   - Security: ${coverage.securityCoverage}%`);
        console.log(`   - Performance: ${coverage.performanceCoverage}%`);
        if (allGuiTests.length > 0) {
          console.log(`   - Accessibility: ${coverage.accessibilityCoverage}%`);
        }
      }

      // Save all generated tests
      if (allGuiTests.length > 0) {
        await this.saveTests("gui", allGuiTests);
        await this.saveQualityReport("gui", this.qualityAnalyzer.analyzeGuiTestQuality(allGuiTests));
      }

      if (allApiTests.length > 0) {
        await this.saveTests("api", allApiTests);
        await this.saveQualityReport("api", this.qualityAnalyzer.analyzeApiTestQuality(allApiTests));
      }

      console.log("🎉 Enhanced test generation completed!");
      console.log(`📊 Total generated: ${allGuiTests.length + allApiTests.length} test cases`);
      
    } catch (error) {
      console.error("❌ Enhanced test generation failed:", error);
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

  private async saveQualityReport(type: "gui" | "api", qualityScore: any): Promise<void> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const filename = `${type}-quality-${timestamp}.json`;
      const filepath = path.join("./reports", filename);

      await fs.writeFile(filepath, JSON.stringify(qualityScore, null, 2));

      // Also save as latest
      const latestPath = path.join("./reports", `latest-${type}-quality.json`);
      await fs.writeFile(latestPath, JSON.stringify(qualityScore, null, 2));
      
      console.log(`📊 Quality report saved: ${filepath}`);
    } catch (error) {
      console.warn("Failed to save quality report:", error);
    }
  }
}
