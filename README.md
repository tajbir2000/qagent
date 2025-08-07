# AutoQAgent - Automated Testing Framework 🤖

AutoQAgent is an intelligent automated testing framework that generates and executes both GUI and API test cases using Large Language Models (LLM). It can work with local LLMs or cloud-based services to create comprehensive test suites from user journeys, API specifications, or by auto-discovering application endpoints.

## ✨ Features

- **🖥️ GUI Test Generation**: Automatically generates Playwright-based UI tests
- **🌐 API Test Generation**: Creates comprehensive API test suites
- **🧠 LLM-Powered**: Uses AI to understand user journeys and generate intelligent test cases
- **🏠 Local LLM Support**: Works with local models (Ollama, llama.cpp) for privacy
- **☁️ Cloud LLM Support**: Integrates with OpenAI GPT models
- **📊 Rich Reporting**: Generates HTML, JSON, and JUnit reports with charts and screenshots
- **🔍 Auto-Discovery**: Automatically discovers API endpoints by analyzing web applications
- **📖 Multiple Input Formats**: Supports JSON, Markdown, YAML user journey files
- **⚡ Parallel Execution**: Runs tests in parallel for faster results
- **📸 Screenshot Capture**: Automatically captures screenshots during GUI testing

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

1. **Clone or create the project:**

```bash
mkdir autoqagent
cd autoqagent
npm init -y
```

2. **Install dependencies:**

```bash
npm install openai playwright dotenv
npm install -D ts-node typescript
```

3. **Install Playwright browsers:**

```bash
npx playwright install
```

4. **Set up configuration:**

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# For OpenAI (cloud LLM)
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4

# For local LLM (using Ollama)
USE_LOCAL_LLM=false
LOCAL_MODEL_PATH=codellama:7b

# Test configuration
DEFAULT_TIMEOUT=30000
HEADLESS_MODE=true
```

### Local LLM Setup (Optional)

If you want to use local LLMs for privacy/cost reasons:

**Option 1: Using Ollama (Recommended)**

```bash
# Install Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# Download a code-capable model
ollama pull codellama:7b
# or for better performance (requires more RAM):
ollama pull codellama:13b
```

**Option 2: Using llama.cpp**

```bash
# Download llama.cpp
git clone https://github.com/ggerganov/llama.cpp
cd llama.cpp && make

# Download a model (example)
wget https://huggingface.co/TheBloke/CodeLlama-7B-Instruct-GGUF/resolve/main/codellama-7b-instruct.q4_0.gguf
```

## 📖 Usage

### 1. Generate Tests from User Journey

Create a user journey file (see `examples/user-journey.json`):

```bash
# Generate tests from JSON journey file
npm run generate:from-journey

# Or specify custom file
npm run generate -- --journey=my-journey.json --url=https://myapp.com
```

### 2. Generate Tests by URL Analysis

Let AutoQAgent analyze your application:

```bash
# Auto-discover and generate tests
npm run generate:from-url

# Or specify custom URL
npm run generate -- --url=https://example.com --api=api-spec.json
```

### 3. Run Tests

```bash
# Run all tests
npm run test

# Run only GUI tests
npm run test:gui

# Run only API tests
npm run test:api

# Custom test run
npm run run-tests -- --tests=./tests --type=all
```

### 4. Full Workflow (Generate + Run + Report)

```bash
# Complete workflow
npm run full-test

# With custom parameters
npm run full -- --journey=examples/user-journey.json --url=https://myapp.com
```

## 📁 File Structure

```
autoqagent/
├── src/
│   ├── main.ts              # Main entry point
│   ├── core/
│   │   └── TestAgent.ts     # Core orchestration logic
│   ├── llm/
│   │   ├── LLMProvider.ts   # LLM interface
│   │   ├── OpenAIProvider.ts # OpenAI implementation
│   │   └── LocalLLMProvider.ts # Local LLM implementation
│   ├── parsers/
│   │   └── JourneyParser.ts # User journey parser
│   ├── generators/
│   │   ├── GuiTestGenerator.ts # GUI test generation
│   │   └── ApiTestGenerator.ts # API test generation
│   ├── runners/
│   │   └── TestRunner.ts    # Test execution engine
│   └── reporting/
│       └── ReportGenerator.ts # Report generation
├── tests/
│   ├── gui/                 # Generated GUI tests
│   └── api/                 # Generated API tests
├── reports/                 # Test reports
├── examples/                # Example user journeys and API specs
└── README.md
```

## 📋 User Journey Format

### JSON Format

```json
{
  "id": "checkout-flow",
  "title": "E-commerce Checkout",
  "description": "Complete checkout process",
  "steps": [
    {
      "id": "step-1",
      "action": "Navigate to product page",
      "element": "product-link",
      "expected": "Product details displayed",
      "apiCalls": ["GET /api/products/{id}"]
    }
  ],
  "apiEndpoints": [
    {
      "method": "GET",
      "path": "/api/products/{id}",
      "description": "Get product details"
    }
  ]
}
```

### Markdown Format

```markdown
# User Journey: Login Flow

## Steps

### 1. Landing Page

- **Action**: User visits homepage
- **Expected**: Login form is visible
- **API**: `GET /api/status`

### 2. Login

- **Action**: Submit login form
- **Input**: email, password
- **Expected**: Redirect to dashboard
- **API**: `POST /api/auth/login`
```

## 🧪 Test Generation Features

### GUI Tests

- **Form Testing**: Validation, submission, error handling
- **Navigation Testing**: Links, buttons, page transitions
- **Interactive Elements**: Dropdowns, modals, drag-and-drop
- **Responsive Design**: Mobile, tablet, desktop viewports
- **Accessibility**: Keyboard navigation, screen reader support
- **Visual Testing**: Screenshot comparison, layout verification
- **Performance**: Page load times, interaction responsiveness

### API Tests

- **CRUD Operations**: Create, Read, Update, Delete testing
- **Authentication**: Login, token validation, permissions
- **Error Handling**: 4xx, 5xx status codes, malformed requests
- **Data Validation**: Schema validation, boundary testing
- **Performance**: Response time, load testing
- **Security**: SQL injection, XSS, authorization bypass
- **Edge Cases**: Empty payloads, large datasets, special characters

## 📊 Reports

AutoQAgent generates comprehensive reports in multiple formats:

### HTML Report Features

- **Interactive Dashboard**: Visual charts and metrics
- **Test Details**: Expandable test results with logs
- **Screenshot Gallery**: Visual evidence of test execution
- **Failure Analysis**: Grouped error analysis
- **Performance Metrics**: Response times and execution duration
- **Filter/Search**: Easy navigation through results

### Report Formats

- **HTML**: Rich interactive dashboard
- **JSON**: Machine-readable results for CI/CD
- **JUnit XML**: Integration with Jenkins, Azure DevOps, etc.

## 🔧 Configuration Options

### Environment Variables

```env
# LLM Configuration
USE_LOCAL_LLM=false
OPENAI_API_KEY=your_key_here
OPENAI_MODEL=gpt-4
LOCAL_MODEL_PATH=codellama:7b

# Test Configuration
DEFAULT_TIMEOUT=30000
HEADLESS_MODE=true
PARALLEL_EXECUTION=true
MAX_RETRIES=3

# Report Configuration
REPORT_FORMAT=all
INCLUDE_SCREENSHOTS=true
OUTPUT_PATH=./reports
```

### Command Line Options

```bash
# Generate tests
npm run generate -- \
  --journey=path/to/journey.json \
  --url=https://app.com \
  --api=path/to/api-spec.json

# Run tests
npm run run-tests -- \
  --tests=./tests \
  --type=all \
  --parallel=true \
  --timeout=60000 \
  --retries=2

# Full workflow
npm run full -- \
  --journey=journey.json \
  --url=https://app.com \
  --headless=false
```

## 🤖 LLM Integration

### Supported LLM Providers

#### Cloud LLMs

- **OpenAI**: GPT-4, GPT-3.5-turbo
- **Anthropic Claude**: (can be added via API)
- **Google PaLM**: (extensible architecture)

#### Local LLMs

- **Ollama**: Easy local deployment
  ```bash
  ollama pull codellama:7b
  ollama pull mistral:7b
  ollama pull llama2:13b
  ```
- **llama.cpp**: Direct model execution
- **Hugging Face Transformers**: (can be integrated)

### LLM Selection Guidelines

**For Code Generation (Test Creation):**

- **Best**: GPT-4, Claude-3, CodeLlama-13B+
- **Good**: GPT-3.5-turbo, CodeLlama-7B
- **Budget**: Mistral-7B, local models

**For Analysis (Journey Parsing):**

- **Best**: GPT-4, Claude-3
- **Good**: GPT-3.5-turbo, Llama2-13B
- **Budget**: Local models with smaller context

## 🚀 CI/CD Integration

### GitHub Actions Example

```yaml
name: AutoQAgent Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: "18"

      - name: Install dependencies
        run: |
          npm install
          npx playwright install

      - name: Run AutoQAgent
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
        run: |
          npm run full -- --url=${{ github.event.repository.html_url }}

      - name: Upload reports
        uses: actions/upload-artifact@v3
        with:
          name: test-reports
          path: reports/
```

### Jenkins Pipeline Example

```groovy
pipeline {
    agent any
    environment {
        OPENAI_API_KEY = credentials('openai-api-key')
    }
    stages {
        stage('Setup') {
            steps {
                sh 'npm install'
                sh 'npx playwright install'
            }
        }
        stage('Generate & Run Tests') {
            steps {
                sh 'npm run full -- --url=${BUILD_URL}'
            }
        }
        stage('Publish Results') {
            steps {
                publishHTML([
                    allowMissing: false,
                    alwaysLinkToLastBuild: true,
                    keepAll: true,
                    reportDir: 'reports',
                    reportFiles: 'test-report.html',
                    reportName: 'AutoQAgent Report'
                ])
                junit 'reports/junit-report.xml'
            }
        }
    }
}
```

## 📈 Advanced Usage

### Custom Test Scenarios

```typescript
// Custom test generator
import { GuiTestGenerator } from "./src/generators/GuiTestGenerator";

const generator = new GuiTestGenerator(llmProvider);
const customTests = await generator.generateTests({
  appUrl: "https://myapp.com",
  customScenarios: [
    {
      name: "Performance Test",
      actions: ["navigate", "measure-load-time"],
      assertions: ["load-time < 2s", "no-js-errors"],
    },
  ],
});
```

### API Test Customization

```typescript
// Custom API test with authentication
const apiTests = await apiGenerator.generateTests({
  specFile: "api-spec.json",
  authentication: {
    type: "bearer",
    token: process.env.API_TOKEN,
  },
  customValidation: {
    schema: "strict",
    performance: { threshold: 500 },
  },
});
```

## 🐛 Troubleshooting

### Common Issues

#### 1. Browser Launch Failures

```bash
# Install required dependencies
sudo apt-get install -y \
    libnss3 libnspr4 libatk-bridge2.0-0 \
    libdrm2 libxkbcommon0 libxcomposite1 \
    libxdamage1 libxrandr2 libgbm1 \
    libxss1 libasound2
```

#### 2. Local LLM Connection Issues

```bash
# Check Ollama service
ollama ps
ollama serve

# Verify model availability
ollama list
```

#### 3. Memory Issues with Large Models

```bash
# Use smaller models for limited memory
USE_LOCAL_LLM=true
LOCAL_MODEL_PATH=codellama:7b  # instead of 13b/34b
```

#### 4. API Rate Limits

```env
# Add delays between requests
API_RATE_LIMIT_DELAY=1000
MAX_CONCURRENT_TESTS=5
```

### Debug Mode

```bash
# Enable detailed logging
DEBUG=autoqagent:* npm run full

# Save debug logs
npm run full 2>&1 | tee debug.log
```

## 🤝 Contributing

We welcome contributions! Here's how to get started:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Make your changes**
4. **Add tests**: Ensure your changes are tested
5. **Commit**: `git commit -m 'Add amazing feature'`
6. **Push**: `git push origin feature/amazing-feature`
7. **Create Pull Request**

### Development Setup

```bash
git clone https://github.com/yourusername/autoqagent
cd autoqagent
npm install
npm run dev  # Start in watch mode
```

## 📝 Roadmap

### Upcoming Features

- [ ] **Visual Testing**: Screenshot comparison, visual regression
- [ ] **Mobile Testing**: Native app testing with Appium
- [ ] **Load Testing**: Performance testing with artillery/k6
- [ ] **Database Testing**: SQL query validation, data integrity
- [ ] **Security Testing**: OWASP top 10, vulnerability scanning
- [ ] **Cross-browser Testing**: Safari, Firefox, Edge support
- [ ] **AI Test Maintenance**: Self-healing tests with LLM
- [ ] **Natural Language Tests**: Write tests in plain English

### Integration Targets

- [ ] **Jira/Azure DevOps**: Test case synchronization
- [ ] **Slack/Teams**: Real-time notifications
- [ ] **Grafana/DataDog**: Performance monitoring
- [ ] **Docker**: Containerized test execution
- [ ] **Kubernetes**: Distributed test execution

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: [Wiki](https://github.com/yourusername/autoqagent/wiki)
- **Issues**: [GitHub Issues](https://github.com/yourusername/autoqagent/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/autoqagent/discussions)
- **Email**: autoqagent@example.com

## 🙏 Acknowledgments

- **Playwright Team**: For the excellent browser automation framework
- **OpenAI**: For GPT models that power intelligent test generation
- **Ollama Project**: For making local LLMs accessible
- **Open Source Community**: For inspiration and contributions

---

**Made with ❤️ by the AutoQAgent Team**

_Transform your testing workflow with AI-powered automation!_

You are a QA engineer.

Given a user flow, create a detailed UI test plan with validations, edge cases, expected outputs.
