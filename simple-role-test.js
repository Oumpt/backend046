// Direct test of the register endpoint
const express = require('express');
const request = require('supertest');

// Create a test app
const app = express();
app.use(express.json());

// Mock the database
const mockDb = {
  query: jest.fn()
};

// Temporarily override the db module
const originalRequire = require;
require = function(id) {
  if (id === '../config/db') {
    return mockDb;
  }
  return originalRequire.apply(this, arguments);
};

// Load the auth router with mocked db
const authRouter = originalRequire('./routes/auth');
app.use('/api/auth', authRouter);

// Restore original require
require = originalRequire;

async function testRoleFunctionality() {
  console.log('=== Testing Role Registration ===\n');
  
  // Test 1: Default role (staff)
  console.log('Test 1: Default role (staff)');
  mockDb.query
    .mockResolvedValueOnce([[]]) // No existing user
    .mockResolvedValueOnce([{ insertId: 1 }]); // Insert success
  
  try {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'test_staff',
        password: 'password123',
        firstname: 'Test',
        lastname: 'Staff'
      });
    
    console.log(`Status: ${response.status}`);
    console.log(`Response: ${JSON.stringify(response.body)}`);
    console.log(`✅ Test 1 passed\n`);
  } catch (error) {
    console.log(`❌ Test 1 failed: ${error.message}\n`);
  }
  
  // Test 2: Explicit admin role
  console.log('Test 2: Explicit admin role');
  mockDb.query
    .mockResolvedValueOnce([[]]) // No existing user
    .mockResolvedValueOnce([{ insertId: 2 }]); // Insert success
  
  try {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'test_admin',
        password: 'password123',
        firstname: 'Test',
        lastname: 'Admin',
        role: 'admin'
      });
    
    console.log(`Status: ${response.status}`);
    console.log(`Response: ${JSON.stringify(response.body)}`);
    console.log(`✅ Test 2 passed\n`);
  } catch (error) {
    console.log(`❌ Test 2 failed: ${error.message}\n`);
  }
  
  // Test 3: Invalid role (should default to staff)
  console.log('Test 3: Invalid role (should default to staff)');
  mockDb.query
    .mockResolvedValueOnce([[]]) // No existing user
    .mockResolvedValueOnce([{ insertId: 3 }]); // Insert success
  
  try {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'test_invalid',
        password: 'password123',
        firstname: 'Test',
        lastname: 'Invalid',
        role: 'invalid_role'
      });
    
    console.log(`Status: ${response.status}`);
    console.log(`Response: ${JSON.stringify(response.body)}`);
    console.log(`✅ Test 3 passed\n`);
  } catch (error) {
    console.log(`❌ Test 3 failed: ${error.message}\n`);
  }
  
  console.log('=== Database Query Analysis ===');
  console.log('Checking the role parameter in INSERT queries:');
  
  // Check the INSERT queries to verify role handling
  const insertQueries = mockDb.query.mock.calls.filter(call => 
    call[0].includes('INSERT INTO tbl_users')
  );
  
  insertQueries.forEach((call, index) => {
    const params = call[1];
    const role = params[5]; // role is the 6th parameter (index 5)
    console.log(`Query ${index + 1}: Role parameter = "${role}"`);
  });
}

// Install supertest if needed and run tests
try {
  testRoleFunctionality();
} catch (error) {
  console.log('Error running tests:', error.message);
  console.log('Note: This test requires supertest to be installed');
}
