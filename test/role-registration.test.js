const request = require('supertest');
const express = require('express');

// Mock database for testing
const mockDb = {
  query: jest.fn()
};

// Mock the db module
jest.mock('../config/db', () => mockDb);

// Mock bcrypt
jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed_password_123')
}));

const app = express();
app.use(express.json());
const authRouter = require('../routes/auth');
app.use('/api/auth', authRouter);

describe('Auth Registration with Role', () => {
  beforeEach(() => {
    mockDb.query.mockClear();
  });

  test('should register user with staff role by default', async () => {
    // Mock database responses
    mockDb.query
      .mockResolvedValueOnce([[]]) // No existing user
      .mockResolvedValueOnce([{ insertId: 1 }]); // Insert success

    const response = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'testuser',
        password: 'password123',
        firstname: 'Test',
        lastname: 'User'
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toContain('staff');
    
    // Verify the role was set to 'staff' in the database query
    const insertCall = mockDb.query.mock.calls[1];
    expect(insertCall[1][5]).toBe('staff'); // role parameter
  });

  test('should register user with admin role when specified', async () => {
    // Mock database responses
    mockDb.query
      .mockResolvedValueOnce([[]]) // No existing user
      .mockResolvedValueOnce([{ insertId: 1 }]); // Insert success

    const response = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'adminuser',
        password: 'password123',
        firstname: 'Admin',
        lastname: 'User',
        role: 'admin'
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toContain('admin');
    
    // Verify the role was set to 'admin' in the database query
    const insertCall = mockDb.query.mock.calls[1];
    expect(insertCall[1][5]).toBe('admin'); // role parameter
  });

  test('should default to staff role when invalid role is provided', async () => {
    // Mock database responses
    mockDb.query
      .mockResolvedValueOnce([[]]) // No existing user
      .mockResolvedValueOnce([{ insertId: 1 }]); // Insert success

    const response = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'invaliduser',
        password: 'password123',
        firstname: 'Invalid',
        lastname: 'User',
        role: 'invalid_role'
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toContain('staff');
    
    // Verify the role was set to 'staff' in the database query
    const insertCall = mockDb.query.mock.calls[1];
    expect(insertCall[1][5]).toBe('staff'); // role parameter
  });
});
