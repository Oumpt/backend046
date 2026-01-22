// Simple verification script for role registration functionality
const express = require('express');
const authRouter = require('./routes/auth');

const app = express();
app.use(express.json());
app.use('/api/auth', authRouter);

// Mock database for testing
const mockUsers = [];

// Override the db config for testing
const originalDb = require('./config/db');
require('./config/db').query = async (sql, params) => {
  console.log('SQL Query:', sql);
  console.log('Parameters:', params);
  
  if (sql.includes('SELECT id FROM tbl_users WHERE username = ?')) {
    const existingUser = mockUsers.find(u => u.username === params[0]);
    return [existingUser ? [{ id: existingUser.id }] : []];
  }
  
  if (sql.includes('INSERT INTO tbl_users')) {
    const newUser = {
      id: mockUsers.length + 1,
      username: params[0],
      firstname: params[2],
      lastname: params[3],
      fullname: params[4],
      role: params[5],
      status: params[6]
    };
    mockUsers.push(newUser);
    return [{ insertId: newUser.id }];
  }
  
  return [];
};

// Test cases
async function runTests() {
  console.log('=== Testing Role Registration Functionality ===\n');
  
  const testCases = [
    {
      name: 'Default role (staff)',
      data: {
        username: 'test_staff',
        password: 'password123',
        firstname: 'Test',
        lastname: 'Staff'
      },
      expectedRole: 'staff'
    },
    {
      name: 'Explicit admin role',
      data: {
        username: 'test_admin',
        password: 'password123',
        firstname: 'Test',
        lastname: 'Admin',
        role: 'admin'
      },
      expectedRole: 'admin'
    },
    {
      name: 'Invalid role (should default to staff)',
      data: {
        username: 'test_invalid',
        password: 'password123',
        firstname: 'Test',
        lastname: 'Invalid',
        role: 'invalid_role'
      },
      expectedRole: 'staff'
    }
  ];
  
  for (const testCase of testCases) {
    console.log(`Testing: ${testCase.name}`);
    
    try {
      const response = await new Promise((resolve, reject) => {
        const req = {
          body: testCase.data
        };
        
        const res = {
          status: (code) => ({
            json: (data) => resolve({ status: code, data })
          }),
          json: (data) => resolve({ status: 200, data })
        };
        
        // Simulate the register route
        authRouter.stack.find(layer => 
          layer.route && layer.route.path === '/register' && 
          layer.route.methods.post
        ).handle(req, res);
      });
      
      if (response.status === 201 && response.data.success) {
        const createdUser = mockUsers[mockUsers.length - 1];
        const roleMatch = createdUser.role === testCase.expectedRole;
        
        console.log(`✅ Success: User created with role "${createdUser.role}"`);
        console.log(`   Expected: "${testCase.expectedRole}" - ${roleMatch ? 'MATCH' : 'MISMATCH'}`);
        console.log(`   Message: ${response.data.message}\n`);
      } else {
        console.log(`❌ Failed: ${JSON.stringify(response.data)}\n`);
      }
    } catch (error) {
      console.log(`❌ Error: ${error.message}\n`);
    }
  }
  
  console.log('=== Test Summary ===');
  console.log(`Total users created: ${mockUsers.length}`);
  mockUsers.forEach(user => {
    console.log(`- ${user.username} (${user.role})`);
  });
}

// Run the tests
runTests().catch(console.error);
