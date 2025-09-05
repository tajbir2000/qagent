// src/main.ts
import dotenv from "dotenv";
import { TestAgent } from "./core/TestAgent";
import { ApiTestGenerator } from "./generators/ApiTestGenerator";
import { GuiTestGenerator } from "./generators/GuiTestGenerator";
import { EdgeCaseGenerator } from "./generators/EdgeCaseGenerator";
import { TestQualityAnalyzer } from "./quality/TestQualityAnalyzer";
import { LocalLLMProvider } from "./llm/LocalLLMProvider";
import { OpenAIProvider } from "./llm/OpenAIProvider";
import { JourneyParser } from "./parsers/JourneyParser";
import { ReportGenerator } from "./reporting/ReportGenerator";
import { TestRunner } from "./runners/TestRunner";

dotenv.config();

async function main() {
  try {
    // Initialize LLM provider (local or cloud)
    let llmProvider;

    if (process.env.USE_LOCAL_LLM === "true") {
      try {
        // Use local LLM with optimized settings
        llmProvider = new LocalLLMProvider({
          modelName: process.env.LOCAL_MODEL_PATH || "codellama:7b",
          baseURL: process.env.OLLAMA_BASE_URL || "http://localhost:11434",
          temperature: 0.1,
        });

        console.log("✅ Using Local LLM (Ollama) - Optimized for performance");
      } catch (error) {
        console.log(
          "⚠️  Local LLM setup failed, please check Ollama installation"
        );
        throw error;
      }
    } else {
      llmProvider = new OpenAIProvider({
        apiKey: process.env.OPENAI_API_KEY!,
        model: process.env.OPENAI_MODEL || "gpt-3.5-turbo",
      });
      console.log("✅ Using OpenAI");
    }

    // Initialize components
    const journeyParser = new JourneyParser(llmProvider);
    const guiGenerator = new GuiTestGenerator(llmProvider);
    const apiGenerator = new ApiTestGenerator(llmProvider);
    const edgeCaseGenerator = new EdgeCaseGenerator();
    const qualityAnalyzer = new TestQualityAnalyzer();
    const testRunner = new TestRunner();
    const reportGenerator = new ReportGenerator();

    // Initialize main agent with enhanced components
    const agent = new TestAgent({
      llmProvider,
      journeyParser,
      guiGenerator,
      apiGenerator,
      edgeCaseGenerator,
      qualityAnalyzer,
      testRunner,
      reportGenerator,
    });

    // Command line arguments processing
    const args = process.argv.slice(2);
    const command = args[0];

    switch (command) {
      case "generate":
        await handleGenerate(agent, args.slice(1));
        break;
      case "run":
        await handleRun(agent, args.slice(1));
        break;
      case "full":
        await handleFullWorkflow(agent, args.slice(1));
        break;
      default:
        console.log("Available commands:");
        console.log(
          "  generate [options] - Generate test cases from user journey"
        );
        console.log("  run [options] - Run existing test cases");
        console.log(
          "  full [options] - Generate and run tests, then create report"
        );
        break;
    }
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

async function handleGenerate(agent: TestAgent, args: string[]) {
  const journeyFile = args
    .find((arg) => arg.startsWith("--journey="))
    ?.split("=")[1];
  const appUrl = args.find((arg) => arg.startsWith("--url="))?.split("=")[1];
  const apiSpec = args.find((arg) => arg.startsWith("--api="))?.split("=")[1];
  
  // Parse enhanced options
  const complexity = args.find((arg) => arg.startsWith("--complexity="))?.split("=")[1] as 'basic' | 'intermediate' | 'advanced' || 'intermediate';
  const includeEdgeCases = args.includes("--edge-cases");
  const includeSecurityTests = args.includes("--security");
  const includePerformanceTests = args.includes("--performance");
  const maxTestCases = parseInt(args.find((arg) => arg.startsWith("--max-tests="))?.split("=")[1] || "25");
  
  // Parse test categories
  const categoriesArg = args.find((arg) => arg.startsWith("--categories="))?.split("=")[1];
  const testCategories = categoriesArg ? categoriesArg.split(",") : undefined;

  if (!journeyFile && !appUrl) {
    console.error("Please provide either --journey=<file> or --url=<url>");
    console.log("\nEnhanced options:");
    console.log("  --complexity=basic|intermediate|advanced  (default: intermediate)");
    console.log("  --edge-cases                              Include edge case tests");
    console.log("  --security                                Include security tests");
    console.log("  --performance                             Include performance tests");
    console.log("  --max-tests=N                            Maximum number of tests (default: 25)");
    console.log("  --categories=cat1,cat2                   Focus on specific categories");
    return;
  }

  console.log(`🚀 Enhanced test generation started with complexity: ${complexity}`);
  
  await agent.generateTests({
    journeyFile,
    appUrl,
    apiSpecFile: apiSpec,
    complexity,
    includeEdgeCases,
    includeSecurityTests,
    includePerformanceTests,
    maxTestCases,
    testCategories,
  });
}

async function handleRun(agent: TestAgent, args: string[]) {
  const testDir =
    args.find((arg) => arg.startsWith("--tests="))?.split("=")[1] || "./tests";
  const testType = args
    .find((arg) => arg.startsWith("--type="))
    ?.split("=")[1] as "gui" | "api" | "all";

  await agent.runTests({
    testDirectory: testDir,
    testType: testType || "all",
  });
}

async function handleFullWorkflow(agent: TestAgent, args: string[]) {
  const journeyFile = args
    .find((arg) => arg.startsWith("--journey="))
    ?.split("=")[1];
  const appUrl = args.find((arg) => arg.startsWith("--url="))?.split("=")[1];
  const apiSpec = args.find((arg) => arg.startsWith("--api="))?.split("=")[1];

  if (!journeyFile && !appUrl) {
    console.error("Please provide either --journey=<file> or --url=<url>");
    return;
  }

  // Full workflow: Generate -> Run -> Report
  await agent.executeFullWorkflow({
    journeyFile,
    appUrl,
    apiSpecFile: apiSpec,
  });
}

if (require.main === module) {
  main();
}
