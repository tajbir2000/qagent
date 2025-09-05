// src/prompts/PromptTemplates.ts
export interface PromptContext {
  pageInfo?: any;
  userJourney?: any;
  apiSpec?: any;
  discoveredAPIs?: any[];
  testType: 'gui' | 'api';
  complexity?: 'basic' | 'intermediate' | 'advanced';
  focus?: string[];
}

export class PromptTemplates {
  
  static generateGuiTestPrompt(context: PromptContext): string {
    const { pageInfo, userJourney, complexity = 'intermediate' } = context;
    
    return `You are an expert QA engineer specializing in automated testing. Generate comprehensive GUI test cases using Playwright for the following web application.

## CONTEXT ANALYSIS
${this.formatPageAnalysis(pageInfo)}
${userJourney ? this.formatUserJourneyAnalysis(userJourney) : ''}

## TEST GENERATION REQUIREMENTS

### PRIMARY OBJECTIVES
1. **Functional Coverage**: Test all interactive elements and workflows
2. **User Experience**: Validate user journeys and navigation paths
3. **Error Handling**: Test invalid inputs and edge cases
4. **Cross-Browser Compatibility**: Ensure consistent behavior
5. **Accessibility**: Verify ARIA labels, keyboard navigation, screen reader support

### TEST CASE CATEGORIES TO GENERATE

#### 🎯 CRITICAL TESTS (High Priority)
- User authentication flows (login, logout, password reset)
- Primary user journeys and conversion funnels
- Form submissions with validation
- Payment and checkout processes
- Data creation, modification, deletion

#### 🔧 FUNCTIONAL TESTS (Medium Priority)
- Navigation between pages and sections
- Search functionality and filters
- File uploads and downloads
- Modal dialogs and pop-ups
- Dynamic content loading

#### 🚫 ERROR SCENARIOS (Medium Priority)
- Invalid form submissions
- Network timeouts and failures
- Unauthorized access attempts
- Missing required fields
- Invalid file formats

#### 🎨 UI/UX TESTS (Low Priority)
- Responsive design across viewport sizes
- Theme switching (dark/light mode)
- Animation and transition states
- Loading states and progress indicators

### ADVANCED TEST PATTERNS

#### Data-Driven Testing
- Multiple input combinations for forms
- Boundary value testing (min/max lengths, numbers)
- Special characters and unicode testing
- SQL injection and XSS prevention

#### State Management
- Session persistence across page reloads
- Shopping cart state preservation
- Form data auto-save functionality
- Multi-step wizard navigation

#### Performance Considerations
- Page load time validation
- Image and asset loading verification
- Infinite scroll and pagination
- Real-time updates and WebSocket connections

## OUTPUT FORMAT

Generate a JSON array of test cases with this EXACT structure:

\`\`\`json
[
  {
    "id": "gui-[category]-[sequence]",
    "name": "Clear, descriptive test name",
    "description": "Detailed explanation of what this test validates",
    "category": "authentication|navigation|form|error|accessibility|performance",
    "priority": "critical|high|medium|low",
    "estimatedDuration": "30s|1m|2m|5m",
    "tags": ["smoke", "regression", "user-journey", "edge-case"],
    "prerequisites": ["Any required setup or dependencies"],
    "testData": {
      "inputs": {"field1": "test_value", "field2": "another_value"},
      "expectedOutputs": {"result": "expected_result"}
    },
    "steps": [
      {
        "action": "goto|click|fill|select|hover|wait|screenshot|scroll|press",
        "selector": "CSS selector or text-based locator",
        "value": "Input value if applicable",
        "options": {"timeout": 5000, "force": true},
        "description": "Human-readable step description",
        "waitFor": "networkidle|domcontentloaded|load|element"
      }
    ],
    "assertions": [
      {
        "type": "visible|text|value|url|count|attribute|style|screenshot",
        "selector": "Element selector",
        "expected": "Expected value",
        "description": "What this assertion validates",
        "timeout": 5000,
        "retry": true
      }
    ],
    "cleanup": [
      {
        "action": "click|fill|goto",
        "selector": "cleanup selector",
        "description": "Cleanup action description"
      }
    ]
  }
]
\`\`\`

## QUALITY GUIDELINES

### Selector Best Practices
- Use data-testid attributes when available
- Prefer semantic selectors (role, aria-label)
- Use text-based selectors for user-facing elements
- Include multiple selector strategies as fallbacks

### Step Descriptions
- Use action verbs: "Click login button", "Fill email field"
- Include expected outcomes: "Should display success message"
- Mention wait conditions: "Wait for page to load completely"

### Assertion Strategies
- Always include primary success assertions
- Add defensive assertions for error states
- Verify both positive and negative conditions
- Include accessibility checks where relevant

### Error Recovery
- Add retry mechanisms for flaky elements
- Include alternative paths for failures
- Implement proper cleanup after test failures

${this.getComplexityInstructions(complexity)}

IMPORTANT: Focus on generating ${this.getTestCount(complexity, pageInfo)} high-quality test cases that provide maximum coverage with minimal maintenance overhead. Each test should be independent and executable in any order.`;
  }

  static generateApiTestPrompt(context: PromptContext): string {
    const { apiSpec, discoveredAPIs, userJourney, complexity = 'intermediate' } = context;
    
    return `You are an expert API testing specialist. Generate comprehensive API test cases based on the provided information.

## CONTEXT ANALYSIS
${apiSpec ? this.formatApiSpecAnalysis(apiSpec) : ''}
${discoveredAPIs ? this.formatDiscoveredApisAnalysis(discoveredAPIs) : ''}
${userJourney ? this.formatApiJourneyAnalysis(userJourney) : ''}

## API TEST GENERATION REQUIREMENTS

### PRIMARY OBJECTIVES
1. **Contract Validation**: Ensure API responses match specifications
2. **Data Integrity**: Verify data consistency and validation rules
3. **Security Testing**: Test authentication, authorization, and input sanitization
4. **Performance**: Validate response times and throughput
5. **Error Handling**: Test all error scenarios and edge cases

### TEST CATEGORIES TO GENERATE

#### 🎯 CRITICAL TESTS (High Priority)
- Authentication and authorization flows
- CRUD operations for core business entities
- Data validation and schema compliance
- Transaction and state consistency
- Security boundary tests

#### 🔧 FUNCTIONAL TESTS (Medium Priority)
- Pagination and filtering
- Search and query operations
- File upload and download
- Batch operations
- Webhook and callback handling

#### 🚫 ERROR SCENARIOS (High Priority)
- Invalid authentication credentials
- Malformed request payloads
- Missing required parameters
- Rate limiting and throttling
- Server error simulation

#### ⚡ PERFORMANCE TESTS (Medium Priority)
- Response time validation
- Concurrent request handling
- Large payload processing
- Database query optimization
- Cache behavior verification

### ADVANCED TEST PATTERNS

#### Data-Driven Testing
- Boundary value testing for numeric fields
- String length validation (empty, max length, unicode)
- Date/time format validation
- Enum value validation
- Nested object validation

#### State-Based Testing
- Multi-step workflows (create → read → update → delete)
- Transaction rollback scenarios
- Concurrent modification conflicts
- Session and token expiration
- Database state verification

#### Security Testing
- SQL injection prevention
- XSS and script injection prevention
- Authentication bypass attempts
- Authorization escalation tests
- Data exposure validation

## OUTPUT FORMAT

Generate a JSON array of test cases with this EXACT structure:

\`\`\`json
[
  {
    "id": "api-[category]-[sequence]",
    "name": "Clear, descriptive test name",
    "description": "Detailed explanation of what this test validates",
    "category": "authentication|crud|validation|security|performance|error",
    "priority": "critical|high|medium|low",
    "estimatedDuration": "100ms|500ms|1s|5s",
    "tags": ["smoke", "regression", "security", "performance", "edge-case"],
    "prerequisites": ["Required setup conditions"],
    "dependencies": ["test-id-that-must-run-first"],
    "method": "GET|POST|PUT|PATCH|DELETE",
    "endpoint": "/api/v1/endpoint/{id}",
    "baseUrl": "http://localhost:3000",
    "headers": {
      "Content-Type": "application/json",
      "Authorization": "Bearer {{auth_token}}",
      "X-Custom-Header": "value"
    },
    "queryParams": {
      "page": 1,
      "limit": 10,
      "filter": "active"
    },
    "body": {
      "name": "test_value",
      "email": "test@example.com",
      "nested": {
        "field": "value"
      }
    },
    "expectedStatus": 200,
    "expectedHeaders": {
      "Content-Type": "application/json",
      "X-Rate-Limit-Remaining": "number"
    },
    "assertions": [
      {
        "type": "status|header|body|schema|performance|security",
        "path": "response.data.id",
        "operator": "equals|contains|matches|exists|type|range",
        "expected": "expected_value",
        "description": "What this assertion validates"
      }
    ],
    "dataSetup": {
      "createUser": {
        "endpoint": "/api/users",
        "method": "POST",
        "body": {"name": "Test User"}
      }
    },
    "dataCleanup": {
      "deleteUser": {
        "endpoint": "/api/users/{{created_user_id}}",
        "method": "DELETE"
      }
    },
    "variableExtraction": {
      "user_id": "response.data.id",
      "auth_token": "response.token"
    }
  }
]
\`\`\`

## QUALITY GUIDELINES

### Endpoint Analysis
- Identify all HTTP methods supported
- Understand parameter requirements and types
- Analyze response structure and status codes
- Map authentication and authorization requirements

### Test Data Strategy
- Use realistic but safe test data
- Include boundary values and edge cases
- Test both valid and invalid payloads
- Consider data privacy and GDPR compliance

### Assertion Strategies
- Validate HTTP status codes explicitly
- Check response schema compliance
- Verify business logic constraints
- Test performance thresholds
- Validate security headers and responses

### Error Handling
- Test all documented error scenarios
- Validate error response structure
- Check appropriate HTTP status codes
- Verify error message clarity and security

${this.getApiComplexityInstructions(complexity)}

IMPORTANT: Generate ${this.getApiTestCount(complexity, discoveredAPIs)} comprehensive test cases covering all major API functionalities. Focus on business-critical operations and common failure patterns.`;
  }

  private static formatPageAnalysis(pageInfo: any): string {
    if (!pageInfo) return '';
    
    return `### Web Page Analysis
**URL**: ${pageInfo.url}
**Title**: ${pageInfo.title}
**Interactive Elements**:
- Forms: ${pageInfo.forms?.length || 0}
- Buttons: ${pageInfo.buttons?.length || 0}
- Links: ${pageInfo.links?.length || 0}
- Input Fields: ${pageInfo.inputs?.length || 0}

**Key Elements Detected**:
${this.formatElementsList(pageInfo)}`;
  }

  private static formatElementsList(pageInfo: any): string {
    let elements = '';
    
    if (pageInfo.forms?.length > 0) {
      elements += '\n**Forms**:\n';
      pageInfo.forms.slice(0, 3).forEach((form: any, i: number) => {
        elements += `- Form ${i + 1}: ${form.method || 'GET'} to ${form.action || 'current page'}\n`;
        if (form.inputs) {
          form.inputs.slice(0, 5).forEach((input: any) => {
            elements += `  - ${input.type}: ${input.name || input.id} ${input.required ? '(required)' : ''}\n`;
          });
        }
      });
    }
    
    if (pageInfo.buttons?.length > 0) {
      elements += '\n**Key Buttons**:\n';
      pageInfo.buttons.slice(0, 5).forEach((btn: any) => {
        elements += `- "${btn.text}" (${btn.type || 'button'})\n`;
      });
    }
    
    return elements;
  }

  private static formatUserJourneyAnalysis(userJourney: any): string {
    if (!userJourney) return '';
    
    return `### User Journey Context
**Journey**: ${userJourney.name || 'User Workflow'}
**Steps**: ${userJourney.steps?.length || 0}
**Expected Outcomes**: ${userJourney.expectedOutcomes || 'Not specified'}

**Key User Actions**:
${userJourney.steps?.map((step: any, i: number) => 
  `${i + 1}. ${step.description || step.action}`
).join('\n') || 'No steps defined'}`;
  }

  private static formatApiSpecAnalysis(apiSpec: any): string {
    if (!apiSpec) return '';
    
    return `### API Specification Analysis
**Version**: ${apiSpec.info?.version || 'Unknown'}
**Base URL**: ${apiSpec.servers?.[0]?.url || 'Not specified'}
**Endpoints**: ${Object.keys(apiSpec.paths || {}).length}
**Authentication**: ${this.extractAuthMethods(apiSpec)}`;
  }

  private static formatDiscoveredApisAnalysis(apis: any[]): string {
    if (!apis || apis.length === 0) return '';
    
    const methodCounts = apis.reduce((acc: any, api) => {
      acc[api.method] = (acc[api.method] || 0) + 1;
      return acc;
    }, {});
    
    return `### Discovered API Endpoints
**Total Endpoints**: ${apis.length}
**Methods Distribution**: ${Object.entries(methodCounts).map(([method, count]) => `${method}: ${count}`).join(', ')}
**Sample Endpoints**:
${apis.slice(0, 5).map(api => `- ${api.method} ${api.url}`).join('\n')}`;
  }

  private static formatApiJourneyAnalysis(userJourney: any): string {
    if (!userJourney?.apiEndpoints) return '';
    
    return `### API Journey Analysis
**API Calls in Journey**: ${userJourney.apiEndpoints.length}
**Workflow Steps**:
${userJourney.apiEndpoints.map((endpoint: any, i: number) => 
  `${i + 1}. ${endpoint.method} ${endpoint.path} - ${endpoint.description || 'No description'}`
).join('\n')}`;
  }

  private static extractAuthMethods(apiSpec: any): string {
    const security = apiSpec.components?.securitySchemes;
    if (!security) return 'None specified';
    
    return Object.entries(security).map(([name, scheme]: [string, any]) => 
      `${name} (${scheme.type})`
    ).join(', ');
  }

  private static getComplexityInstructions(complexity: string): string {
    switch (complexity) {
      case 'basic':
        return `\n## BASIC COMPLEXITY MODE
- Focus on smoke tests and critical user paths
- Generate 5-10 essential test cases
- Prioritize high-impact, low-maintenance tests
- Keep assertions simple and reliable`;
      
      case 'advanced':
        return `\n## ADVANCED COMPLEXITY MODE
- Include comprehensive edge cases and error scenarios
- Generate 15-30 detailed test cases
- Add accessibility, performance, and security tests
- Include data-driven and cross-browser variations
- Add visual regression and mobile testing`;
      
      default:
        return `\n## INTERMEDIATE COMPLEXITY MODE
- Balance coverage with maintainability
- Generate 10-20 well-structured test cases
- Include happy paths, error cases, and key edge cases
- Focus on user-facing functionality and business logic`;
    }
  }

  private static getApiComplexityInstructions(complexity: string): string {
    switch (complexity) {
      case 'basic':
        return `\n## BASIC API TESTING MODE
- Focus on CRUD operations and authentication
- Generate 5-15 essential test cases
- Test happy paths and basic error scenarios
- Include basic validation and security tests`;
      
      case 'advanced':
        return `\n## ADVANCED API TESTING MODE
- Include comprehensive security and performance tests
- Generate 20-40 detailed test cases
- Add load testing and stress test scenarios
- Include contract testing and API versioning
- Add integration and end-to-end API workflows`;
      
      default:
        return `\n## INTERMEDIATE API TESTING MODE
- Balance comprehensive coverage with practicality
- Generate 10-25 well-structured test cases
- Include authentication, validation, and error handling
- Focus on business logic and data integrity`;
    }
  }

  private static getTestCount(complexity: string, pageInfo: any): string {
    const baseCount = (pageInfo?.forms?.length || 0) + (pageInfo?.buttons?.length || 0) + 3;
    
    switch (complexity) {
      case 'basic': return `${Math.max(5, Math.min(baseCount, 10))}`;
      case 'advanced': return `${Math.max(15, baseCount * 2)}`;
      default: return `${Math.max(10, Math.ceil(baseCount * 1.5))}`;
    }
  }

  private static getApiTestCount(complexity: string, apis: any[] | undefined): string {
    const baseCount = ((apis && apis.length) || 1) * 2;
    
    switch (complexity) {
      case 'basic': return `${Math.max(5, Math.min(baseCount, 15))}`;
      case 'advanced': return `${Math.max(20, baseCount * 3)}`;
      default: return `${Math.max(10, baseCount * 2)}`;
    }
  }
}