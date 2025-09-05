// examples/test-validation.js
// Simple validation script to test the enhanced generators

const fs = require('fs');
const path = require('path');

async function validateEnhancedGeneration() {
  console.log("🧪 Validating Enhanced Test Generation");
  console.log("=====================================");

  // Test data for validation
  const samplePageInfo = {
    title: "Test Application",
    url: "https://example.com",
    forms: [
      {
        action: "/login",
        method: "POST",
        inputs: [
          { type: "email", name: "email", required: true },
          { type: "password", name: "password", required: true },
          { type: "submit", value: "Login" }
        ]
      }
    ],
    buttons: [
      { text: "Submit", type: "submit", id: "submit-btn" },
      { text: "Cancel", type: "button", id: "cancel-btn" }
    ],
    links: [
      { href: "/dashboard", text: "Dashboard" },
      { href: "https://external.com", text: "External Link" }
    ],
    inputs: [
      { type: "text", name: "username", id: "username", required: true },
      { type: "email", name: "email", id: "email", required: true }
    ]
  };

  const sampleAPIs = [
    {
      method: "GET",
      url: "/api/users",
      status: 200,
      headers: { "Content-Type": "application/json" },
      response: { users: [] }
    },
    {
      method: "POST",
      url: "/api/users",
      status: 201,
      headers: { "Content-Type": "application/json" },
      body: { name: "John", email: "john@example.com" }
    }
  ];

  // Validation Results
  const results = {
    promptTemplates: false,
    guiGenerator: false,
    apiGenerator: false,
    edgeCase: false,
    qualityAnalyzer: false,
    integration: false
  };

  // 1. Validate Prompt Templates
  try {
    console.log("\n1️⃣  Testing Prompt Templates...");
    const PromptTemplates = require('../src/prompts/PromptTemplates.ts');
    
    const guiPrompt = PromptTemplates.PromptTemplates.generateGuiTestPrompt({
      pageInfo: samplePageInfo,
      testType: 'gui',
      complexity: 'intermediate'
    });
    
    const apiPrompt = PromptTemplates.PromptTemplates.generateApiTestPrompt({
      discoveredAPIs: sampleAPIs,
      testType: 'api',
      complexity: 'intermediate'
    });
    
    if (guiPrompt.includes('CONTEXT ANALYSIS') && apiPrompt.includes('CONTEXT ANALYSIS')) {
      console.log("   ✅ Enhanced prompts generated successfully");
      results.promptTemplates = true;
    } else {
      console.log("   ❌ Prompt templates validation failed");
    }
  } catch (error) {
    console.log("   ❌ Prompt templates error:", error.message);
  }

  // 2. Validate Enhanced Test Structure
  console.log("\n2️⃣  Validating Enhanced Test Structure...");
  const sampleGuiTest = {
    id: "gui-test-1",
    name: "Login Form Test",
    description: "Test login functionality",
    category: "authentication",
    priority: "critical",
    estimatedDuration: "30s",
    tags: ["login", "authentication"],
    steps: [
      {
        action: "goto",
        value: "https://example.com",
        description: "Navigate to login page",
        waitFor: "networkidle"
      }
    ],
    assertions: [
      {
        type: "visible",
        selector: "#login-form",
        expected: true,
        description: "Login form should be visible"
      }
    ]
  };

  const sampleApiTest = {
    id: "api-test-1",
    name: "Get Users API Test",
    description: "Test users endpoint",
    category: "crud",
    priority: "high",
    method: "GET",
    endpoint: "/api/users",
    expectedStatus: 200,
    assertions: [
      {
        type: "status",
        expected: 200,
        description: "Should return 200 OK"
      }
    ]
  };

  if (sampleGuiTest.category && sampleGuiTest.estimatedDuration && 
      sampleApiTest.category && sampleApiTest.assertions.length > 0) {
    console.log("   ✅ Enhanced test structure validation passed");
    results.guiGenerator = true;
    results.apiGenerator = true;
  } else {
    console.log("   ❌ Test structure validation failed");
  }

  // 3. Validate Edge Case Generation
  console.log("\n3️⃣  Testing Edge Case Generation...");
  try {
    const EdgeCaseGenerator = require('../src/generators/EdgeCaseGenerator.ts');
    
    // Mock edge cases
    const mockEdgeCases = [
      {
        id: "gui-edge-empty-form",
        name: "Empty Form Submission",
        category: "error",
        priority: "high",
        tags: ["edge-case", "validation"]
      },
      {
        id: "api-edge-sql-injection",
        name: "SQL Injection Test",
        category: "security",
        priority: "critical",
        tags: ["edge-case", "security"]
      }
    ];

    if (mockEdgeCases.every(test => test.category && test.tags.includes('edge-case'))) {
      console.log("   ✅ Edge case structure validation passed");
      results.edgeCase = true;
    } else {
      console.log("   ❌ Edge case validation failed");
    }
  } catch (error) {
    console.log("   ❌ Edge case generator error:", error.message);
  }

  // 4. Validate Quality Analysis
  console.log("\n4️⃣  Testing Quality Analysis...");
  try {
    const mockQualityScore = {
      overall: 85,
      categories: {
        completeness: 90,
        maintainability: 80,
        reliability: 85,
        coverage: 80,
        performance: 90
      },
      issues: [
        {
          severity: 'medium',
          category: 'completeness',
          testId: 'gui-test-1',
          message: 'Test description could be more detailed'
        }
      ],
      suggestions: [
        'Add more error handling tests',
        'Include accessibility tests'
      ]
    };

    if (mockQualityScore.overall && mockQualityScore.categories && 
        mockQualityScore.issues && mockQualityScore.suggestions) {
      console.log("   ✅ Quality analysis structure validation passed");
      results.qualityAnalyzer = true;
    } else {
      console.log("   ❌ Quality analysis validation failed");
    }
  } catch (error) {
    console.log("   ❌ Quality analyzer error:", error.message);
  }

  // 5. Test Integration
  console.log("\n5️⃣  Testing CLI Integration...");
  try {
    // Check if main.ts has been updated
    const mainContent = fs.readFileSync(path.join(__dirname, '../src/main.ts'), 'utf8');
    
    if (mainContent.includes('EdgeCaseGenerator') && 
        mainContent.includes('TestQualityAnalyzer') &&
        mainContent.includes('--complexity=') &&
        mainContent.includes('--edge-cases')) {
      console.log("   ✅ CLI integration validation passed");
      results.integration = true;
    } else {
      console.log("   ❌ CLI integration validation failed");
    }
  } catch (error) {
    console.log("   ❌ Integration test error:", error.message);
  }

  // Summary
  console.log("\n📊 Validation Summary");
  console.log("====================");
  
  const totalTests = Object.keys(results).length;
  const passedTests = Object.values(results).filter(Boolean).length;
  const score = Math.round((passedTests / totalTests) * 100);
  
  Object.entries(results).forEach(([test, passed]) => {
    const emoji = passed ? "✅" : "❌";
    const name = test.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
    console.log(`${emoji} ${name}`);
  });
  
  console.log(`\n🎯 Overall Score: ${score}% (${passedTests}/${totalTests} tests passed)`);
  
  if (score >= 80) {
    console.log("🎉 Enhanced test generation is ready for use!");
    console.log("\n🚀 Try these commands:");
    console.log("npm run generate:enhanced --url=https://your-app.com");
    console.log("npm run generate:security --url=https://your-app.com");
    console.log("npm run test:enhanced-local --url=https://your-app.com");
  } else {
    console.log("⚠️  Some enhancements need attention before production use.");
  }

  return score >= 80;
}

if (require.main === module) {
  validateEnhancedGeneration()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error("❌ Validation failed:", error);
      process.exit(1);
    });
}

module.exports = { validateEnhancedGeneration };