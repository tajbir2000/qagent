// src/quality/TestQualityAnalyzer.ts
import { GuiTestCase } from "../generators/GuiTestGenerator";
import { ApiTestCase } from "../generators/ApiTestGenerator";

export interface QualityScore {
  overall: number; // 0-100
  categories: {
    completeness: number;
    maintainability: number;
    reliability: number;
    coverage: number;
    performance: number;
  };
  issues: QualityIssue[];
  suggestions: string[];
}

export interface QualityIssue {
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  testId: string;
  message: string;
  suggestion: string;
}

export interface CoverageAnalysis {
  functionalCoverage: number;
  errorCoverage: number;
  edgeCaseCoverage: number;
  securityCoverage: number;
  performanceCoverage: number;
  accessibilityCoverage: number;
}

export class TestQualityAnalyzer {
  
  analyzeGuiTestQuality(testCases: GuiTestCase[]): QualityScore {
    const issues: QualityIssue[] = [];
    const suggestions: string[] = [];
    
    // Analyze completeness
    const completeness = this.analyzeGuiCompleteness(testCases, issues);
    
    // Analyze maintainability
    const maintainability = this.analyzeGuiMaintainability(testCases, issues);
    
    // Analyze reliability
    const reliability = this.analyzeGuiReliability(testCases, issues);
    
    // Analyze coverage
    const coverage = this.analyzeGuiCoverage(testCases, issues);
    
    // Analyze performance considerations
    const performance = this.analyzeGuiPerformance(testCases, issues);
    
    // Generate suggestions based on analysis
    this.generateGuiSuggestions(testCases, suggestions, issues);
    
    const categories = {
      completeness,
      maintainability,
      reliability,
      coverage,
      performance
    };
    
    const overall = Object.values(categories).reduce((sum, score) => sum + score, 0) / Object.keys(categories).length;
    
    return {
      overall: Math.round(overall),
      categories,
      issues: this.prioritizeIssues(issues),
      suggestions
    };
  }
  
  analyzeApiTestQuality(testCases: ApiTestCase[]): QualityScore {
    const issues: QualityIssue[] = [];
    const suggestions: string[] = [];
    
    // Analyze completeness
    const completeness = this.analyzeApiCompleteness(testCases, issues);
    
    // Analyze maintainability
    const maintainability = this.analyzeApiMaintainability(testCases, issues);
    
    // Analyze reliability
    const reliability = this.analyzeApiReliability(testCases, issues);
    
    // Analyze coverage
    const coverage = this.analyzeApiCoverage(testCases, issues);
    
    // Analyze performance considerations
    const performance = this.analyzeApiPerformance(testCases, issues);
    
    // Generate suggestions based on analysis
    this.generateApiSuggestions(testCases, suggestions, issues);
    
    const categories = {
      completeness,
      maintainability,
      reliability,
      coverage,
      performance
    };
    
    const overall = Object.values(categories).reduce((sum, score) => sum + score, 0) / Object.keys(categories).length;
    
    return {
      overall: Math.round(overall),
      categories,
      issues: this.prioritizeIssues(issues),
      suggestions
    };
  }
  
  analyzeCoverageGaps(guiTests: GuiTestCase[], apiTests: ApiTestCase[]): CoverageAnalysis {
    const functionalCoverage = this.calculateFunctionalCoverage(guiTests, apiTests);
    const errorCoverage = this.calculateErrorCoverage(guiTests, apiTests);
    const edgeCaseCoverage = this.calculateEdgeCaseCoverage(guiTests, apiTests);
    const securityCoverage = this.calculateSecurityCoverage(guiTests, apiTests);
    const performanceCoverage = this.calculatePerformanceCoverage(guiTests, apiTests);
    const accessibilityCoverage = this.calculateAccessibilityCoverage(guiTests);
    
    return {
      functionalCoverage,
      errorCoverage,
      edgeCaseCoverage,
      securityCoverage,
      performanceCoverage,
      accessibilityCoverage
    };
  }
  
  // GUI Test Quality Analysis Methods
  private analyzeGuiCompleteness(testCases: GuiTestCase[], issues: QualityIssue[]): number {
    let score = 100;
    
    testCases.forEach(test => {
      // Check for missing required fields
      if (!test.description || test.description.length < 10) {
        issues.push({
          severity: 'medium',
          category: 'completeness',
          testId: test.id,
          message: 'Test description is missing or too brief',
          suggestion: 'Add detailed description explaining what this test validates'
        });
        score -= 5;
      }
      
      // Check for missing assertions
      if (!test.assertions || test.assertions.length === 0) {
        issues.push({
          severity: 'high',
          category: 'completeness',
          testId: test.id,
          message: 'Test has no assertions',
          suggestion: 'Add assertions to verify expected behavior'
        });
        score -= 15;
      }
      
      // Check for missing test data
      if (test.steps.some(step => step.action === 'fill') && !test.testData?.inputs) {
        issues.push({
          severity: 'medium',
          category: 'completeness',
          testId: test.id,
          message: 'Test uses form filling but has no test data defined',
          suggestion: 'Define test data inputs for form fields'
        });
        score -= 5;
      }
      
      // Check for missing cleanup
      if (test.category === 'authentication' && (!test.cleanup || test.cleanup.length === 0)) {
        issues.push({
          severity: 'medium',
          category: 'completeness',
          testId: test.id,
          message: 'Authentication test should include cleanup steps',
          suggestion: 'Add logout or session cleanup steps'
        });
        score -= 3;
      }
    });
    
    return Math.max(0, score);
  }
  
  private analyzeGuiMaintainability(testCases: GuiTestCase[], issues: QualityIssue[]): number {
    let score = 100;
    
    testCases.forEach(test => {
      // Check for brittle selectors
      const brittleSelectors = test.steps
        .filter(step => step.selector)
        .map(step => step.selector!)
        .filter(selector => 
          selector.includes('nth-child') || 
          selector.includes('nth-of-type') ||
          selector.match(/.*:\d+.*/) // CSS selectors with indices
        );
      
      if (brittleSelectors.length > 0) {
        issues.push({
          severity: 'high',
          category: 'maintainability',
          testId: test.id,
          message: `Test uses brittle selectors: ${brittleSelectors.join(', ')}`,
          suggestion: 'Use data-testid, aria-labels, or semantic selectors instead'
        });
        score -= 10;
      }
      
      // Check for hardcoded waits
      const hardcodedWaits = test.steps.filter(step => 
        step.action === 'wait' && 
        step.options?.timeout && 
        !step.selector
      );
      
      if (hardcodedWaits.length > 2) {
        issues.push({
          severity: 'medium',
          category: 'maintainability',
          testId: test.id,
          message: 'Test has too many hardcoded waits',
          suggestion: 'Use element-based waits or page load events instead'
        });
        score -= 5;
      }
      
      // Check for missing tags
      if (!test.tags || test.tags.length < 2) {
        issues.push({
          severity: 'low',
          category: 'maintainability',
          testId: test.id,
          message: 'Test has insufficient tags for organization',
          suggestion: 'Add descriptive tags like smoke, regression, feature-name'
        });
        score -= 2;
      }
    });
    
    return Math.max(0, score);
  }
  
  private analyzeGuiReliability(testCases: GuiTestCase[], issues: QualityIssue[]): number {
    let score = 100;
    
    testCases.forEach(test => {
      // Check for missing retry configuration
      const criticalSteps = test.steps.filter(step => 
        ['click', 'fill', 'select'].includes(step.action)
      );
      
      const stepsWithoutRetry = criticalSteps.filter(step => !step.retry);
      if (stepsWithoutRetry.length > criticalSteps.length * 0.5) {
        issues.push({
          severity: 'medium',
          category: 'reliability',
          testId: test.id,
          message: 'Many critical steps lack retry configuration',
          suggestion: 'Add retry: true for click, fill, and select actions'
        });
        score -= 5;
      }
      
      // Check for missing waitFor conditions
      const actionSteps = test.steps.filter(step => 
        ['click', 'goto'].includes(step.action)
      );
      
      const stepsWithoutWait = actionSteps.filter(step => !step.waitFor);
      if (stepsWithoutWait.length > 0) {
        issues.push({
          severity: 'medium',
          category: 'reliability',
          testId: test.id,
          message: 'Navigation and click actions should specify wait conditions',
          suggestion: 'Add waitFor: "networkidle" or "domcontentloaded" to ensure stability'
        });
        score -= 3;
      }
      
      // Check for reasonable timeouts
      const stepsWithLongTimeout = test.steps.filter(step => 
        step.options?.timeout && step.options.timeout > 30000
      );
      
      if (stepsWithLongTimeout.length > 0) {
        issues.push({
          severity: 'low',
          category: 'reliability',
          testId: test.id,
          message: 'Some steps have very long timeouts (>30s)',
          suggestion: 'Review if such long timeouts are necessary'
        });
        score -= 2;
      }
    });
    
    return Math.max(0, score);
  }
  
  private analyzeGuiCoverage(testCases: GuiTestCase[], issues: QualityIssue[]): number {
    const categories = testCases.map(test => test.category);
    const uniqueCategories = new Set(categories);
    
    let score = uniqueCategories.size * 15; // Base score for category diversity
    
    // Check for essential test categories
    const essentialCategories = ['form', 'navigation', 'error'];
    const missingEssential = essentialCategories.filter(cat => !uniqueCategories.has(cat));
    
    if (missingEssential.length > 0) {
      issues.push({
        severity: 'medium',
        category: 'coverage',
        testId: 'suite',
        message: `Missing essential test categories: ${missingEssential.join(', ')}`,
        suggestion: 'Add tests for core user interactions and error scenarios'
      });
      score -= missingEssential.length * 10;
    }
    
    // Check priority distribution
    const priorities = testCases.map(test => test.priority);
    const criticalTests = priorities.filter(p => p === 'critical').length;
    const highTests = priorities.filter(p => p === 'high').length;
    
    if (criticalTests === 0 && highTests < testCases.length * 0.3) {
      issues.push({
        severity: 'medium',
        category: 'coverage',
        testId: 'suite',
        message: 'Test suite lacks high-priority tests',
        suggestion: 'Ensure critical user flows are marked as high or critical priority'
      });
      score -= 15;
    }
    
    return Math.min(100, Math.max(0, score));
  }
  
  private analyzeGuiPerformance(testCases: GuiTestCase[], issues: QualityIssue[]): number {
    let score = 100;
    
    // Check for performance-related tests
    const performanceTests = testCases.filter(test => 
      test.tags.includes('performance') || 
      test.category === 'performance'
    );
    
    if (performanceTests.length === 0 && testCases.length > 5) {
      issues.push({
        severity: 'low',
        category: 'performance',
        testId: 'suite',
        message: 'No performance-focused tests detected',
        suggestion: 'Consider adding tests that validate page load times or UI responsiveness'
      });
      score -= 10;
    }
    
    // Check for screenshot overuse
    const screenshotSteps = testCases.reduce((count, test) => 
      count + test.steps.filter(step => step.action === 'screenshot').length, 0
    );
    
    if (screenshotSteps > testCases.length * 2) {
      issues.push({
        severity: 'low',
        category: 'performance',
        testId: 'suite',
        message: 'Excessive use of screenshots may slow down test execution',
        suggestion: 'Use screenshots selectively for important validations'
      });
      score -= 5;
    }
    
    return Math.max(0, score);
  }
  
  // API Test Quality Analysis Methods
  private analyzeApiCompleteness(testCases: ApiTestCase[], issues: QualityIssue[]): number {
    let score = 100;
    
    testCases.forEach(test => {
      // Check for missing assertions
      if (!test.assertions || test.assertions.length === 0) {
        issues.push({
          severity: 'high',
          category: 'completeness',
          testId: test.id,
          message: 'API test has no assertions',
          suggestion: 'Add assertions to validate response status, headers, and body'
        });
        score -= 15;
      }
      
      // Check for missing status assertion
      if (!test.assertions.some(a => a.type === 'status')) {
        issues.push({
          severity: 'medium',
          category: 'completeness',
          testId: test.id,
          message: 'API test missing status code assertion',
          suggestion: 'Always validate HTTP status code'
        });
        score -= 5;
      }
      
      // Check for POST/PUT without body validation
      if (['POST', 'PUT', 'PATCH'].includes(test.method) && 
          !test.assertions.some(a => a.type === 'body')) {
        issues.push({
          severity: 'medium',
          category: 'completeness',
          testId: test.id,
          message: 'POST/PUT request should validate response body',
          suggestion: 'Add body assertions to verify created/updated data'
        });
        score -= 5;
      }
      
      // Check for missing cleanup on create operations
      if (test.method === 'POST' && test.category === 'crud' && !test.dataCleanup) {
        issues.push({
          severity: 'low',
          category: 'completeness',
          testId: test.id,
          message: 'Create operation should include data cleanup',
          suggestion: 'Add dataCleanup to remove test data after execution'
        });
        score -= 3;
      }
    });
    
    return Math.max(0, score);
  }
  
  private analyzeApiMaintainability(testCases: ApiTestCase[], issues: QualityIssue[]): number {
    let score = 100;
    
    testCases.forEach(test => {
      // Check for hardcoded URLs
      if (test.endpoint.includes('localhost') || test.endpoint.includes('http')) {
        issues.push({
          severity: 'medium',
          category: 'maintainability',
          testId: test.id,
          message: 'Test contains hardcoded URLs',
          suggestion: 'Use baseUrl configuration or environment variables'
        });
        score -= 5;
      }
      
      // Check for hardcoded tokens or credentials
      const authHeaders = Object.entries(test.headers || {}).filter(([key, value]) =>
        key.toLowerCase().includes('auth') && 
        typeof value === 'string' && 
        !value.includes('{{')
      );
      
      if (authHeaders.length > 0) {
        issues.push({
          severity: 'high',
          category: 'maintainability',
          testId: test.id,
          message: 'Test contains hardcoded authentication values',
          suggestion: 'Use variable extraction or environment variables for auth tokens'
        });
        score -= 10;
      }
      
      // Check for reusable test data
      if (test.method === 'POST' && test.body && !test.variableExtraction) {
        issues.push({
          severity: 'low',
          category: 'maintainability',
          testId: test.id,
          message: 'Create operation should extract variables for reuse',
          suggestion: 'Add variableExtraction to capture created resource IDs'
        });
        score -= 2;
      }
    });
    
    return Math.max(0, score);
  }
  
  private analyzeApiReliability(testCases: ApiTestCase[], issues: QualityIssue[]): number {
    let score = 100;
    
    testCases.forEach(test => {
      // Check for appropriate timeout values
      const hasPerformanceAssertion = test.assertions.some(a => a.type === 'performance');
      if (!hasPerformanceAssertion && test.category !== 'performance') {
        // Should have reasonable timeout defaults
        const hasCustomTimeout = test.assertions.some(a => a.timeout && a.timeout > 10000);
        if (hasCustomTimeout) {
          issues.push({
            severity: 'low',
            category: 'reliability',
            testId: test.id,
            message: 'Test has long timeout without performance assertions',
            suggestion: 'Add performance assertions or reduce timeout values'
          });
          score -= 2;
        }
      }
      
      // Check for dependency management
      if (test.dependencies && test.dependencies.length > 0) {
        const hasSetup = test.dataSetup && Object.keys(test.dataSetup).length > 0;
        if (!hasSetup) {
          issues.push({
            severity: 'medium',
            category: 'reliability',
            testId: test.id,
            message: 'Test has dependencies but no data setup',
            suggestion: 'Add dataSetup to create required test data'
          });
          score -= 5;
        }
      }
      
      // Check for error response validation
      if (test.expectedStatus >= 400 && test.assertions.length === 1) {
        issues.push({
          severity: 'low',
          category: 'reliability',
          testId: test.id,
          message: 'Error test should validate error response structure',
          suggestion: 'Add assertions to validate error message format and content'
        });
        score -= 2;
      }
    });
    
    return Math.max(0, score);
  }
  
  private analyzeApiCoverage(testCases: ApiTestCase[], issues: QualityIssue[]): number {
    const methods = testCases.map(test => test.method);
    const uniqueMethods = new Set(methods);
    
    let score = uniqueMethods.size * 20; // Base score for HTTP method diversity
    
    // Check for CRUD coverage
    const crudMethods = ['GET', 'POST', 'PUT', 'DELETE'];
    const missingCrud = crudMethods.filter(method => !uniqueMethods.has(method));
    
    if (missingCrud.length > 0 && testCases.length > 3) {
      issues.push({
        severity: 'medium',
        category: 'coverage',
        testId: 'suite',
        message: `Missing CRUD operations: ${missingCrud.join(', ')}`,
        suggestion: 'Ensure complete CRUD coverage for main resources'
      });
      score -= missingCrud.length * 10;
    }
    
    // Check for error scenario coverage
    const errorTests = testCases.filter(test => test.expectedStatus >= 400);
    if (errorTests.length < testCases.length * 0.2) {
      issues.push({
        severity: 'medium',
        category: 'coverage',
        testId: 'suite',
        message: 'Insufficient error scenario coverage',
        suggestion: 'Add more tests for 4xx and 5xx error conditions'
      });
      score -= 15;
    }
    
    return Math.min(100, Math.max(0, score));
  }
  
  private analyzeApiPerformance(testCases: ApiTestCase[], issues: QualityIssue[]): number {
    let score = 100;
    
    // Check for performance assertions
    const performanceAssertions = testCases.reduce((count, test) =>
      count + test.assertions.filter(a => a.type === 'performance').length, 0
    );
    
    if (performanceAssertions === 0 && testCases.length > 3) {
      issues.push({
        severity: 'low',
        category: 'performance',
        testId: 'suite',
        message: 'No performance assertions found',
        suggestion: 'Add response time validation for critical endpoints'
      });
      score -= 10;
    }
    
    return Math.max(0, score);
  }
  
  // Coverage Analysis Methods
  private calculateFunctionalCoverage(guiTests: GuiTestCase[], apiTests: ApiTestCase[]): number {
    const guiFunctional = guiTests.filter(test => 
      ['form', 'navigation', 'authentication'].includes(test.category)
    );
    const apiFunctional = apiTests.filter(test => 
      ['crud', 'authentication', 'validation'].includes(test.category)
    );
    
    const totalFunctional = guiFunctional.length + apiFunctional.length;
    const totalTests = guiTests.length + apiTests.length;
    
    return totalTests > 0 ? Math.round((totalFunctional / totalTests) * 100) : 0;
  }
  
  private calculateErrorCoverage(guiTests: GuiTestCase[], apiTests: ApiTestCase[]): number {
    const guiError = guiTests.filter(test => test.category === 'error');
    const apiError = apiTests.filter(test => test.expectedStatus >= 400);
    
    const totalError = guiError.length + apiError.length;
    const totalTests = guiTests.length + apiTests.length;
    
    return totalTests > 0 ? Math.round((totalError / totalTests) * 100) : 0;
  }
  
  private calculateEdgeCaseCoverage(guiTests: GuiTestCase[], apiTests: ApiTestCase[]): number {
    const guiEdge = guiTests.filter(test => test.tags.includes('edge-case'));
    const apiEdge = apiTests.filter(test => test.tags.includes('edge-case'));
    
    const totalEdge = guiEdge.length + apiEdge.length;
    const totalTests = guiTests.length + apiTests.length;
    
    return totalTests > 0 ? Math.round((totalEdge / totalTests) * 100) : 0;
  }
  
  private calculateSecurityCoverage(guiTests: GuiTestCase[], apiTests: ApiTestCase[]): number {
    const guiSecurity = guiTests.filter(test => 
      test.tags.includes('security') || test.category === 'security'
    );
    const apiSecurity = apiTests.filter(test => 
      test.tags.includes('security') || test.category === 'security'
    );
    
    const totalSecurity = guiSecurity.length + apiSecurity.length;
    const totalTests = guiTests.length + apiTests.length;
    
    return totalTests > 0 ? Math.round((totalSecurity / totalTests) * 100) : 0;
  }
  
  private calculatePerformanceCoverage(guiTests: GuiTestCase[], apiTests: ApiTestCase[]): number {
    const guiPerformance = guiTests.filter(test => 
      test.tags.includes('performance') || test.category === 'performance'
    );
    const apiPerformance = apiTests.filter(test => 
      test.assertions.some(a => a.type === 'performance')
    );
    
    const totalPerformance = guiPerformance.length + apiPerformance.length;
    const totalTests = guiTests.length + apiTests.length;
    
    return totalTests > 0 ? Math.round((totalPerformance / totalTests) * 100) : 0;
  }
  
  private calculateAccessibilityCoverage(guiTests: GuiTestCase[]): number {
    const accessibilityTests = guiTests.filter(test => 
      test.tags.includes('accessibility') || test.category === 'accessibility'
    );
    
    return guiTests.length > 0 ? Math.round((accessibilityTests.length / guiTests.length) * 100) : 0;
  }
  
  // Utility Methods
  private generateGuiSuggestions(testCases: GuiTestCase[], suggestions: string[], issues: QualityIssue[]): void {
    const criticalIssues = issues.filter(i => i.severity === 'critical' || i.severity === 'high');
    
    if (criticalIssues.length > 0) {
      suggestions.push(`Address ${criticalIssues.length} critical/high priority issues first`);
    }
    
    if (testCases.length < 5) {
      suggestions.push('Consider generating more test cases for better coverage');
    }
    
    const categories = new Set(testCases.map(t => t.category));
    if (!categories.has('accessibility')) {
      suggestions.push('Add accessibility tests using aria-labels and keyboard navigation');
    }
    
    if (!categories.has('error')) {
      suggestions.push('Add error handling tests for invalid inputs and edge cases');
    }
  }
  
  private generateApiSuggestions(testCases: ApiTestCase[], suggestions: string[], issues: QualityIssue[]): void {
    const criticalIssues = issues.filter(i => i.severity === 'critical' || i.severity === 'high');
    
    if (criticalIssues.length > 0) {
      suggestions.push(`Address ${criticalIssues.length} critical/high priority issues first`);
    }
    
    const methods = new Set(testCases.map(t => t.method));
    if (methods.size < 3) {
      suggestions.push('Add tests for more HTTP methods (GET, POST, PUT, DELETE)');
    }
    
    const securityTests = testCases.filter(t => t.category === 'security');
    if (securityTests.length === 0) {
      suggestions.push('Add security tests for input validation and authentication');
    }
    
    const performanceTests = testCases.filter(t => 
      t.assertions.some(a => a.type === 'performance')
    );
    if (performanceTests.length === 0) {
      suggestions.push('Add performance assertions to validate response times');
    }
  }
  
  private prioritizeIssues(issues: QualityIssue[]): QualityIssue[] {
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    
    return issues.sort((a, b) => {
      const severityA = severityOrder[a.severity];
      const severityB = severityOrder[b.severity];
      
      if (severityA !== severityB) {
        return severityA - severityB;
      }
      
      return a.category.localeCompare(b.category);
    });
  }
}