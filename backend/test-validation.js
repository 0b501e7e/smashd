const axios = require('axios');
const fs = require('fs');

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

// Test functions
async function testPublicEndpoint() {
  const response = await makeRequest('GET', '/test/public');
  logTest('Public Endpoint Access', 
    response.status === 200 && response.data.success === true,
    response.status !== 200 ? `Status: ${response.status}` : 'OK'
  );
}

async function testValidUserRegistration() {
  const validData = {
    email: 'test@example.com',
    password: 'SecurePass123',
    name: 'John Doe',
    dateOfBirth: '1990-01-01',
    address: '123 Main Street, City, State',
    phoneNumber: '+34612345678',
    acceptedTerms: true
  };
  
  const response = await makeRequest('POST', '/test/validate/user/register', validData);
  logTest('Valid User Registration', 
    response.status === 200 && response.data.success === true,
    response.status !== 200 ? `Status: ${response.status}, Error: ${JSON.stringify(response.data)}` : 'OK'
  );
}

async function testInvalidUserRegistration() {
  const invalidData = {
    email: 'invalid-email',
    password: '123', // too short
    name: 'A', // too short
    dateOfBirth: 'invalid-date',
    address: 'XY', // too short
    phoneNumber: 'invalid-phone',
    acceptedTerms: false
  };
  
  const response = await makeRequest('POST', '/test/validate/user/register', invalidData);
  logTest('Invalid User Registration (Should Fail)', 
    response.status === 400 && response.data.success === false,
    response.status === 400 ? 'Correctly rejected invalid data' : `Unexpected status: ${response.status}`
  );
}

async function testValidUserLogin() {
  const validData = {
    email: 'test@example.com',
    password: 'password123'
  };
  
  const response = await makeRequest('POST', '/test/validate/user/login', validData);
  logTest('Valid User Login', 
    response.status === 200 && response.data.success === true,
    response.status !== 200 ? `Status: ${response.status}` : 'OK'
  );
}

async function testInvalidUserLogin() {
  const invalidData = {
    email: 'invalid-email',
    password: '' // empty password
  };
  
  const response = await makeRequest('POST', '/test/validate/user/login', invalidData);
  logTest('Invalid User Login (Should Fail)', 
    response.status === 400 && response.data.success === false,
    response.status === 400 ? 'Correctly rejected invalid data' : `Unexpected status: ${response.status}`
  );
}

async function testValidMenuItemCreation() {
  const validData = {
    name: 'Delicious Burger',
    description: 'A mouth-watering burger with fresh ingredients',
    price: 12.99,
    category: 'BURGER',
    imageUrl: 'https://example.com/burger.jpg'
  };
  
  const response = await makeRequest('POST', '/test/validate/menu-item/create', validData);
  logTest('Valid Menu Item Creation', 
    response.status === 200 && response.data.success === true,
    response.status !== 200 ? `Status: ${response.status}` : 'OK'
  );
}

async function testInvalidMenuItemCreation() {
  const invalidData = {
    name: '', // empty name
    description: '', // empty description
    price: -5, // negative price
    category: 'INVALID_CATEGORY',
    imageUrl: 'not-a-url'
  };
  
  const response = await makeRequest('POST', '/test/validate/menu-item/create', invalidData);
  logTest('Invalid Menu Item Creation (Should Fail)', 
    response.status === 400 && response.data.success === false,
    response.status === 400 ? 'Correctly rejected invalid data' : `Unexpected status: ${response.status}`
  );
}

async function testValidOrderCreation() {
  const validData = {
    items: [
      {
        menuItemId: 1,
        quantity: 2,
        price: 12.99
      },
      {
        menuItemId: 2,
        quantity: 1,
        price: 8.50
      }
    ],
    total: 34.48
  };
  
  const response = await makeRequest('POST', '/test/validate/order/create', validData);
  logTest('Valid Order Creation', 
    response.status === 200 && response.data.success === true,
    response.status !== 200 ? `Status: ${response.status}` : 'OK'
  );
}

async function testInvalidOrderCreation() {
  const invalidData = {
    items: 'not-an-array',
    total: -10
  };
  
  const response = await makeRequest('POST', '/test/validate/order/create', invalidData);
  logTest('Invalid Order Creation (Should Fail)', 
    response.status === 400 && response.data.success === false,
    response.status === 400 ? 'Correctly rejected invalid data' : `Unexpected status: ${response.status}`
  );
}

async function testParameterValidation() {
  // Test valid parameter
  const validResponse = await makeRequest('GET', '/test/validate/param/123');
  logTest('Valid Parameter Validation', 
    validResponse.status === 200 && validResponse.data.success === true,
    validResponse.status !== 200 ? `Status: ${validResponse.status}` : 'OK'
  );
  
  // Test invalid parameter
  const invalidResponse = await makeRequest('GET', '/test/validate/param/invalid');
  logTest('Invalid Parameter Validation (Should Fail)', 
    invalidResponse.status === 400 && invalidResponse.data.success === false,
    invalidResponse.status === 400 ? 'Correctly rejected invalid parameter' : `Unexpected status: ${invalidResponse.status}`
  );
}

async function testQueryValidation() {
  // Test valid query
  const validResponse = await makeRequest('GET', '/test/validate/query?email=test@example.com');
  logTest('Valid Query Validation', 
    validResponse.status === 200 && validResponse.data.success === true,
    validResponse.status !== 200 ? `Status: ${validResponse.status}` : 'OK'
  );
  
  // Test invalid query
  const invalidResponse = await makeRequest('GET', '/test/validate/query?email=invalid-email');
  logTest('Invalid Query Validation (Should Fail)', 
    invalidResponse.status === 400 && invalidResponse.data.success === false,
    invalidResponse.status === 400 ? 'Correctly rejected invalid query' : `Unexpected status: ${invalidResponse.status}`
  );
}

async function testPaginationValidation() {
  // Test valid pagination
  const validResponse = await makeRequest('GET', '/test/validate/pagination?page=1&limit=10');
  logTest('Valid Pagination Validation', 
    validResponse.status === 200 && validResponse.data.success === true,
    validResponse.status !== 200 ? `Status: ${validResponse.status}` : 'OK'
  );
  
  // Test invalid pagination
  const invalidResponse = await makeRequest('GET', '/test/validate/pagination?page=0&limit=200');
  logTest('Invalid Pagination Validation (Should Fail)', 
    invalidResponse.status === 400 && invalidResponse.data.success === false,
    invalidResponse.status === 400 ? 'Correctly rejected invalid pagination' : `Unexpected status: ${invalidResponse.status}`
  );
}

async function testCustomizationCategoryCreation() {
  const validData = {
    name: 'Extra Toppings',
    options: [
      { name: 'Extra Cheese', price: 1.50 },
      { name: 'Bacon', price: 2.00 }
    ]
  };
  
  const response = await makeRequest('POST', '/test/validate/customization/create', validData);
  logTest('Valid Customization Category Creation', 
    response.status === 200 && response.data.success === true,
    response.status !== 200 ? `Status: ${response.status}` : 'OK'
  );
}

async function testManualValidation() {
  const validData = {
    email: 'test@example.com',
    password: 'SecurePass123',
    name: 'John Doe',
    dateOfBirth: '1990-01-01',
    address: '123 Main Street, City, State',
    phoneNumber: '+34612345678',
    acceptedTerms: true
  };
  
  const response = await makeRequest('POST', '/test/validate/manual/user-registration', validData);
  logTest('Manual Validation Test', 
    response.status === 200 && response.data.success === true,
    response.status !== 200 ? `Status: ${response.status}` : 'OK'
  );
}

async function testEndpointStatus() {
  const response = await makeRequest('GET', '/test/status');
  logTest('Test Endpoint Status', 
    response.status === 200 && response.data.success === true,
    response.status !== 200 ? `Status: ${response.status}` : 'OK'
  );
}

// Main test runner
async function runAllTests() {
  console.log('🚀 Starting Validation Middleware Tests...\n');
  
  // Wait for server to be ready
  let serverReady = false;
  let attempts = 0;
  while (!serverReady && attempts < 10) {
    try {
      const response = await makeRequest('GET', '/test/status');
      if (response.status === 200) {
        serverReady = true;
        console.log('✅ Server is ready for testing\n');
      }
    } catch (error) {
      console.log(`⏳ Waiting for server to start... (attempt ${attempts + 1})`);
      await new Promise(resolve => setTimeout(resolve, 2000));
      attempts++;
    }
  }
  
  if (!serverReady) {
    console.log('❌ Server is not responding. Please make sure the server is running on port 3000');
    return;
  }
  
  // Run all validation tests
  await testPublicEndpoint();
  await testEndpointStatus();
  
  console.log('\n📝 User Registration Validation Tests:');
  await testValidUserRegistration();
  await testInvalidUserRegistration();
  
  console.log('\n🔐 User Login Validation Tests:');
  await testValidUserLogin();
  await testInvalidUserLogin();
  
  console.log('\n🍔 Menu Item Validation Tests:');
  await testValidMenuItemCreation();
  await testInvalidMenuItemCreation();
  
  console.log('\n📦 Order Validation Tests:');
  await testValidOrderCreation();
  await testInvalidOrderCreation();
  
  console.log('\n🔧 Parameter & Query Validation Tests:');
  await testParameterValidation();
  await testQueryValidation();
  await testPaginationValidation();
  
  console.log('\n⚙️ Customization & Manual Validation Tests:');
  await testCustomizationCategoryCreation();
  await testManualValidation();
  
  // Print summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 TEST RESULTS SUMMARY');
  console.log('='.repeat(50));
  console.log(`✅ Tests Passed: ${testResults.passed}`);
  console.log(`❌ Tests Failed: ${testResults.failed}`);
  console.log(`📋 Total Tests: ${testResults.tests.length}`);
  console.log(`🎯 Success Rate: ${((testResults.passed / testResults.tests.length) * 100).toFixed(1)}%`);
  
  // Save detailed results to file
  const reportPath = './validation-test-results.json';
  fs.writeFileSync(reportPath, JSON.stringify(testResults, null, 2));
  console.log(`📄 Detailed results saved to: ${reportPath}`);
  
  if (testResults.failed > 0) {
    console.log('\n❌ Some tests failed. Please review the results above.');
    process.exit(1);
  } else {
    console.log('\n🎉 All tests passed! Validation middleware is working correctly.');
  }
}

// Run tests
runAllTests().catch(error => {
  console.error('❌ Test runner error:', error);
  process.exit(1);
}); 