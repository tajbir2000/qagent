// src/main.ts
import dotenv from "dotenv";
import { TestAgent } from "./core/TestAgent";
import { ApiTestGenerator } from "./generators/ApiTestGenerator";
import { GuiTestGenerator } from "./generators/GuiTestGenerator";
import { LocalLLMProvider } from "./llm/LocalLLMProvider";
import { OpenAIProvider } from "./llm/OpenAIProvider";
import { JourneyParser } from "./parsers/JourneyParser";
import { ReportGenerator } from "./reporting/ReportGenerator";
import { TestRunner } from "./runners/TestRunner";

dotenv.config();

async function main() {
  try {
    // Initialize LLM provider (local or cloud)
    const llmProvider =
      process.env.USE_LOCAL_LLM === "true"
        ? new LocalLLMProvider({
            modelPath:
              process.env.LOCAL_MODEL_PATH || "./models/codellama-7b.gguf",
            temperature: 0.1,
          })
        : new OpenAIProvider({
            apiKey: process.env.OPENAI_API_KEY!,
            model: process.env.OPENAI_MODEL || "gpt-4",
          });

    // Initialize components
    const journeyParser = new JourneyParser(llmProvider);
    const guiGenerator = new GuiTestGenerator(llmProvider);
    const apiGenerator = new ApiTestGenerator(llmProvider);
    const testRunner = new TestRunner();
    const reportGenerator = new ReportGenerator();

    // Initialize main agent
    const agent = new TestAgent({
      llmProvider,
      journeyParser,
      guiGenerator,
      apiGenerator,
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

  if (!journeyFile && !appUrl) {
    console.error("Please provide either --journey=<file> or --url=<url>");
    return;
  }

  await agent.generateTests({
    journeyFile,
    appUrl,
    apiSpecFile: apiSpec,
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
