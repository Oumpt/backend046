const express = require('express');
const router = express.Router();
const db = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// ฟังก์ชันสำหรับ Hash Token (ใช้ตอน Logout)
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * @openapi
 * /api/auth/register:
 * post:
 * tags: [Authentication]
 * summary: Register a new user (Default role: staff)
 * requestBody:
 * required: true
 * content:
 * application/json:
 * schema:
 * type: object
 * required: [username, password, firstname, lastname]
 * properties:
 * username:
 * type: string
 * password:
 * type: string
 * firstname:
 * type: string
 * lastname:
 * type: string
 * fullname:
 * type: string
 * responses:
 * 201:
 * description: User registered successfully
 * 400:
 * description: Invalid input or user exists
 */
router.post('/register', async (req, res) => {
  const { username, password, firstname, lastname, fullname } = req.body;

  try {
    if (!username || !password) {
      return res.status(400).json({ success: false, error: 'Username and password are required' });
    }

    const [existingUser] = await db.query('SELECT id FROM tbl_users WHERE username = ?', [username]);
    if (existingUser.length > 0) {
      return res.status(400).json({ success: false, error: 'Username already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await db.query(
      'INSERT INTO tbl_users (username, password, firstname, lastname, fullname, role, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [username, hashedPassword, firstname, lastname, fullname || `${firstname} ${lastname}`, 'staff', 'active']
    );

    res.status(201).json({ 
      success: true, 
      message: 'User registered successfully as staff',
      userId: result.insertId 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Registration failed' });
  }
});

/**
 * @openapi
 * /api/auth/login:
 * post:
 * tags: [Authentication]
 * summary: Login to get JWT Token
 * requestBody:
 * required: true
 * content:
 * application/json:
 * schema:
 * type: object
 * required: [username, password]
 * properties:
 * username:
 * type: string
 * password:
 * type: string
 * responses:
 * 200:
 * description: Login successful
 * 401:
 * description: Unauthorized
 */
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    if (!username || !password) {
      return res.status(400).json({ success: false, error: 'Username and password are required' });
    }

    const [rows] = await db.query('SELECT * FROM tbl_users WHERE username = ?', [username]);
    
    if (rows.length === 0) {
      return res.status(401).json({ success: false, error: 'Invalid username or password' });
    }

    const user = rows[0];

    if (user.status !== 'active') {
      return res.status(403).json({ success: false, error: 'Your account is disabled' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Invalid username or password' });
    }

    const token = jwt.sign(
      { 
        id: user.id, 
        username: user.username,
        role: user.role 
      },
      process.env.JWT_SECRET || 'fallback-secret-key',
      { expiresIn: '1h' }
    );

    res.json({ 
      success: true,
      message: 'Login successful', 
      token,
      user: {
        id: user.id,
        firstname: user.firstname,
        fullname: user.fullname,
        lastname: user.lastname,
        username: user.username,
        status: user.status,
        role: user.role 
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Login failed' });
  }
});

/**
 * @openapi
 * /api/auth/logout:
 * post:
 * tags: [Authentication]
 * summary: Logout and revoke token
 * security:
 * - bearerAuth: []
 * responses:
 * 200:
 * description: Logged out successfully
 * 400:
 * description: Invalid token
 */
router.post('/logout', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(400).json({ success: false, error: 'No token provided' });
    }

    const token = authHeader.substring(7);
    let decoded;
    try {
      decoded = jwt.decode(token);
    } catch (err) {
      return res.status(400).json({ success: false, error: 'Invalid token' });
    }

    if (!decoded || !decoded.exp) {
      return res.status(400).json({ success: false, error: 'Invalid token' });
    }

    const expiresAt = new Date(decoded.exp * 1000);
    const tokenHash = hashToken(token);
    
    await db.query(
      'INSERT INTO revoked_tokens (token_hash, user_id, expires_at) VALUES (?, ?, ?)',
      [tokenHash, decoded.id, expiresAt]
    );

    await db.query('DELETE FROM revoked_tokens WHERE expires_at < NOW()');

    res.json({ success: true, message: 'Logged out successfully' });
  } catch (err) {
    console.error('Logout error:', err);
    res.status(500).json({ success: false, error: 'Logout failed' });
  }
});

module.exports = router;