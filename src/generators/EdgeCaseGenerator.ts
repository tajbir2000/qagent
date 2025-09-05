// src/generators/EdgeCaseGenerator.ts
import { GuiTestCase, PlaywrightStep, Assertion } from "./GuiTestGenerator";
import { ApiTestCase, ApiAssertion } from "./ApiTestGenerator";

export interface EdgeCaseConfig {
  includeSecurityTests: boolean;
  includeBoundaryTests: boolean;
  includeDataValidationTests: boolean;
  includePerformanceEdgeCases: boolean;
  includeAccessibilityTests: boolean;
  maxEdgeCases: number;
}

export interface FormField {
  name: string;
  type: string;
  required: boolean;
  maxLength?: number;
  minLength?: number;
  pattern?: string;
}

export class EdgeCaseGenerator {
  
  generateGuiEdgeCases(
    baseTests: GuiTestCase[], 
    pageInfo: any, 
    config: EdgeCaseConfig
  ): GuiTestCase[] {
    const edgeCases: GuiTestCase[] = [];
    
    // Generate form validation edge cases
    if (pageInfo.forms && pageInfo.forms.length > 0) {
      edgeCases.push(...this.generateFormEdgeCases(pageInfo.forms, config));
    }
    
    // Generate input field edge cases
    if (pageInfo.inputs && pageInfo.inputs.length > 0) {
      edgeCases.push(...this.generateInputEdgeCases(pageInfo.inputs, config));
    }
    
    // Generate navigation edge cases
    if (pageInfo.links && pageInfo.links.length > 0) {
      edgeCases.push(...this.generateNavigationEdgeCases(pageInfo.links, config));
    }
    
    // Generate accessibility edge cases
    if (config.includeAccessibilityTests) {
      edgeCases.push(...this.generateAccessibilityEdgeCases(pageInfo));
    }
    
    // Generate security edge cases
    if (config.includeSecurityTests) {
      edgeCases.push(...this.generateSecurityEdgeCases(pageInfo));
    }
    
    // Generate performance edge cases
    if (config.includePerformanceEdgeCases) {
      edgeCases.push(...this.generatePerformanceEdgeCases(pageInfo));
    }
    
    return edgeCases.slice(0, config.maxEdgeCases);
  }
  
  generateApiEdgeCases(
    baseTests: ApiTestCase[], 
    discoveredAPIs: any[], 
    config: EdgeCaseConfig
  ): ApiTestCase[] {
    const edgeCases: ApiTestCase[] = [];
    
    // Generate boundary value tests
    if (config.includeBoundaryTests) {
      edgeCases.push(...this.generateApiBoundaryTests(discoveredAPIs));
    }
    
    // Generate security tests
    if (config.includeSecurityTests) {
      edgeCases.push(...this.generateApiSecurityTests(discoveredAPIs));
    }
    
    // Generate data validation tests
    if (config.includeDataValidationTests) {
      edgeCases.push(...this.generateApiValidationTests(discoveredAPIs));
    }
    
    // Generate performance edge cases
    if (config.includePerformanceEdgeCases) {
      edgeCases.push(...this.generateApiPerformanceTests(discoveredAPIs));
    }
    
    return edgeCases.slice(0, config.maxEdgeCases);
  }
  
  // GUI Edge Case Generation Methods
  private generateFormEdgeCases(forms: any[], config: EdgeCaseConfig): GuiTestCase[] {
    const edgeCases: GuiTestCase[] = [];
    
    forms.forEach((form, formIndex) => {
      if (!form.inputs || form.inputs.length === 0) return;
      
      // Empty form submission
      edgeCases.push({
        id: `gui-edge-empty-form-${formIndex}`,
        name: `Empty Form Submission - Form ${formIndex + 1}`,
        description: 'Test form validation when submitting empty form',
        category: 'error',
        priority: 'high',
        estimatedDuration: '30s',
        tags: ['edge-case', 'validation', 'error'],
        steps: [
          {
            action: 'goto',
            value: '', // Will be filled by the generator
            description: 'Navigate to the page',
            waitFor: 'networkidle'
          },
          {
            action: 'click',
            selector: 'input[type="submit"], button[type="submit"]',
            description: 'Submit empty form',
            options: { timeout: 5000 }
          },
          {
            action: 'wait',
            options: { timeout: 2000 },
            description: 'Wait for validation messages'
          }
        ],
        assertions: [
          {
            type: 'visible',
            selector: '.error, .invalid, [aria-invalid="true"]',
            expected: true,
            description: 'Validation errors should be displayed',
            retry: true
          }
        ]
      });
      
      // Required field validation
      const requiredFields = form.inputs.filter((input: any) => input.required);
      if (requiredFields.length > 0) {
        edgeCases.push({
          id: `gui-edge-required-fields-${formIndex}`,
          name: `Required Field Validation - Form ${formIndex + 1}`,
          description: 'Test validation for required fields',
          category: 'validation',
          priority: 'high',
          estimatedDuration: '45s',
          tags: ['edge-case', 'validation', 'required'],
          steps: [
            {
              action: 'goto',
              value: '',
              description: 'Navigate to the page',
              waitFor: 'networkidle'
            },
            ...this.generatePartialFormFillSteps(form.inputs, requiredFields),
            {
              action: 'click',
              selector: 'input[type="submit"], button[type="submit"]',
              description: 'Submit form with missing required fields',
              options: { timeout: 5000 }
            }
          ],
          assertions: [
            {
              type: 'visible',
              selector: '.error, .required, [aria-invalid="true"]',
              expected: true,
              description: 'Required field validation should be displayed'
            }
          ]
        });
      }
    });
    
    return edgeCases;
  }
  
  private generateInputEdgeCases(inputs: any[], config: EdgeCaseConfig): GuiTestCase[] {
    const edgeCases: GuiTestCase[] = [];
    
    inputs.forEach((input, index) => {
      const selector = input.id ? `#${input.id}` : `input[name="${input.name}"]`;
      
      // Text input boundary tests
      if (['text', 'email', 'password'].includes(input.type)) {
        // Maximum length test
        edgeCases.push({
          id: `gui-edge-max-length-${index}`,
          name: `Maximum Length Test - ${input.name || input.id}`,
          description: `Test maximum length validation for ${input.name || input.id} field`,
          category: 'validation',
          priority: 'medium',
          estimatedDuration: '20s',
          tags: ['edge-case', 'boundary', 'validation'],
          steps: [
            {
              action: 'goto',
              value: '',
              description: 'Navigate to the page',
              waitFor: 'networkidle'
            },
            {
              action: 'fill',
              selector,
              value: 'A'.repeat(1000), // Very long string
              description: 'Fill field with very long text',
              options: { timeout: 5000 }
            },
            {
              action: 'press',
              selector,
              value: 'Tab',
              description: 'Move focus to trigger validation'
            }
          ],
          assertions: [
            {
              type: 'value',
              selector,
              expected: 'A'.repeat(Math.min(1000, 255)), // Assume max 255 chars
              description: 'Field should truncate or validate long input',
              operator: 'contains'
            }
          ]
        });
        
        // Special characters test
        const specialChars = '<script>alert("xss")</script>';
        edgeCases.push({
          id: `gui-edge-special-chars-${index}`,
          name: `Special Characters Test - ${input.name || input.id}`,
          description: `Test special character handling for ${input.name || input.id} field`,
          category: 'security',
          priority: 'high',
          estimatedDuration: '25s',
          tags: ['edge-case', 'security', 'xss'],
          steps: [
            {
              action: 'goto',
              value: '',
              description: 'Navigate to the page',
              waitFor: 'networkidle'
            },
            {
              action: 'fill',
              selector,
              value: specialChars,
              description: 'Fill field with special characters',
              options: { timeout: 5000 }
            },
            {
              action: 'press',
              selector,
              value: 'Tab',
              description: 'Move focus to trigger validation'
            }
          ],
          assertions: [
            {
              type: 'value',
              selector,
              expected: specialChars,
              description: 'Field should safely handle special characters',
              operator: 'equals'
            }
          ]
        });
      }
      
      // Email specific tests
      if (input.type === 'email') {
        const invalidEmails = [
          'invalid-email',
          '@domain.com',
          'user@',
          'user..name@domain.com',
          'user@domain',
          'user name@domain.com'
        ];
        
        invalidEmails.forEach((email, emailIndex) => {
          edgeCases.push({
            id: `gui-edge-invalid-email-${index}-${emailIndex}`,
            name: `Invalid Email Test - ${email}`,
            description: `Test email validation with invalid format: ${email}`,
            category: 'validation',
            priority: 'medium',
            estimatedDuration: '15s',
            tags: ['edge-case', 'validation', 'email'],
            steps: [
              {
                action: 'goto',
                value: '',
                description: 'Navigate to the page',
                waitFor: 'networkidle'
              },
              {
                action: 'fill',
                selector,
                value: email,
                description: `Fill email field with invalid format: ${email}`,
                options: { timeout: 5000 }
              },
              {
                action: 'press',
                selector,
                value: 'Tab',
                description: 'Move focus to trigger validation'
              }
            ],
            assertions: [
              {
                type: 'attribute',
                selector,
                expected: 'true',
                description: 'Field should be marked as invalid',
                operator: 'equals'
              }
            ]
          });
        });
      }
    });
    
    return edgeCases;
  }
  
  private generateNavigationEdgeCases(links: any[], config: EdgeCaseConfig): GuiTestCase[] {
    const edgeCases: GuiTestCase[] = [];
    
    // Broken link test
    edgeCases.push({
      id: 'gui-edge-broken-link',
      name: 'Broken Link Handling',
      description: 'Test application behavior with broken links',
      category: 'error',
      priority: 'medium',
      estimatedDuration: '30s',
      tags: ['edge-case', 'navigation', 'error'],
      steps: [
        {
          action: 'goto',
          value: '',
          description: 'Navigate to the page',
          waitFor: 'networkidle'
        },
        {
          action: 'click',
          selector: 'a[href="/non-existent-page"]',
          description: 'Click on broken link',
          options: { timeout: 10000 }
        }
      ],
      assertions: [
        {
          type: 'text',
          selector: 'h1, .error, .not-found',
          expected: '404',
          description: 'Should display 404 or error page',
          operator: 'contains'
        }
      ]
    });
    
    // External link test
    const externalLinks = links.filter((link: any) => 
      link.href && (link.href.startsWith('http') && !link.href.includes(window.location?.hostname || 'localhost'))
    );
    
    if (externalLinks.length > 0) {
      edgeCases.push({
        id: 'gui-edge-external-link',
        name: 'External Link Handling',
        description: 'Test external link behavior (should open in new tab)',
        category: 'navigation',
        priority: 'low',
        estimatedDuration: '20s',
        tags: ['edge-case', 'navigation', 'external'],
        steps: [
          {
            action: 'goto',
            value: '',
            description: 'Navigate to the page',
            waitFor: 'networkidle'
          },
          {
            action: 'click',
            selector: `a[href="${externalLinks[0].href}"]`,
            description: 'Click on external link',
            options: { timeout: 5000 }
          }
        ],
        assertions: [
          {
            type: 'attribute',
            selector: `a[href="${externalLinks[0].href}"]`,
            expected: '_blank',
            description: 'External links should open in new tab',
            operator: 'equals'
          }
        ]
      });
    }
    
    return edgeCases;
  }
  
  private generateAccessibilityEdgeCases(pageInfo: any): GuiTestCase[] {
    const edgeCases: GuiTestCase[] = [];
    
    // Keyboard navigation test
    edgeCases.push({
      id: 'gui-edge-keyboard-nav',
      name: 'Keyboard Navigation Test',
      description: 'Test tab navigation through interactive elements',
      category: 'accessibility',
      priority: 'medium',
      estimatedDuration: '45s',
      tags: ['edge-case', 'accessibility', 'keyboard'],
      steps: [
        {
          action: 'goto',
          value: '',
          description: 'Navigate to the page',
          waitFor: 'networkidle'
        },
        {
          action: 'press',
          value: 'Tab',
          description: 'Press Tab to start keyboard navigation',
          options: { timeout: 2000 }
        },
        {
          action: 'press',
          value: 'Tab',
          description: 'Continue tab navigation',
          options: { timeout: 2000 }
        },
        {
          action: 'press',
          value: 'Enter',
          description: 'Activate focused element with Enter',
          options: { timeout: 2000 }
        }
      ],
      assertions: [
        {
          type: 'visible',
          selector: ':focus',
          expected: true,
          description: 'An element should be focused',
          retry: true
        }
      ]
    });
    
    // Screen reader compatibility test
    edgeCases.push({
      id: 'gui-edge-screen-reader',
      name: 'Screen Reader Compatibility',
      description: 'Test ARIA labels and screen reader support',
      category: 'accessibility',
      priority: 'medium',
      estimatedDuration: '30s',
      tags: ['edge-case', 'accessibility', 'aria'],
      steps: [
        {
          action: 'goto',
          value: '',
          description: 'Navigate to the page',
          waitFor: 'networkidle'
        }
      ],
      assertions: [
        {
          type: 'attribute',
          selector: 'input, button, a',
          expected: 'true',
          description: 'Interactive elements should have aria-labels or titles',
          operator: 'exists'
        },
        {
          type: 'attribute',
          selector: 'img',
          expected: 'alt',
          description: 'Images should have alt text',
          operator: 'exists'
        }
      ]
    });
    
    return edgeCases;
  }
  
  private generateSecurityEdgeCases(pageInfo: any): GuiTestCase[] {
    const edgeCases: GuiTestCase[] = [];
    
    // XSS prevention test
    if (pageInfo.inputs && pageInfo.inputs.length > 0) {
      const textInput = pageInfo.inputs.find((input: any) => input.type === 'text');
      if (textInput) {
        const selector = textInput.id ? `#${textInput.id}` : `input[name="${textInput.name}"]`;
        
        edgeCases.push({
          id: 'gui-edge-xss-prevention',
          name: 'XSS Prevention Test',
          description: 'Test XSS attack prevention in form inputs',
          category: 'security',
          priority: 'high',
          estimatedDuration: '30s',
          tags: ['edge-case', 'security', 'xss'],
          steps: [
            {
              action: 'goto',
              value: '',
              description: 'Navigate to the page',
              waitFor: 'networkidle'
            },
            {
              action: 'fill',
              selector,
              value: '<img src="x" onerror="alert(\'XSS\')">',
              description: 'Fill field with XSS payload',
              options: { timeout: 5000 }
            },
            {
              action: 'click',
              selector: 'input[type="submit"], button[type="submit"]',
              description: 'Submit form with XSS payload',
              options: { timeout: 5000 }
            }
          ],
          assertions: [
            {
              type: 'text',
              selector: 'body',
              expected: 'alert',
              description: 'XSS payload should not execute',
              operator: 'contains'
            }
          ]
        });
      }
    }
    
    // CSRF token test
    if (pageInfo.forms && pageInfo.forms.length > 0) {
      edgeCases.push({
        id: 'gui-edge-csrf-protection',
        name: 'CSRF Protection Test',
        description: 'Test CSRF token presence in forms',
        category: 'security',
        priority: 'medium',
        estimatedDuration: '20s',
        tags: ['edge-case', 'security', 'csrf'],
        steps: [
          {
            action: 'goto',
            value: '',
            description: 'Navigate to the page',
            waitFor: 'networkidle'
          }
        ],
        assertions: [
          {
            type: 'visible',
            selector: 'input[name*="csrf"], input[name*="token"], input[type="hidden"]',
            expected: true,
            description: 'Forms should include CSRF tokens',
            retry: true
          }
        ]
      });
    }
    
    return edgeCases;
  }
  
  private generatePerformanceEdgeCases(pageInfo: any): GuiTestCase[] {
    const edgeCases: GuiTestCase[] = [];
    
    // Large data loading test
    edgeCases.push({
      id: 'gui-edge-large-data',
      name: 'Large Data Loading Performance',
      description: 'Test page performance with large datasets',
      category: 'performance',
      priority: 'low',
      estimatedDuration: '60s',
      tags: ['edge-case', 'performance', 'load'],
      steps: [
        {
          action: 'goto',
          value: '?limit=1000', // Append query param for large data
          description: 'Navigate to page with large dataset parameter',
          waitFor: 'networkidle',
          options: { timeout: 30000 }
        },
        {
          action: 'wait',
          options: { timeout: 5000 },
          description: 'Wait for large dataset to load'
        }
      ],
      assertions: [
        {
          type: 'visible',
          selector: 'body',
          expected: true,
          description: 'Page should load even with large datasets',
          timeout: 30000
        }
      ]
    });
    
    return edgeCases;
  }
  
  // API Edge Case Generation Methods
  private generateApiBoundaryTests(discoveredAPIs: any[]): ApiTestCase[] {
    const edgeCases: ApiTestCase[] = [];
    
    discoveredAPIs.forEach((api, index) => {
      // Test with extremely long URL
      if (api.method === 'GET') {
        edgeCases.push({
          id: `api-edge-long-url-${index}`,
          name: `Long URL Test - ${api.method} ${api.url}`,
          description: 'Test API handling of extremely long URLs',
          category: 'error',
          priority: 'medium',
          estimatedDuration: '1s',
          tags: ['edge-case', 'boundary', 'error'],
          method: api.method,
          endpoint: api.url,
          queryParams: {
            'very_long_parameter_name_that_exceeds_normal_limits': 'A'.repeat(2000)
          },
          expectedStatus: 414, // URI Too Long
          assertions: [
            {
              type: 'status',
              expected: 414,
              description: 'Should return 414 for overly long URLs',
              operator: 'equals'
            }
          ]
        });
      }
      
      // Test with malformed JSON (for POST requests)
      if (['POST', 'PUT', 'PATCH'].includes(api.method)) {
        edgeCases.push({
          id: `api-edge-malformed-json-${index}`,
          name: `Malformed JSON Test - ${api.method} ${api.url}`,
          description: 'Test API handling of malformed JSON',
          category: 'error',
          priority: 'high',
          estimatedDuration: '500ms',
          tags: ['edge-case', 'validation', 'error'],
          method: api.method,
          endpoint: api.url,
          headers: {
            'Content-Type': 'application/json'
          },
          body: '{"invalid": json, "missing": quote}', // Malformed JSON
          expectedStatus: 400,
          assertions: [
            {
              type: 'status',
              expected: 400,
              description: 'Should return 400 for malformed JSON',
              operator: 'equals'
            },
            {
              type: 'body',
              path: 'error.message',
              expected: 'json',
              description: 'Error message should mention JSON parsing issue',
              operator: 'contains'
            }
          ]
        });
      }
    });
    
    return edgeCases;
  }
  
  private generateApiSecurityTests(discoveredAPIs: any[]): ApiTestCase[] {
    const edgeCases: ApiTestCase[] = [];
    
    discoveredAPIs.forEach((api, index) => {
      // SQL Injection test
      if (['GET', 'POST'].includes(api.method)) {
        const sqlPayload = "'; DROP TABLE users; --";
        
        edgeCases.push({
          id: `api-edge-sql-injection-${index}`,
          name: `SQL Injection Test - ${api.method} ${api.url}`,
          description: 'Test SQL injection prevention',
          category: 'security',
          priority: 'critical',
          estimatedDuration: '1s',
          tags: ['edge-case', 'security', 'sql-injection'],
          method: api.method,
          endpoint: api.url,
          ...(api.method === 'GET' ? {
            queryParams: { search: sqlPayload }
          } : {
            body: { query: sqlPayload },
            headers: { 'Content-Type': 'application/json' }
          }),
          expectedStatus: api.method === 'GET' ? 200 : 400,
          assertions: [
            {
              type: 'security',
              expected: 'no_sql_execution',
              description: 'Should prevent SQL injection attacks',
              operator: 'exists'
            },
            {
              type: 'body',
              path: 'error',
              expected: 'users',
              description: 'Should not expose database structure',
              operator: 'contains'
            }
          ]
        });
      }
      
      // Authentication bypass test
      if (api.headers && api.headers.Authorization) {
        edgeCases.push({
          id: `api-edge-auth-bypass-${index}`,
          name: `Authentication Bypass Test - ${api.method} ${api.url}`,
          description: 'Test authentication bypass prevention',
          category: 'security',
          priority: 'critical',
          estimatedDuration: '500ms',
          tags: ['edge-case', 'security', 'authentication'],
          method: api.method,
          endpoint: api.url,
          headers: {
            'Authorization': 'Bearer invalid_token_12345'
          },
          body: api.body,
          expectedStatus: 401,
          assertions: [
            {
              type: 'status',
              expected: 401,
              description: 'Should reject invalid authentication tokens',
              operator: 'equals'
            }
          ]
        });
      }
    });
    
    return edgeCases;
  }
  
  private generateApiValidationTests(discoveredAPIs: any[]): ApiTestCase[] {
    const edgeCases: ApiTestCase[] = [];
    
    discoveredAPIs.forEach((api, index) => {
      if (['POST', 'PUT', 'PATCH'].includes(api.method)) {
        // Empty body test
        edgeCases.push({
          id: `api-edge-empty-body-${index}`,
          name: `Empty Body Test - ${api.method} ${api.url}`,
          description: 'Test handling of empty request body',
          category: 'validation',
          priority: 'medium',
          estimatedDuration: '300ms',
          tags: ['edge-case', 'validation', 'error'],
          method: api.method,
          endpoint: api.url,
          headers: {
            'Content-Type': 'application/json'
          },
          body: {},
          expectedStatus: 400,
          assertions: [
            {
              type: 'status',
              expected: 400,
              description: 'Should validate required fields in request body',
              operator: 'equals'
            }
          ]
        });
        
        // Oversized payload test
        const largePayload = {
          data: 'A'.repeat(10000), // Large string
          items: Array(1000).fill({ field: 'value' }) // Large array
        };
        
        edgeCases.push({
          id: `api-edge-large-payload-${index}`,
          name: `Large Payload Test - ${api.method} ${api.url}`,
          description: 'Test handling of oversized request payloads',
          category: 'validation',
          priority: 'medium',
          estimatedDuration: '2s',
          tags: ['edge-case', 'validation', 'performance'],
          method: api.method,
          endpoint: api.url,
          headers: {
            'Content-Type': 'application/json'
          },
          body: largePayload,
          expectedStatus: 413, // Payload Too Large
          assertions: [
            {
              type: 'status',
              expected: 413,
              description: 'Should reject oversized payloads',
              operator: 'equals'
            }
          ]
        });
      }
    });
    
    return edgeCases;
  }
  
  private generateApiPerformanceTests(discoveredAPIs: any[]): ApiTestCase[] {
    const edgeCases: ApiTestCase[] = [];
    
    discoveredAPIs.forEach((api, index) => {
      // Concurrent request test
      edgeCases.push({
        id: `api-edge-concurrent-${index}`,
        name: `Concurrent Requests Test - ${api.method} ${api.url}`,
        description: 'Test handling of concurrent requests',
        category: 'performance',
        priority: 'medium',
        estimatedDuration: '5s',
        tags: ['edge-case', 'performance', 'concurrency'],
        method: api.method,
        endpoint: api.url,
        headers: api.headers,
        body: api.body,
        expectedStatus: api.status,
        assertions: [
          {
            type: 'status',
            expected: api.status,
            description: 'Should handle concurrent requests properly',
            operator: 'equals'
          },
          {
            type: 'performance',
            expected: 5000,
            description: 'Should respond within 5 seconds under load',
            operator: 'less'
          }
        ]
      });
    });
    
    return edgeCases;
  }
  
  // Utility Methods
  private generatePartialFormFillSteps(allInputs: any[], excludeInputs: any[]): PlaywrightStep[] {
    const steps: PlaywrightStep[] = [];
    
    allInputs.forEach(input => {
      if (!excludeInputs.includes(input)) {
        const selector = input.id ? `#${input.id}` : `input[name="${input.name}"]`;
        let value = 'test_value';
        
        // Generate appropriate test value based on input type
        switch (input.type) {
          case 'email':
            value = 'test@example.com';
            break;
          case 'password':
            value = 'TestPassword123';
            break;
          case 'number':
            value = '123';
            break;
          case 'tel':
            value = '+1234567890';
            break;
        }
        
        steps.push({
          action: 'fill',
          selector,
          value,
          description: `Fill ${input.name || input.id} field`,
          options: { timeout: 5000 }
        });
      }
    });
    
    return steps;
  }
}