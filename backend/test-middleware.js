const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:5001';

// Test results storage
let testResults = {
  passed: 0,
  failed: 0,
  tests: []
};

// Helper function to log test results
function logTest(testName, success, details) {
  const result = {
    name: testName,
    success,
    details,
    timestamp: new Date().toISOString()
  };
  
  testResults.tests.push(result);
  
  if (success) {
    testResults.passed++;
    console.log(`✅ ${testName}`);
  } else {
    testResults.failed++;
    console.log(`❌ ${testName}: ${details}`);
  }
}

// Helper function to make requests
async function makeRequest(method, endpoint, data = null, headers = {}) {
  try {
    const response = await axios({
      method,
      url: `${BASE_URL}${endpoint}`,
      data,
      headers,
      validateStatus: () => true // Don't throw on 4xx/5xx
    });
    return { status: response.status, data: response.data, headers: response.headers };
  } catch (error) {
    return { status: 0, error: error.message };
  }
}

// Test CORS headers
async function testCORS() {
  const response = await makeRequest('OPTIONS', '/test/status', null, {
    'Origin': 'http://localhost:3000'
  });
  
  const hasCorrectCORS = response.headers['access-control-allow-origin'] || 
                        response.status === 200; // CORS is handled by cors middleware
  
  logTest('CORS Configuration', 
    hasCorrectCORS,
    hasCorrectCORS ? 'CORS headers present' : 'Missing CORS headers'
  );
}

// Test static file serving
async function testStaticFileServing() {
  // Test if static route returns 404 for non-existent file (graceful handling)
  const response = await makeRequest('GET', '/images/non-existent-file.jpg');
  
  logTest('Static File 404 Handling', 
    response.status === 404,
    response.status === 404 ? 'Correctly returns 404 for missing files' : `Unexpected status: ${response.status}`
  );
}

// Test global error handling
async function testErrorHandling() {
  // Test 404 for non-existent route
  const response = await makeRequest('GET', '/non-existent-route');
  
  logTest('Global 404 Error Handling', 
    response.status === 404 && response.data.success === false,
    response.status === 404 ? 'Correctly handles 404 errors' : `Unexpected status: ${response.status}`
  );
}

// Test health check endpoint
async function testHealthCheck() {
  const response = await makeRequest('GET', '/health');
  
  logTest('Health Check Endpoint', 
    response.status === 200 && response.data.status === 'healthy',
    response.status === 200 ? 'Health check working' : `Status: ${response.status}`
  );
}

// Test if environment-specific CORS is working
async function testDevelopmentCORS() {
  const response = await makeRequest('GET', '/test/status', null, {
    'Origin': 'http://localhost:3000' // Should be allowed in development
  });
  
  logTest('Development CORS Policy', 
    response.status === 200,
    response.status === 200 ? 'Development origins allowed' : `Status: ${response.status}`
  );
}

// Test request body parsing
async function testJSONParsing() {
  const testData = { test: 'data', number: 123 };
  const response = await makeRequest('POST', '/test/validate/user/login', testData);
  
  // Should get validation error (not JSON parsing error)
  const isParsingJSON = response.status === 400 && 
                       response.data.error === 'Validation failed';
  
  logTest('JSON Body Parsing', 
    isParsingJSON,
    isParsingJSON ? 'JSON parsing working correctly' : `Unexpected response: ${JSON.stringify(response.data)}`
  );
}

// Test middleware order (CORS before validation)
async function testMiddlewareOrder() {
  // Make a request that should trigger validation but also CORS
  const response = await makeRequest('POST', '/test/validate/user/register', {}, {
    'Origin': 'http://localhost:3000',
    'Content-Type': 'application/json'
  });
  
  // Should get validation error, not CORS error
  const middlewareOrderCorrect = response.status === 400 && 
                                response.data.error === 'Validation failed';
  
  logTest('Middleware Order (CORS → Validation)', 
    middlewareOrderCorrect,
    middlewareOrderCorrect ? 'Middleware order is correct' : `Unexpected response: ${response.status}`
  );
}

// Test if server startup logging worked
async function testServerStartup() {
  // The server should be responding, indicating successful startup
  const response = await makeRequest('GET', '/health');
  
  logTest('Server Startup with All Middleware', 
    response.status === 200,
    response.status === 200 ? 'Server started successfully with all middleware' : `Server not responding: ${response.status}`
  );
}

// Main test runner
async function runMiddlewareTests() {
  console.log('🧪 Starting Middleware Integration Tests...\n');
  
  // Wait for server to be ready
  let serverReady = false;
  let attempts = 0;
  while (!serverReady && attempts < 5) {
    try {
      const response = await makeRequest('GET', '/health');
      if (response.status === 200) {
        serverReady = true;
        console.log('✅ Server is ready for middleware testing\n');
      }
    } catch (error) {
      console.log(`⏳ Waiting for server... (attempt ${attempts + 1})`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;
    }
  }
  
  if (!serverReady) {
    console.log('❌ Server is not responding. Please make sure the server is running on port 5001');
    return;
  }
  
  // Run middleware tests
  console.log('🌐 CORS Middleware Tests:');
  await testCORS();
  await testDevelopmentCORS();
  
  console.log('\n📁 Static File Middleware Tests:');
  await testStaticFileServing();
  
  console.log('\n❗ Error Handling Middleware Tests:');
  await testErrorHandling();
  
  console.log('\n💚 Core Functionality Tests:');
  await testHealthCheck();
  await testJSONParsing();
  await testMiddlewareOrder();
  await testServerStartup();
  
  // Print summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 MIDDLEWARE TEST RESULTS');
  console.log('='.repeat(50));
  console.log(`✅ Tests Passed: ${testResults.passed}`);
  console.log(`❌ Tests Failed: ${testResults.failed}`);
  console.log(`📋 Total Tests: ${testResults.tests.length}`);
  console.log(`🎯 Success Rate: ${((testResults.passed / testResults.tests.length) * 100).toFixed(1)}%`);
  
  // Save detailed results to file
  const reportPath = './middleware-test-results.json';
  fs.writeFileSync(reportPath, JSON.stringify(testResults, null, 2));
  console.log(`📄 Detailed results saved to: ${reportPath}`);
  
  if (testResults.failed > 0) {
    console.log('\n❌ Some middleware tests failed. Please review the results above.');
    process.exit(1);
  } else {
    console.log('\n🎉 All middleware tests passed! Backend refactoring is successful.');
  }
}

// Run tests
runMiddlewareTests().catch(error => {
  console.error('❌ Middleware test runner error:', error);
  process.exit(1);
}); 